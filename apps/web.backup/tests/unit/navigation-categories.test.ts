import { describe, expect, it } from 'vitest';

import type { AppRole } from '@/lib/authorization';
import { appPageDefinitions, canViewAppPage } from '@/src/navigation/app-routes';
import { buildNavigationCategories } from '@/src/navigation/navigation-categories';

const navigationCategoryKeys = ['discover', 'workspace', 'admin'] as const;

function buildExpectedCategories({
  isAuthenticated,
  role,
}: {
  isAuthenticated: boolean;
  role: AppRole | null;
}) {
  const visiblePages = appPageDefinitions.filter((page) => canViewAppPage(page, { isAuthenticated, role }));

  return navigationCategoryKeys.flatMap((categoryKey) => {
    const links = visiblePages
      .filter((page) => page.navigationCategory === categoryKey)
      .map((page) => ({
        href: page.href,
        key: page.key,
        translationKey: page.translationKey,
        hotkey: page.hotkey,
        prefetch: page.prefetch,
        order: page.order,
      }));

    return links.length ? [{ key: categoryKey, links }] : [];
  });
}

describe('navigation categories', () => {
  it.each([
    { isAuthenticated: false, role: null },
    { isAuthenticated: true, role: 'USER' as const },
    { isAuthenticated: true, role: 'MANAGER' as const },
    { isAuthenticated: true, role: 'ADMIN' as const },
    { isAuthenticated: true, role: 'SUPERADMIN' as const },
  ])('groups visible routes without empty categories for %o', ({ isAuthenticated, role }) => {
    expect(buildNavigationCategories({ isAuthenticated, role })).toEqual(
      buildExpectedCategories({ isAuthenticated, role }),
    );
  });

  it('keeps account-only destinations out of grouped navigation', () => {
    const categories = buildNavigationCategories({ isAuthenticated: true, role: 'USER' });
    const groupedKeys = new Set(categories.flatMap((category) => category.links.map((link) => link.key)));

    expect(groupedKeys.has('profile')).toBe(false);
    expect(groupedKeys.has('settings')).toBe(false);
  });
});
