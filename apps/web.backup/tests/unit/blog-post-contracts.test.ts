import { describe, expect, it } from 'vitest';

import {
  normalizeBlogPostCreateInput,
  validateNormalizedBlogPostCreateInput,
} from '@/src/domain/blog/contracts';

describe('blog post contracts', () => {
  it('normalizes valid markdown input before publishing', () => {
    const normalized = normalizeBlogPostCreateInput({
      title: '  My title  ',
      contentMarkdown: '  This body has enough content to pass the minimum validation.  ',
    });

    expect(normalized).toEqual({
      title: 'My title',
      contentMarkdown: 'This body has enough content to pass the minimum validation.',
    });
    expect(validateNormalizedBlogPostCreateInput(normalized)).toBeNull();
  });

  it('rejects markdown input that fails shared validation', () => {
    const normalized = normalizeBlogPostCreateInput({
      title: 'Hey',
      contentMarkdown: 'Too short',
    });

    expect(validateNormalizedBlogPostCreateInput(normalized)).toBe('Title must be at least 4 characters.');
  });
});
