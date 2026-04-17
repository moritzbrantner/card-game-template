import {
  canAccessDataEntryWorkspace,
  isAdmin,
  type AppRole,
} from '@/lib/authorization';
import { loadActiveApp } from '@/src/app-config/load-active-app';
import type { AppHotkey } from '@/src/app-config/contracts';
import type { FoundationFeatureKey } from '@/src/app-config/feature-keys';
import { isFeatureEnabled } from '@/src/foundation/features/runtime';
import type { NavigationCategoryKey } from '@/src/navigation/navigation-categories';

export type AppPageKey = string;
export type { AppHotkey };

type Visibility = 'public' | 'guest' | 'authenticated' | 'workspace' | 'admin';

export type AppPageDefinition = {
  key: AppPageKey;
  href: string;
  translationKey: string;
  visibility: Visibility;
  navigationCategory?: NavigationCategoryKey;
  hotkey: AppHotkey;
  order: number;
  prefetch?: boolean;
  featureKey?: FoundationFeatureKey;
};

const foundationPageDefinitions: readonly AppPageDefinition[] = [
  {
    key: 'blog',
    href: '/blog',
    translationKey: 'links.blog',
    visibility: 'public',
    navigationCategory: 'discover',
    hotkey: ['alt', 'g'],
    order: 110,
    featureKey: 'content.blog',
  },
  {
    key: 'changelog',
    href: '/changelog',
    translationKey: 'links.changelog',
    visibility: 'public',
    navigationCategory: 'discover',
    hotkey: ['alt', 'k'],
    order: 120,
    featureKey: 'content.changelog',
  },
  {
    key: 'reportProblem',
    href: '/report-problem',
    translationKey: 'links.reportProblem',
    visibility: 'public',
    navigationCategory: 'discover',
    hotkey: ['alt', 'b'],
    order: 130,
    featureKey: 'reportProblem',
  },
  {
    key: 'people',
    href: '/people',
    translationKey: 'links.people',
    visibility: 'authenticated',
    navigationCategory: 'discover',
    hotkey: ['alt', 'j'],
    order: 210,
    featureKey: 'people.directory',
  },
  {
    key: 'notifications',
    href: '/notifications',
    translationKey: 'links.notifications',
    visibility: 'authenticated',
    navigationCategory: 'workspace',
    hotkey: ['alt', 'n'],
    order: 220,
    featureKey: 'notifications',
  },
  {
    key: 'dataEntry',
    href: '/data-entry',
    translationKey: 'links.dataEntry',
    visibility: 'workspace',
    navigationCategory: 'workspace',
    hotkey: ['alt', 'd'],
    order: 230,
    featureKey: 'workspace.dataEntry',
  },
  {
    key: 'admin',
    href: '/admin',
    translationKey: 'links.admin',
    visibility: 'admin',
    navigationCategory: 'admin',
    hotkey: ['alt', 'm'],
    order: 310,
    featureKey: 'admin.workspace',
  },
  {
    key: 'profile',
    href: '/profile',
    translationKey: 'menu.profile',
    visibility: 'authenticated',
    hotkey: ['alt', 'p'],
    order: 410,
  },
  {
    key: 'settings',
    href: '/settings',
    translationKey: 'menu.settings',
    visibility: 'authenticated',
    hotkey: ['alt', 'e'],
    order: 420,
  },
  {
    key: 'login',
    href: '/login',
    translationKey: 'auth.login',
    visibility: 'guest',
    hotkey: ['alt', 'l'],
    order: 510,
  },
  {
    key: 'register',
    href: '/register',
    translationKey: 'auth.register',
    visibility: 'guest',
    hotkey: ['alt', 'r'],
    order: 520,
    featureKey: 'account.register',
  },
] as const;

function hrefFromSlug(slug: string) {
  return slug ? `/${slug}` : '/';
}

export function getAppPublicPageDefinitionsForManifest(manifest = loadActiveApp()): AppPageDefinition[] {
  const pagesById = new Map(manifest.publicPages.map((page) => [page.id, page]));

  return manifest.publicNavigation.map((item) => {
    const page = pagesById.get(item.pageId);

    if (!page) {
      throw new Error(`Public navigation item "${item.pageId}" does not match any public page in manifest "${manifest.id}".`);
    }

    return {
      key: page.id,
      href: hrefFromSlug(page.slug),
      translationKey: `links.${page.id}`,
      visibility: 'public',
      navigationCategory: item.category,
      hotkey: item.hotkey,
      order: item.order,
      prefetch: item.prefetch,
      featureKey: page.featureKey,
    } satisfies AppPageDefinition;
  });
}

export function composeAppPageDefinitions(manifest = loadActiveApp()): AppPageDefinition[] {
  return [...getAppPublicPageDefinitionsForManifest(manifest), ...foundationPageDefinitions]
    .filter((page) => !page.featureKey || isFeatureEnabled(page.featureKey, manifest))
    .sort((left, right) => left.order - right.order);
}

export const appPageDefinitions: readonly AppPageDefinition[] = composeAppPageDefinitions();

export function formatAppHotkey(hotkey: AppHotkey) {
  return hotkey.map((part) => part.toUpperCase()).join('+');
}

export function canViewAppPage(
  page: AppPageDefinition,
  { isAuthenticated, role }: { isAuthenticated: boolean; role: AppRole | null | undefined },
) {
  if (page.visibility === 'guest') {
    return !isAuthenticated;
  }

  if (page.visibility === 'authenticated') {
    return isAuthenticated;
  }

  if (page.visibility === 'workspace') {
    return isAuthenticated && canAccessDataEntryWorkspace(role);
  }

  if (page.visibility === 'admin') {
    return isAuthenticated && isAdmin(role);
  }

  return true;
}

export function getVisibleAppPages({
  isAuthenticated,
  role,
}: {
  isAuthenticated: boolean;
  role: AppRole | null | undefined;
}) {
  return appPageDefinitions.filter((page) => canViewAppPage(page, { isAuthenticated, role }));
}
