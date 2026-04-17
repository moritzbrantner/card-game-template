import { getBlogLocalDb } from '@/src/local-first/blog/db';
import type { BlogDraftStatus, LocalBlogDraft } from '@/src/local-first/blog/types';

export async function listLocalBlogDraftsForUser(userId: string) {
  const drafts = await getBlogLocalDb().drafts.where('userId').equals(userId).sortBy('updatedAt');
  return drafts.reverse();
}

export async function createLocalBlogDraft(input: {
  userId: string;
  locale: string;
  title?: string;
  contentMarkdown?: string;
  status?: BlogDraftStatus;
}) {
  const now = new Date();
  const draft: LocalBlogDraft = {
    id: crypto.randomUUID(),
    userId: input.userId,
    locale: input.locale,
    title: input.title ?? '',
    contentMarkdown: input.contentMarkdown ?? '',
    status: input.status ?? 'draft',
    createdAt: now,
    updatedAt: now,
    lastSavedLocallyAt: now,
    publishedPostId: null,
    publishRequestId: null,
    lastError: null,
  };

  await getBlogLocalDb().drafts.add(draft);
  return draft;
}

export async function saveLocalBlogDraft(
  draftId: string,
  input: {
    title: string;
    contentMarkdown: string;
  },
) {
  const now = new Date();
  const db = getBlogLocalDb();

  await db.transaction('rw', db.drafts, db.outbox, async () => {
    const draft = await db.drafts.get(draftId);

    if (!draft) {
      return;
    }

    const existingJob = await db.outbox.where('draftId').equals(draftId).first();
    const nextStatus = existingJob ? 'queued_publish' : 'draft';

    await db.drafts.update(draftId, {
      title: input.title,
      contentMarkdown: input.contentMarkdown,
      status: draft.status === 'published' ? 'published' : nextStatus,
      updatedAt: now,
      lastSavedLocallyAt: now,
      lastError: null,
    });

    if (!existingJob || existingJob.status === 'running') {
      return;
    }

    await db.outbox.update(existingJob.id, {
      payload: {
        ...existingJob.payload,
        title: input.title,
        contentMarkdown: input.contentMarkdown,
      },
      status: 'pending',
      nextAttemptAt: now,
      updatedAt: now,
      lastError: null,
      lastStatusCode: null,
    });
  });
}

export async function deleteLocalBlogDraft(draftId: string) {
  const db = getBlogLocalDb();

  await db.transaction('rw', db.drafts, db.outbox, async () => {
    const jobs = await db.outbox.where('draftId').equals(draftId).toArray();

    if (jobs.length > 0) {
      await db.outbox.bulkDelete(jobs.map((job) => job.id));
    }

    await db.drafts.delete(draftId);
  });
}
