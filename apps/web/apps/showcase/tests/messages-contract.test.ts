import { describe, expect, it } from 'vitest';

import deMessages from '@/apps/showcase/messages/de';
import enMessages from '@/apps/showcase/messages/en';
import showcaseManifest from '@/apps/showcase/manifest';

const expectedNamespaces = new Set(
  showcaseManifest.publicPages.map((page) => page.namespace),
);

type MessageCatalog = Record<string, Record<string, unknown> | undefined>;

function getNavigationLinkLabels(
  messages: MessageCatalog,
): Record<string, unknown> {
  const navigationBar = messages.NavigationBar;

  if (!navigationBar || typeof navigationBar !== 'object') {
    return {};
  }

  const links = navigationBar.links;

  return links && typeof links === 'object' && !Array.isArray(links)
    ? (links as Record<string, unknown>)
    : {};
}

describe('showcase message contract', () => {
  it('covers every public page namespace in English and German', () => {
    const englishNamespaces = new Set(Object.keys(enMessages));
    const germanNamespaces = new Set(Object.keys(deMessages));
    const missingEnglishNamespaces = Array.from(expectedNamespaces).filter(
      (namespace) => !englishNamespaces.has(namespace),
    );

    expect(englishNamespaces).toEqual(germanNamespaces);
    expect(missingEnglishNamespaces).toEqual([]);
  });

  it('labels every public navigation item in English and German', () => {
    const navigationPageIds = showcaseManifest.publicNavigation.map(
      (item) => item.pageId,
    );
    const englishLinks = getNavigationLinkLabels(enMessages);
    const germanLinks = getNavigationLinkLabels(deMessages);

    expect(
      navigationPageIds.filter(
        (pageId) => typeof englishLinks[pageId] !== 'string',
      ),
    ).toEqual([]);
    expect(
      navigationPageIds.filter(
        (pageId) => typeof germanLinks[pageId] !== 'string',
      ),
    ).toEqual([]);
  });
});
