import type { ReactNode } from 'react';
import type { Metadata } from 'next';

export type AppLocale = string;

export const foundationFeatureKeys = [
  'account.register',
  'account.passwordRecovery',
  'profiles.public',
  'profiles.follow',
  'profiles.blog',
  'people.directory',
  'notifications',
  'newsletter',
  'reportProblem',
  'content.blog',
  'content.changelog',
  'workspace.dataEntry',
  'admin.workspace',
  'admin.content',
  'admin.reports',
  'admin.users',
  'admin.systemSettings',
  'admin.dataStudio',
  'showcase.forms',
  'showcase.story',
  'showcase.communication',
  'showcase.uploads',
  'showcase.remocn',
  'showcase.employeeTable',
  'showcase.unlighthouse',
] as const;

export type FoundationFeatureKey = (typeof foundationFeatureKeys)[number];

export type SeoFields = {
  title?: string;
  description?: string;
  canonicalUrl?: string;
  ogImage?: string;
};

export type ContentCollection = 'pages' | 'blog' | 'changelog';

export type ContentIndexRecord = {
  id: string;
  collection: ContentCollection;
  slug: string;
  locale: string;
  title: string;
  description: string;
  publishedAt: string;
  updatedAt: string | null;
  draft: boolean;
  tags: string[];
  seo: SeoFields;
  href: string;
};

export type ContentEntry = ContentIndexRecord & {
  body: string;
};

export type AppHotkey = readonly [modifier: 'alt', key: string];

export type AppFeatureConfig = Partial<Record<FoundationFeatureKey, boolean>>;

export type AppContentRoots = Record<ContentCollection, readonly string[]>;

export type AppMessageValue = string | number | boolean | null | undefined | AppMessageTree;

export type AppMessageTree = {
  [key: string]: AppMessageValue;
};

export type AppMessageCatalog = Record<string, AppMessageTree>;

export type AppMessageCatalogLoader = (locale: AppLocale) => AppMessageCatalog;

export type PublicPageRenderProps = {
  locale: AppLocale;
  pageId: string;
  matchedSlug: string;
  pathname: string;
};

export type PublicPageRedirectResult = {
  kind: 'redirect';
  href: string;
};

export function isPublicPageRedirectResult(value: unknown): value is PublicPageRedirectResult {
  return typeof value === 'object' && value !== null && 'kind' in value && 'href' in value
    && value.kind === 'redirect' && typeof value.href === 'string';
}

export type PublicPageDefinition = {
  id: string;
  slug: string;
  kind: 'component' | 'mdx' | 'redirect';
  featureKey?: FoundationFeatureKey;
  namespace: string;
  aliases?: string[];
  render: (props: PublicPageRenderProps) => ReactNode | PublicPageRedirectResult | Promise<ReactNode | PublicPageRedirectResult>;
  generateMetadata?: (props: PublicPageRenderProps) => Metadata | Promise<Metadata>;
};

export type PublicNavigationItem = {
  pageId: string;
  category: 'discover' | 'workspace';
  hotkey: AppHotkey;
  prefetch?: boolean;
  order: number;
};

export type AppExampleApiRouteModule = Partial<Record<'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', (request: Request) => Response | Promise<Response>>>;

export type AppExampleApiDefinition = {
  featureKey?: FoundationFeatureKey;
  loadRouteModule: () => Promise<AppExampleApiRouteModule>;
};

export type AppExampleApiRegistry = Record<string, AppExampleApiDefinition>;

export type AppManifest = {
  id: string;
  siteName: string;
  defaultLocaleMetadata: {
    title: string;
    description: string;
  };
  enabledFeatures: AppFeatureConfig;
  publicPages: readonly PublicPageDefinition[];
  publicNavigation: readonly PublicNavigationItem[];
  contentRoots: AppContentRoots;
  loadMessages: AppMessageCatalogLoader;
  resolveOgImage?: (locale: AppLocale, pageId: string) => string | null | undefined;
  exampleApis: AppExampleApiRegistry;
};

export function isFeatureEnabled(featureKey: FoundationFeatureKey, manifest: AppManifest) {
  return manifest.enabledFeatures[featureKey] === true;
}

function normalizeSlugValue(slug: readonly string[] | string | undefined | null) {
  if (!slug) {
    return '';
  }

  return (Array.isArray(slug) ? slug : [slug]).filter(Boolean).join('/');
}

function listRouteSlugs(page: PublicPageDefinition) {
  return [page.slug, ...(page.aliases ?? [])];
}

export function resolvePublicRoute(
  manifest: AppManifest,
  slug: readonly string[] | string | undefined | null,
): {
  page: PublicPageDefinition;
  matchedSlug: string;
  canonicalSlug: string;
  pathname: string;
} | null {
  const normalizedSlug = normalizeSlugValue(slug);

  for (const page of manifest.publicPages) {
    for (const candidateSlug of listRouteSlugs(page)) {
      if (candidateSlug === normalizedSlug) {
        return {
          page,
          matchedSlug: candidateSlug,
          canonicalSlug: page.slug,
          pathname: candidateSlug ? `/${candidateSlug}` : '/',
        };
      }
    }
  }

  return null;
}

export function resolveEnabledPublicRoute(
  manifest: AppManifest,
  slug: readonly string[] | string | undefined | null,
) {
  const resolvedRoute = resolvePublicRoute(manifest, slug);

  if (!resolvedRoute) {
    return null;
  }

  if (resolvedRoute.page.featureKey && !isFeatureEnabled(resolvedRoute.page.featureKey, manifest)) {
    return null;
  }

  return resolvedRoute;
}

function slugToSegments(slug: string) {
  if (!slug) {
    return [] as string[];
  }

  return slug.split('/').filter(Boolean);
}

export function generatePublicRouteParams(locales: readonly AppLocale[], manifest: AppManifest) {
  return locales.flatMap((locale) =>
    manifest.publicPages.flatMap((page) =>
      listRouteSlugs(page).map((slug) => ({
        locale,
        publicSlug: slugToSegments(slug),
      })),
    ),
  );
}

export function getPublicPageNamespaces(manifest: AppManifest) {
  return Array.from(new Set(manifest.publicPages.map((page) => page.namespace)));
}

export function withLocalePath(pathname: string, locale: AppLocale): string {
  if (!pathname.startsWith('/')) {
    return pathname;
  }

  const [path, suffix = ''] = pathname.split(/(?=[?#])/);
  const normalizedPath = path === `/${locale}`
    ? '/'
    : path.startsWith(`/${locale}/`)
      ? path.slice(locale.length + 1)
      : path;

  return normalizedPath === '/' ? `/${locale}${suffix}` : `/${locale}${normalizedPath}${suffix}`;
}

export const isGithubPagesBuild = process.env.NEXT_DEPLOY_TARGET === 'gh-pages';
