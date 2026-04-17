import { eq } from 'drizzle-orm';

import { getDb } from '@/src/db/client';
import { blogPosts, userFollows } from '@/src/db/schema';
import {
  normalizeBlogPostCreateInput,
  validateNormalizedBlogPostCreateInput,
  type CreateBlogPostRequest,
} from '@/src/domain/blog/contracts';
import { failure, success, type ServiceResult } from '@/src/domain/shared/result';
import { enqueueJob } from '@/src/jobs/service';
import { buildProfileImageUrl } from '@/src/profile/object-storage';
import { buildPublicProfileBlogPath } from '@/src/profile/tags';

type BlogAuthorRecord = {
  id: string;
  email: string | null;
  tag: string;
  name: string | null;
  image: string | null;
};

type BlogPostRecord = {
  id: string;
  userId: string;
  clientRequestId: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
};

export type BlogPostSummary = {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
};

export type UserBlogPayload = {
  userId: string;
  tag: string;
  displayName: string;
  imageUrl: string | null;
  posts: BlogPostSummary[];
};

export type BlogPostMutationPayload = {
  id: string;
  title: string;
  contentMarkdown: string;
};

export type BlogError = {
  code: 'VALIDATION_ERROR' | 'NOT_FOUND' | 'FORBIDDEN';
  message: string;
};

type BlockRelationshipState = {
  isBlockedByViewer: boolean;
  hasBlockedViewer: boolean;
};

export type BlogUseCaseDeps = {
  findUserById: (userId: string) => Promise<BlogAuthorRecord | undefined>;
  findUserByTag: (tag: string) => Promise<BlogAuthorRecord | undefined>;
  getBlockRelationshipState: (viewerUserId: string, otherUserId: string) => Promise<BlockRelationshipState>;
  listPostsByUserId: (userId: string) => Promise<BlogPostRecord[]>;
  listFollowerIdsByUserId: (userId: string) => Promise<string[]>;
  createPost: (input: {
    userId: string;
    clientRequestId: string;
    title: string;
    content: string;
  }) => Promise<{ created: boolean; post: BlogPostRecord }>;
  createNotifications: (
    input: Array<{
      userId: string;
      actorId: string;
      title: string;
      body: string;
      href: string;
    }>,
  ) => Promise<void>;
};

function getBlogUseCaseDeps(): BlogUseCaseDeps {
  return {
    findUserById: (userId) =>
      getDb().query.users.findFirst({
        where: (table, { eq: innerEq }) => innerEq(table.id, userId),
      }),
    findUserByTag: (tag) =>
      getDb().query.users.findFirst({
        where: (table, { eq: innerEq }) => innerEq(table.tag, tag),
      }),
    getBlockRelationshipState: async (viewerUserId, otherUserId) => {
      const [isBlockedByViewer, hasBlockedViewer] = await Promise.all([
        getDb().query.userBlocks.findFirst({
          where: (table, { and: innerAnd, eq: innerEq }) =>
            innerAnd(innerEq(table.blockerId, viewerUserId), innerEq(table.blockedId, otherUserId)),
        }),
        getDb().query.userBlocks.findFirst({
          where: (table, { and: innerAnd, eq: innerEq }) =>
            innerAnd(innerEq(table.blockerId, otherUserId), innerEq(table.blockedId, viewerUserId)),
        }),
      ]);

      return {
        isBlockedByViewer: Boolean(isBlockedByViewer),
        hasBlockedViewer: Boolean(hasBlockedViewer),
      };
    },
    listPostsByUserId: (userId) =>
      getDb().query.blogPosts.findMany({
        where: (table, { eq: innerEq }) => innerEq(table.userId, userId),
        orderBy: (table, { desc: innerDesc }) => [innerDesc(table.createdAt)],
      }),
    listFollowerIdsByUserId: async (userId) => {
      const followers = await getDb()
        .select({ userId: userFollows.followerId })
        .from(userFollows)
        .where(eq(userFollows.followingId, userId));

      return followers.map((follower) => follower.userId);
    },
    createPost: async ({ userId, clientRequestId, title, content }) => {
      const [createdPost] = await getDb()
        .insert(blogPosts)
        .values({
          id: crypto.randomUUID(),
          userId,
          clientRequestId,
          title,
          content,
        })
        .onConflictDoNothing({
          target: [blogPosts.userId, blogPosts.clientRequestId],
        })
        .returning();

      if (createdPost) {
        return {
          created: true,
          post: createdPost,
        };
      }

      const existingPost = await getDb().query.blogPosts.findFirst({
        where: (table, { and: innerAnd, eq: innerEq }) =>
          innerAnd(innerEq(table.userId, userId), innerEq(table.clientRequestId, clientRequestId)),
      });

      if (!existingPost) {
        throw new Error('Expected blog post to exist after idempotent create replay.');
      }

      return {
        created: false,
        post: existingPost,
      };
    },
    createNotifications: async (input) => {
      if (input.length === 0) {
        return;
      }

      await enqueueJob('fanoutNotification', {
        actorId: input[0]!.actorId,
        audience: 'user',
        audienceValue: input[0]!.userId,
        title: input[0]!.title,
        body: input[0]!.body,
        href: input[0]!.href,
        recipientUserIds: input.map((notification) => notification.userId),
      });
    },
  };
}

