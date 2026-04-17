import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { getConfiguredContentRoots, listBlogPosts } from '@/src/content/index';

describe('content roots', () => {
  it('loads content from the active app roots', async () => {
    const roots = getConfiguredContentRoots('blog');

    expect(roots[0]).toContain(path.join('apps', 'showcase', 'content', 'blog'));

    const posts = await listBlogPosts('en');
    expect(posts.map((post) => post.slug)).toEqual(['hybrid-sites', 'template-launch']);
  });
});
