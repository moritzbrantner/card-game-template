import type {
  CreateBlogPostRequest,
  CreateBlogPostResponse,
} from '@/src/domain/blog/contracts';

export type { CreateBlogPostRequest, CreateBlogPostResponse };

export type BlogDraftStatus =
  | 'draft'
  | 'queued_publish'
  | 'publishing'
  | 'publish_failed'
  | 'published';

export type PublishJobStatus = 'pending' | 'running' | 'failed';

export type LocalBlogDraft = {
  id: string;
  userId: string;
  locale: string;
  title: string;
  contentMarkdown: string;
  status: BlogDraftStatus;
  createdAt: Date;
  updatedAt: Date;
  lastSavedLocallyAt: Date;
  publishedPostId: string | null;
  publishRequestId: string | null;
  lastError: string | null;
};

export type BlogPublishJob = {
  id: string;
  userId: string;
  draftId: string;
  kind: 'publish_blog_post';
  payload: CreateBlogPostRequest;
  status: PublishJobStatus;
  retryCount: number;
  nextAttemptAt: Date;
  createdAt: Date;
  updatedAt: Date;
  lastError: string | null;
  lastStatusCode: number | null;
};
