import * as z from 'zod';

export const BLOG_POST_TITLE_MIN_LENGTH = 4;
export const BLOG_POST_TITLE_MAX_LENGTH = 120;
export const BLOG_POST_CONTENT_MIN_LENGTH = 20;
export const BLOG_POST_CONTENT_MAX_LENGTH = 10_000;

export const blogPostCreateSchema = z.object({
  clientRequestId: z.string().uuid(),
  title: z.string(),
  contentMarkdown: z.string(),
});

export type CreateBlogPostRequest = z.infer<typeof blogPostCreateSchema>;

export type CreateBlogPostResponse = {
  ok: true;
  postId: string;
  title: string;
  contentMarkdown: string;
};

export function normalizeBlogPostCreateInput(input: Pick<CreateBlogPostRequest, 'title' | 'contentMarkdown'>) {
  return {
    title: input.title.trim(),
    contentMarkdown: input.contentMarkdown.trim(),
  };
}

export function validateNormalizedBlogPostCreateInput(input: { title: string; contentMarkdown: string }) {
  if (input.title.length < BLOG_POST_TITLE_MIN_LENGTH) {
    return `Title must be at least ${BLOG_POST_TITLE_MIN_LENGTH} characters.`;
  }

  if (input.title.length > BLOG_POST_TITLE_MAX_LENGTH) {
    return `Title must be ${BLOG_POST_TITLE_MAX_LENGTH} characters or fewer.`;
  }

  if (input.contentMarkdown.length < BLOG_POST_CONTENT_MIN_LENGTH) {
    return `Post content must be at least ${BLOG_POST_CONTENT_MIN_LENGTH} characters.`;
  }

  if (input.contentMarkdown.length > BLOG_POST_CONTENT_MAX_LENGTH) {
    return `Post content must be ${BLOG_POST_CONTENT_MAX_LENGTH} characters or fewer.`;
  }

  return null;
}
