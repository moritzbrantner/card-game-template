import { blogPostCreateSchema, type CreateBlogPostResponse } from '@/src/domain/blog/contracts';
import { createBlogPostUseCase } from '@/src/domain/blog/use-cases';
import { createApiRoute } from '@/src/http/route';

export const POST = createApiRoute({
  action: 'blog.createPost',
  auth: true,
  featureKey: 'profiles.blog',
  permission: 'profile.editOwn',
  bodySchema: blogPostCreateSchema,
  async handler({ actorId, body }) {
    const result = await createBlogPostUseCase(actorId!, body);

    if (!result.ok) {
      const status = result.error.code === 'NOT_FOUND' ? 404 : 400;
      return Response.json({ error: result.error.message }, { status });
    }

    const response: CreateBlogPostResponse = {
      ok: true,
      postId: result.data.id,
      title: result.data.title,
      contentMarkdown: result.data.contentMarkdown,
    };

    return response;
  },
});
