import { describe, expect, it } from 'vitest';

import {
  resolveEnabledPublicRoute,
  resolvePublicRoute,
} from '@moritzbrantner/app-pack';

import showcaseManifest from '@/apps/showcase/manifest';

const supportedLocales = ['en', 'de'] as const;

function slugToSegments(slug: string) {
  return slug.length > 0 ? slug.split('/') : undefined;
}

describe('showcase manifest contract', () => {
  it('keeps navigation entries aligned with declared public pages', () => {
    const publicPageIds = new Set(
      showcaseManifest.publicPages.map((page) => page.id),
    );

    expect(
      showcaseManifest.publicNavigation
        .map((item) => item.pageId)
        .every((pageId) => publicPageIds.has(pageId)),
    ).toBe(true);
  });

  it('resolves each canonical public page slug through the manifest', () => {
    for (const page of showcaseManifest.publicPages) {
      const resolved = resolvePublicRoute(
        showcaseManifest,
        slugToSegments(page.slug),
      );
      expect(resolved?.page.id).toBe(page.id);
    }
  });

  it('resolves aliases for enabled pages and blocks them when the feature is disabled', () => {
    const formsPage = showcaseManifest.publicPages.find(
      (page) => page.id === 'forms',
    );
    expect(formsPage?.aliases).toEqual(['forms']);

    expect(
      resolveEnabledPublicRoute(showcaseManifest, ['forms'])?.page.id,
    ).toBe('forms');

    const disabledManifest = {
      ...showcaseManifest,
      enabledFeatures: {
        ...showcaseManifest.enabledFeatures,
        'showcase.forms': false,
      },
    };

    expect(resolveEnabledPublicRoute(disabledManifest, ['forms'])).toBeNull();
  });

  it('provides valid example API route modules', async () => {
    const routeModules = await Promise.all(
      Object.values(showcaseManifest.exampleApis).map((definition) =>
        definition.loadRouteModule(),
      ),
    );

    expect(
      routeModules.every((routeModule) => Object.keys(routeModule).length > 0),
    ).toBe(true);
  });

  it('supports every configured locale', () => {
    for (const locale of supportedLocales) {
      const messages = showcaseManifest.loadMessages(locale);
      expect(messages.NavigationBar).toBeDefined();
    }
  });
});
