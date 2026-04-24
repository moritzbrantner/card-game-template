import { describe, expect, it } from 'vitest';

import type { AppManifest } from '@/src/app-config/contracts';
import {
  resolveEnabledPublicRoute,
  resolvePublicRoute,
} from '@/src/app-config/public-route-resolver';

function createManifest(overrides?: Partial<AppManifest>): AppManifest {
  return {
    id: 'test-app',
    siteName: 'Test App',
    defaultLocaleMetadata: {
      title: 'Test App',
      description: 'Test description',
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
    ...overrides,
  };
}

describe('public route resolver', () => {
  it('maps canonical and alias slugs to the same public page contract', () => {
    const manifest = createManifest();

    expect(resolvePublicRoute(manifest, undefined)?.page.id).toBe('home');
    expect(resolvePublicRoute(manifest, ['examples', 'forms'])?.page.id).toBe(
      'forms',
    );
    expect(resolvePublicRoute(manifest, ['forms'])?.matchedSlug).toBe('forms');
  });

  it('treats disabled feature pages as unresolved for the active manifest', () => {
    const manifest = createManifest({
      enabledFeatures: {
        'showcase.forms': false,
      },
    });

    expect(
      resolveEnabledPublicRoute(manifest, ['examples', 'forms']),
    ).toBeNull();
    expect(resolveEnabledPublicRoute(manifest, ['forms'])).toBeNull();
  });
});
