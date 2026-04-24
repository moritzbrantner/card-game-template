import { describe, expect, it } from 'vitest';

import deMessages from '@/apps/showcase/messages/de';
import enMessages from '@/apps/showcase/messages/en';
import showcaseManifest from '@/apps/showcase/manifest';

const expectedNamespaces = new Set(
  showcaseManifest.publicPages.map((page) => page.namespace),
);

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
});
