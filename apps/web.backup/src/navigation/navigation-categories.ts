import type { AppRole } from '@/lib/authorization';
import { getVisibleAppPages, type AppHotkey } from '@/src/navigation/app-routes';

export type NavigationCategoryKey = 'discover' | 'workspace' | 'admin';

type NavigationLinkDefinition = {
  href: string;
  key: string;
  translationKey: string;
  hotkey: AppHotkey;
  prefetch?: boolean;
  order: number;
};

type NavigationCategoryDefinition = {
  key: NavigationCategoryKey;
  links: readonly NavigationLinkDefinition[];
};

export type NavigationCategory = {
  key: NavigationCategoryKey;
  links: readonly NavigationLinkDefinition[];
};

export function buildNavigationCategories({
  isAuthenticated,
  role,
}: {
  isAuthenticated: boolean;
  role: AppRole | null | undefined;
}): NavigationCategory[] {
  const pages = getVisibleAppPages({
    isAuthenticated,
    role,
  });

  const navigationCategoryDefinitions: readonly NavigationCategoryDefinition[] = [
    {
      key: 'discover',
      links: pages
        .filter((page) => page.navigationCategory === 'discover')
        .map((page) => ({
          href: page.href,
          key: page.key,
          translationKey: page.translationKey,
          hotkey: page.hotkey,
          prefetch: page.prefetch,
          order: page.order,
        })),
    },
    {
      key: 'workspace',
      links: pages
        .filter((page) => page.navigationCategory === 'workspace')
        .map((page) => ({
          href: page.href,
          key: page.key,
          translationKey: page.translationKey,
          hotkey: page.hotkey,
          prefetch: page.prefetch,
          order: page.order,
        })),
    },
    {
      key: 'admin',
      links: pages
        .filter((page) => page.navigationCategory === 'admin')
        .map((page) => ({
          href: page.href,
          key: page.key,
          translationKey: page.translationKey,
          hotkey: page.hotkey,
          prefetch: page.prefetch,
          order: page.order,
        })),
    },
  ];

  return navigationCategoryDefinitions.flatMap((category) => {
    const links = [...category.links].sort((left, right) => left.order - right.order);

    if (!links.length) {
      return [];
    }

    return [{ key: category.key, links }];
  });
}
