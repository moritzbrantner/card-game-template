import { readProblemDetail } from '@/src/http/problem-client';
import { getBlogLocalDb } from '@/src/local-first/blog/db';
import type { BlogPublishJob, BlogDraftStatus } from '@/src/local-first/blog/types';

const BLOG_PUBLISH_LOCK_NAME = 'blog-publish-outbox';
const NON_RETRYABLE_DELAY_MS = 365 * 24 * 60 * 60 * 1000;

export type FlushBlogPublishOutboxResult = {
  blockedReason?: 'offline' | 'unauthenticated' | 'invalid';
  processedCount: number;
  publishedDraftIds: string[];
};

export function calculatePublishRetryDelayMs(retryCount: number) {
  return Math.min(1_000 * 2 ** retryCount, 5 * 60 * 1_000);
}

export function isRetryablePublishStatus(statusCode?: number) {
  return statusCode === undefined || statusCode >= 500 || statusCode === 429;
}

export function resolveDraftStatusAfterPublishFailure(statusCode?: number): BlogDraftStatus {
  return isRetryablePublishStatus(statusCode) ? 'queued_publish' : 'publish_failed';
}

export function getNextPublishAttemptAt(now: Date, retryCount: number, retryable: boolean) {
  return new Date(now.getTime() + (retryable ? calculatePublishRetryDelayMs(retryCount) : NON_RETRYABLE_DELAY_MS));
}

export async function queueBlogDraftForPublish(input: { userId: string; draftId: string }) {
  const db = getBlogLocalDb();

  return db.transaction('rw', db.drafts, db.outbox, async () => {
    const draft = await db.drafts.get(input.draftId);

    if (!draft || draft.userId !== input.userId) {
      throw new Error('Unable to queue a missing draft for publish.');
    }

    if (draft.status === 'published') {
      throw new Error('Published drafts cannot be republished.');
    }

    const now = new Date();
    const publishRequestId = draft.publishRequestId ?? crypto.randomUUID();
    const payload = {
      clientRequestId: publishRequestId,
      title: draft.title,
      contentMarkdown: draft.contentMarkdown,
    };
    const existingJob = await db.outbox.where('draftId').equals(input.draftId).first();

    await db.drafts.update(draft.id, {
      publishRequestId,
      status: 'queued_publish',
      updatedAt: now,
      lastError: null,
    });

    const job: BlogPublishJob = {
      id: existingJob?.id ?? crypto.randomUUID(),
      userId: input.userId,
      draftId: draft.id,
      kind: 'publish_blog_post',
      payload,
      status: 'pending',
      retryCount: 0,
      nextAttemptAt: now,
      createdAt: existingJob?.createdAt ?? now,
      updatedAt: now,
      lastError: null,
      lastStatusCode: null,
    };

    await db.outbox.put(job);
    return job;
  });
}

async function getNextDuePublishJob(userId: string, now: Date) {
  const jobs = await getBlogLocalDb()
    .outbox.where('userId')
    .equals(userId)
    .filter((job) => (job.status === 'pending' || job.status === 'failed') && job.nextAttemptAt.getTime() <= now.getTime())
    .sortBy('nextAttemptAt');

  return jobs[0] ?? null;
}

async function withPublishOutboxLock<T>(callback: () => Promise<T>) {
  if (typeof navigator !== 'undefined' && 'locks' in navigator && navigator.locks?.request) {
    return navigator.locks.request(BLOG_PUBLISH_LOCK_NAME, { ifAvailable: true }, async (lock) => {
      if (!lock) {
        return null;
      }

      return callback();
    });
  }

  return callback();
}

async function updateJobFailure(input: {
  job: BlogPublishJob;
  errorMessage: string;
  statusCode?: number;
}) {
  const db = getBlogLocalDb();
  const now = new Date();
  const retryable = isRetryablePublishStatus(input.statusCode);
  const retryCount = retryable ? input.job.retryCount + 1 : input.job.retryCount;

  await db.transaction('rw', db.drafts, db.outbox, async () => {
    await db.outbox.update(input.job.id, {
      status: 'failed',
      retryCount,
      nextAttemptAt: getNextPublishAttemptAt(now, input.job.retryCount, retryable),
      updatedAt: now,
      lastError: input.errorMessage,
      lastStatusCode: input.statusCode ?? null,
    });

    await db.drafts.update(input.job.draftId, {
      status: resolveDraftStatusAfterPublishFailure(input.statusCode),
      updatedAt: now,
      lastError: input.errorMessage,
    });
  });

  return retryable;
}

async function processBlogPublishJob(job: BlogPublishJob) {
  const db = getBlogLocalDb();
  const startedAt = new Date();

  await db.transaction('rw', db.drafts, db.outbox, async () => {
    await db.outbox.update(job.id, {
      status: 'running',
      updatedAt: startedAt,
    });

    await db.drafts.update(job.draftId, {
      status: 'publishing',
      updatedAt: startedAt,
      lastError: null,
    });
  });

  try {
    const response = await fetch('/api/profile/blog-posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(job.payload),
    });

    if (!response.ok) {
      const problem = await readProblemDetail(response, 'Unable to publish your blog post right now. Please try again.');
      const retryable = await updateJobFailure({
        job,
        errorMessage: problem.message,
        statusCode: response.status,
      });

      return {
        ok: false as const,
        blockedReason: (response.status === 401 ? 'unauthenticated' : !retryable ? 'invalid' : undefined) as
          | 'unauthenticated'
          | 'invalid'
          | undefined,
      };
    }

    const payload = (await response.json()) as { postId: string };
    const completedAt = new Date();

    await db.transaction('rw', db.drafts, db.outbox, async () => {
      await db.drafts.update(job.draftId, {
        status: 'published',
        publishedPostId: payload.postId,
        updatedAt: completedAt,
        lastError: null,
      });

      await db.outbox.delete(job.id);
    });

    return {
      ok: true as const,
      draftId: job.draftId,
    };
  } catch {
    await updateJobFailure({
      job,
      errorMessage: 'Unable to publish your blog post right now. Please try again.',
    });

    return {
      ok: false as const,
    };
  }
}

export async function flushBlogPublishOutbox(input: { userId: string }): Promise<FlushBlogPublishOutboxResult> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return {
      blockedReason: 'offline',
      processedCount: 0,
      publishedDraftIds: [],
    };
  }

  const lockedResult = await withPublishOutboxLock(async () => {
    let processedCount = 0;
    const publishedDraftIds: string[] = [];

    while (true) {
      const job = await getNextDuePublishJob(input.userId, new Date());

      if (!job) {
        return {
          processedCount,
          publishedDraftIds,
        };
      }

      const result = await processBlogPublishJob(job);

      if (result.ok) {
        processedCount += 1;
        publishedDraftIds.push(result.draftId);
        continue;
      }

      return {
        blockedReason: result.blockedReason,
        processedCount,
        publishedDraftIds,
      };
    }
  });

  return (
    lockedResult ?? {
      processedCount: 0,
      publishedDraftIds: [],
    }
  );
}
