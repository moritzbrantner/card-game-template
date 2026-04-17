import type { AppLocale } from '@/i18n/routing';
import type { AppManifest, PublicPageDefinition } from '@/src/app-config/contracts';
import { isFeatureEnabled } from '@/src/foundation/features/runtime';

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
