import { describe, expect, it, vi } from 'vitest';

import {
  createBlogPostUseCase,
  getUserBlogUseCase,
  type BlogUseCaseDeps,
} from '@/src/domain/blog/use-cases';

function createDeps(overrides: Partial<BlogUseCaseDeps> = {}): BlogUseCaseDeps {
  return {
    findUserById: vi.fn(),
    findUserByTag: vi.fn(),
    getBlockRelationshipState: vi.fn().mockResolvedValue({
      isBlockedByViewer: false,
      hasBlockedViewer: false,
    }),
    listPostsByUserId: vi.fn().mockResolvedValue([]),
    listFollowerIdsByUserId: vi.fn().mockResolvedValue([]),
    createPost: vi.fn(),
    createNotifications: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('blog post use cases', () => {
  it('loads a user blog with profile metadata and posts', async () => {
    const createdAt = new Date('2026-04-10T08:00:00.000Z');
    const updatedAt = new Date('2026-04-10T08:15:00.000Z');
    const deps = createDeps({
      findUserById: vi.fn().mockResolvedValue({
        id: 'user_2',
        email: 'writer@example.com',
        tag: 'writer',
        name: 'Writer',
        image: 'local-profile-images/user_2/avatar.jpg',
      }),
      listPostsByUserId: vi.fn().mockResolvedValue([
        {
          id: 'post_1',
          userId: 'user_2',
          clientRequestId: 'request_1',
          title: 'First post',
          content: 'This is the first published post for the public blog page.',
          createdAt,
          updatedAt,
        },
      ]),
    });

    const result = await getUserBlogUseCase('user_2', null, deps);

    expect(result).toEqual({
      ok: true,
      data: {
        userId: 'user_2',
        tag: 'writer',
        displayName: 'Writer',
        imageUrl: '/local-profile-images/user_2/avatar.jpg',
        posts: [
          {
            id: 'post_1',
            title: 'First post',
            content:
              'This is the first published post for the public blog page.',
            createdAt,
            updatedAt,
          },
        ],
      },
    });
  });

  it('creates a post with trimmed values', async () => {
    const deps = createDeps({
      findUserById: vi.fn().mockResolvedValue({
        id: 'user_1',
        email: 'author@example.com',
        tag: 'author',
        name: 'Author',
        image: null,
      }),
      createPost: vi.fn().mockResolvedValue({
        created: true,
        post: {
          id: 'post_2',
          userId: 'user_1',
          clientRequestId: '56ac91ba-597a-4d54-9572-aafe5f2b6e95',
          title: 'Trimmed title',
          content:
            'This body has enough content to pass the minimum validation.',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      }),
      listFollowerIdsByUserId: vi.fn().mockResolvedValue(['user_2', 'user_3']),
    });

    const result = await createBlogPostUseCase(
      'user_1',
      {
        clientRequestId: '56ac91ba-597a-4d54-9572-aafe5f2b6e95',
        title: '  Trimmed title  ',
        contentMarkdown:
          '  This body has enough content to pass the minimum validation.  ',
      },
      deps,
    );

    expect(result).toEqual({
      ok: true,
      data: {
        id: 'post_2',
        title: 'Trimmed title',
        contentMarkdown:
          'This body has enough content to pass the minimum validation.',
      },
    });
    expect(deps.createPost).toHaveBeenCalledWith({
      userId: 'user_1',
      clientRequestId: '56ac91ba-597a-4d54-9572-aafe5f2b6e95',
      title: 'Trimmed title',
      content: 'This body has enough content to pass the minimum validation.',
    });
    expect(deps.createNotifications).toHaveBeenCalledWith([
      {
        userId: 'user_2',
        actorId: 'user_1',
        title: 'Author published a new blog post',
        body: 'Trimmed title',
        href: '/profile/@author/blog#post-post_2',
      },
      {
        userId: 'user_3',
        actorId: 'user_1',
        title: 'Author published a new blog post',
        body: 'Trimmed title',
        href: '/profile/@author/blog#post-post_2',
      },
    ]);
  });

  it('does not fail post creation when follower notifications cannot be delivered', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    try {
      const deps = createDeps({
        findUserById: vi.fn().mockResolvedValue({
          id: 'user_1',
          email: 'author@example.com',
          tag: 'author',
          name: 'Author',
          image: null,
        }),
        listFollowerIdsByUserId: vi.fn().mockResolvedValue(['user_2']),
        createPost: vi.fn().mockResolvedValue({
          created: true,
          post: {
            id: 'post_3',
            userId: 'user_1',
            clientRequestId: '4afdb6d0-176a-45de-84a2-d62296f58cf4',
            title: 'Resilient title',
            content:
              'This body has enough content to pass the minimum validation.',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        }),
        createNotifications: vi
          .fn()
          .mockRejectedValue(new Error('database unavailable')),
      });

      const result = await createBlogPostUseCase(
        'user_1',
        {
          clientRequestId: '4afdb6d0-176a-45de-84a2-d62296f58cf4',
          title: 'Resilient title',
          contentMarkdown:
            'This body has enough content to pass the minimum validation.',
        },
        deps,
      );

      expect(result).toEqual({
        ok: true,
        data: {
          id: 'post_3',
          title: 'Resilient title',
          contentMarkdown:
            'This body has enough content to pass the minimum validation.',
        },
      });
      expect(deps.createNotifications).toHaveBeenCalledTimes(1);
      expect(consoleError).toHaveBeenCalled();
    } finally {
      consoleError.mockRestore();
    }
  });

  it('deduplicates follower notifications and excludes the author from fanout', async () => {
    const deps = createDeps({
      findUserById: vi.fn().mockResolvedValue({
        id: 'user_1',
        email: 'author@example.com',
        tag: 'author',
        name: 'Author',
        image: null,
      }),
      listFollowerIdsByUserId: vi
        .fn()
        .mockResolvedValue(['user_2', 'user_1', 'user_2', 'user_3']),
      createPost: vi.fn().mockResolvedValue({
        created: true,
        post: {
          id: 'post_4',
          userId: 'user_1',
          clientRequestId: '9a5a1a0d-0f2d-4619-b5b5-281e32d4e097',
          title: 'Fanout title',
          content:
            'This body has enough content to pass the minimum validation.',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      }),
    });

    const result = await createBlogPostUseCase(
      'user_1',
      {
        clientRequestId: '9a5a1a0d-0f2d-4619-b5b5-281e32d4e097',
        title: 'Fanout title',
        contentMarkdown:
          'This body has enough content to pass the minimum validation.',
      },
      deps,
    );

    expect(result).toEqual({
      ok: true,
      data: {
        id: 'post_4',
        title: 'Fanout title',
        contentMarkdown:
          'This body has enough content to pass the minimum validation.',
      },
    });
    expect(deps.createNotifications).toHaveBeenCalledWith([
      {
        userId: 'user_2',
        actorId: 'user_1',
        title: 'Author published a new blog post',
        body: 'Fanout title',
        href: '/profile/@author/blog#post-post_4',
      },
      {
        userId: 'user_3',
        actorId: 'user_1',
        title: 'Author published a new blog post',
        body: 'Fanout title',
        href: '/profile/@author/blog#post-post_4',
      },
    ]);
  });

  it('returns the existing post for an idempotent client request replay without fanout side effects', async () => {
    const deps = createDeps({
      findUserById: vi.fn().mockResolvedValue({
        id: 'user_1',
        email: 'author@example.com',
        tag: 'author',
        name: 'Author',
        image: null,
      }),
      createPost: vi.fn().mockResolvedValue({
        created: false,
        post: {
          id: 'post_existing',
          userId: 'user_1',
          clientRequestId: '1e2048e8-7384-44b1-9dbe-b01468ddcac0',
          title: 'Existing title',
          content:
            'This body has enough content to pass the minimum validation.',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      }),
    });

    const result = await createBlogPostUseCase(
      'user_1',
      {
        clientRequestId: '1e2048e8-7384-44b1-9dbe-b01468ddcac0',
        title: 'Existing title',
        contentMarkdown:
          'This body has enough content to pass the minimum validation.',
      },
      deps,
    );

    expect(result).toEqual({
      ok: true,
      data: {
        id: 'post_existing',
        title: 'Existing title',
        contentMarkdown:
          'This body has enough content to pass the minimum validation.',
      },
    });
    expect(deps.listFollowerIdsByUserId).not.toHaveBeenCalled();
    expect(deps.createNotifications).not.toHaveBeenCalled();
  });

  it('rejects posts that are too short', async () => {
    const deps = createDeps();

    await expect(
      createBlogPostUseCase(
        'user_1',
        {
          clientRequestId: '8b9c35e7-f899-47df-aae4-8dfbb6e64950',
          title: 'Hey',
          contentMarkdown: 'Too short',
        },
        deps,
      ),
    ).resolves.toEqual({
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Title must be at least 4 characters.',
      },
    });

    expect(deps.findUserById).not.toHaveBeenCalled();
    expect(deps.createPost).not.toHaveBeenCalled();
  });
});
