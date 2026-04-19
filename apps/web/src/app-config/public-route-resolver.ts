import {
  generatePublicRouteParams as generatePublicRouteParamsBase,
  getPublicPageNamespaces,
  resolvePublicRoute,
  type AppManifest,
} from '@moritzbrantner/app-pack';

import { isFeatureEnabled } from '@/src/foundation/features/runtime';

export { getPublicPageNamespaces, resolvePublicRoute };

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

export function generatePublicRouteParams(locales: readonly string[], manifest: AppManifest) {
  return generatePublicRouteParamsBase(locales, manifest).filter((entry) => {
    const resolvedRoute = resolveEnabledPublicRoute(manifest, entry.publicSlug);
    return Boolean(resolvedRoute);
  });
}
