import { describe, expect, it } from 'vitest';

import {
  foundationFeatureKeys,
  generatePublicRouteParams,
  isPublicPageRedirectResult,
  resolveEnabledPublicRoute,
  resolvePublicRoute,
  type AppManifest,
} from '@moritzbrantner/app-pack';

const manifest: AppManifest = {
  id: 'test-pack',
  siteName: 'Test Pack',
  defaultLocaleMetadata: {
    title: 'Test',
    description: 'Test manifest',
  },
  enabledFeatures: {
    'showcase.forms': true,
  },
  publicPages: [
    {
      id: 'home',
      slug: '',
      kind: 'component',
      namespace: 'HomePage',
      render: () => null,
    },
    {
      id: 'forms',
      slug: 'examples/forms',
      kind: 'component',
      namespace: 'FormsPage',
      featureKey: 'showcase.forms',
      aliases: ['forms'],
      render: () => ({ kind: 'redirect', href: '/en/examples/forms' }),
    },
  ],
  publicNavigation: [],
  contentRoots: {
    pages: ['apps/test/content/pages'],
    blog: ['apps/test/content/blog'],
    changelog: ['apps/test/content/changelog'],
  },
  loadMessages: () => ({}),
  exampleApis: {},
};

describe('@moritzbrantner/app-pack', () => {
  it('exports the foundation feature catalog', () => {
    expect(foundationFeatureKeys).toContain('showcase.forms');
  });

  it('resolves public routes and aliases from the package export surface', () => {
    expect(resolvePublicRoute(manifest, ['examples', 'forms'])?.page.id).toBe(
      'forms',
    );
    expect(resolveEnabledPublicRoute(manifest, ['forms'])?.page.id).toBe(
      'forms',
    );
    expect(generatePublicRouteParams(['en', 'de'], manifest)).toEqual([
      { locale: 'en', publicSlug: [] },
      { locale: 'en', publicSlug: ['examples', 'forms'] },
      { locale: 'en', publicSlug: ['forms'] },
      { locale: 'de', publicSlug: [] },
      { locale: 'de', publicSlug: ['examples', 'forms'] },
      { locale: 'de', publicSlug: ['forms'] },
    ]);
  });

  it('exports the redirect result guard', () => {
    expect(
      isPublicPageRedirectResult({
        kind: 'redirect',
        href: '/en/examples/forms',
      }),
    ).toBe(true);
    expect(isPublicPageRedirectResult({ kind: 'component' })).toBe(false);
  });
});