function resolveProfileDisplayName(user: Pick<BlogAuthorRecord, 'name' | 'email'>) {
  const trimmedName = user.name?.trim();

  if (trimmedName) {
    return trimmedName;
  }

  const emailPrefix = user.email?.split('@')[0]?.trim();
  return emailPrefix || 'User';
}

function normalizeBlogPost(post: BlogPostRecord): BlogPostSummary {
  return {
    id: post.id,
    title: post.title,
    content: post.content,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
  };
}

function buildBlogPostHref(tag: string, postId: string) {
  return `${buildPublicProfileBlogPath(tag)}#post-${postId}`;
}

function buildFollowerNotification(input: {
  authorUserId: string;
  authorTag: string;
  authorDisplayName: string;
  followerUserId: string;
  postId: string;
  postTitle: string;
}) {
  return {
    userId: input.followerUserId,
    actorId: input.authorUserId,
    title: `${input.authorDisplayName} published a new blog post`,
    body: input.postTitle,
    href: buildBlogPostHref(input.authorTag, input.postId),
  };
}

export async function getUserBlogUseCase(
  userId: string,
  viewerUserId?: string | null,
  deps: BlogUseCaseDeps = getBlogUseCaseDeps(),
): Promise<ServiceResult<UserBlogPayload, BlogError>> {
  const user = await deps.findUserById(userId);

  if (!user) {
    return failure({
      code: 'NOT_FOUND',
      message: 'User account was not found.',
    });
  }

  if (viewerUserId && viewerUserId !== user.id) {
    const blockState = await deps.getBlockRelationshipState(viewerUserId, user.id);

    if (blockState.hasBlockedViewer) {
      return failure({
        code: 'FORBIDDEN',
        message: 'You cannot view this profile.',
      });
    }
  }

  const posts = await deps.listPostsByUserId(userId);

  return success({
    userId: user.id,
    tag: user.tag,
    displayName: resolveProfileDisplayName(user),
    imageUrl: buildProfileImageUrl(user.image) ?? null,
    posts: posts.map(normalizeBlogPost),
  });
}

export async function getUserBlogByTagUseCase(
  tag: string,
  viewerUserId?: string | null,
  deps: BlogUseCaseDeps = getBlogUseCaseDeps(),
): Promise<ServiceResult<UserBlogPayload, BlogError>> {
  const user = await deps.findUserByTag(tag);

  if (!user) {
    return failure({
      code: 'NOT_FOUND',
      message: 'User account was not found.',
    });
  }

  return getUserBlogUseCase(user.id, viewerUserId, deps);
}

export async function createBlogPostUseCase(
  userId: string,
  input: CreateBlogPostRequest,
  deps: BlogUseCaseDeps = getBlogUseCaseDeps(),
): Promise<ServiceResult<BlogPostMutationPayload, BlogError>> {
  const normalizedInput = normalizeBlogPostCreateInput(input);
  const validationError = validateNormalizedBlogPostCreateInput(normalizedInput);

  if (validationError) {
    return failure({
      code: 'VALIDATION_ERROR',
      message: validationError,
    });
  }

  const user = await deps.findUserById(userId);

  if (!user) {
    return failure({
      code: 'NOT_FOUND',
      message: 'User account was not found.',
    });
  }

  const authorDisplayName = resolveProfileDisplayName(user);
  const { created, post } = await deps.createPost({
    userId,
    clientRequestId: input.clientRequestId,
    title: normalizedInput.title,
    content: normalizedInput.contentMarkdown,
  });

  if (created) {
    const followerIds = [...new Set(await deps.listFollowerIdsByUserId(userId))].filter((followerId) => followerId !== userId);

    if (followerIds.length > 0) {
      try {
        await deps.createNotifications(
          followerIds.map((followerUserId) =>
            buildFollowerNotification({
              authorUserId: userId,
              authorTag: user.tag,
              authorDisplayName,
              followerUserId,
              postId: post.id,
              postTitle: post.title,
            }),
          ),
        );
      } catch (error) {
        console.error('Failed to deliver follower notifications for blog post.', error);
      }
    }
  }

  return success({
    id: post.id,
    title: post.title,
    contentMarkdown: post.content,
  });
}
