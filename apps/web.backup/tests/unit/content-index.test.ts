import { describe, expect, it } from 'vitest';

import { getAdjacentEntries, listBlogPosts } from '@/src/content/index';

describe('content index', () => {
  it('loads localized MDX entries', async () => {
    const posts = await listBlogPosts('en');

    expect(posts.map((post) => post.slug)).toEqual([
      'hybrid-sites',
      'template-launch',
    ]);
  });

  it('resolves adjacent entries in reverse chronological order', async () => {
    const adjacent = await getAdjacentEntries('blog', 'en', 'template-launch');

    expect(adjacent.previous).toBeNull();
    expect(adjacent.next?.slug).toBe('hybrid-sites');
  });
});
