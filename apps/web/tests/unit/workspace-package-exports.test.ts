import { describe, expect, it } from 'vitest';

import { foundationFeatureKeys, resolvePublicRoute, withLocalePath, type AppManifest } from '@moritzbrantner/app-pack';
import { StaticRedirectPage } from '@moritzbrantner/app-pack-react';
import { Card, buttonVariants } from '@moritzbrantner/ui';

const manifest: AppManifest = {
  id: 'export-check',
  siteName: 'Export Check',
  defaultLocaleMetadata: {
    title: 'Export Check',
    description: 'Workspace package export checks',
  },
  enabledFeatures: {},
  publicPages: [
    {
      id: 'home',
      slug: '',
      kind: 'component',
      namespace: 'HomePage',
      render: () => null,
    },
  ],
  publicNavigation: [],
  contentRoots: {
    pages: [],
    blog: [],
    changelog: [],
  },
  loadMessages: () => ({}),
  exampleApis: {},
};

describe('workspace package exports', () => {
  it('exposes the app-pack contract surface', () => {
    expect(foundationFeatureKeys.length).toBeGreaterThan(0);
    expect(withLocalePath('/about', 'de')).toBe('/de/about');
    expect(resolvePublicRoute(manifest, [])?.page.id).toBe('home');
  });

  it('exposes the app-pack React surface', () => {
    expect(StaticRedirectPage).toBeTypeOf('function');
  });

  it('exposes the UI surface used by app packs', () => {
    expect(Card).toBeDefined();
    expect(buttonVariants({ variant: 'ghost' })).toContain('inline-flex');
  });
});
