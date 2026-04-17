import Dexie, { type Table } from 'dexie';

import type { BlogPublishJob, LocalBlogDraft } from '@/src/local-first/blog/types';

class BlogLocalDatabase extends Dexie {
  drafts!: Table<LocalBlogDraft, string>;
  outbox!: Table<BlogPublishJob, string>;

  constructor() {
    super('next-template-blog-local');

    this.version(1).stores({
      drafts:
        'id, userId, locale, status, updatedAt, lastSavedLocallyAt, publishedPostId, publishRequestId',
      outbox:
        'id, userId, draftId, kind, status, nextAttemptAt, createdAt, updatedAt',
    });
  }
}

const globalForBlogLocalDb = globalThis as typeof globalThis & {
  __blogLocalDb?: BlogLocalDatabase;
};

export function getBlogLocalDb() {
  if (typeof window === 'undefined') {
    throw new Error('Local-first blog storage is only available in the browser.');
  }

  if (!globalForBlogLocalDb.__blogLocalDb) {
    globalForBlogLocalDb.__blogLocalDb = new BlogLocalDatabase();
  }

  return globalForBlogLocalDb.__blogLocalDb;
}
