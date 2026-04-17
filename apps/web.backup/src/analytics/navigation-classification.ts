import { stripLocaleFromPathname } from '@/i18n/routing';
import { loadActiveApp } from '@/src/app-config/load-active-app';
import { resolvePublicRoute } from '@/src/app-config/public-route-resolver';

export const navigationRouteGroups = ['public', 'guest', 'authenticated', 'workspace', 'admin', 'unknown'] as const;
export type NavigationRouteGroup = (typeof navigationRouteGroups)[number];

export type NavigationClassification = {
  canonicalPath: string;
  routeGroup: NavigationRouteGroup;
  displayLabel: string;
};

const DISPLAY_LABELS: Record<string, string> = {
  '/': 'Home',
  '/about': 'About',
  '/blog': 'Blog',
  '/blog/[slug]': 'Blog post',
  '/changelog': 'Changelog',
  '/changelog/[slug]': 'Changelog entry',
  '/report-problem': 'Report a problem',
  '/login': 'Login',
  '/register': 'Register',
  '/verify-email': 'Verify email',
  '/reset-password': 'Reset password',
  '/people': 'People',
  '/notifications': 'Notifications',
  '/profile': 'Profile',
  '/profile/blog': 'Profile blog editor',
  '/profile/[userId]': 'Public profile',
  '/profile/[userId]/followers': 'Profile followers',
  '/profile/[userId]/blog': 'Profile blog',
  '/settings': 'Settings',
  '/data-entry': 'Data entry',
  '/admin': 'Admin overview',
  '/admin/content': 'Admin content',
  '/admin/reports': 'Admin reports',
  '/admin/reports/[reportId]': 'Admin report',
  '/admin/users': 'Admin users',
  '/admin/users/[userId]': 'Admin user detail',
  '/admin/system-settings': 'Admin system settings',
  '/admin/data-studio': 'Admin data studio',
  '/[publicSlug*]': 'Public page',
  '/[unknown]': 'Unknown route',
};

function normalizePathname(pathname: string) {
  const stripped = stripLocaleFromPathname(pathname).split(/[?#]/)[0] || '/';
  const normalized = stripped.replace(/\/+$/, '');
  return normalized.length > 0 ? normalized : '/';
}

function buildClassification(canonicalPath: string, routeGroup: NavigationRouteGroup): NavigationClassification {
  return {
    canonicalPath,
    routeGroup,
    displayLabel: DISPLAY_LABELS[canonicalPath] ?? canonicalPath,
  };
}

export function classifyNavigationPathname(pathname: string): NavigationClassification {
  const normalizedPath = normalizePathname(pathname);
  const segments = normalizedPath.split('/').filter(Boolean);

  switch (normalizedPath) {
    case '/':
      return buildClassification('/', 'public');
    case '/about':
      return buildClassification('/about', 'public');
    case '/blog':
      return buildClassification('/blog', 'public');
    case '/changelog':
      return buildClassification('/changelog', 'public');
    case '/report-problem':
      return buildClassification('/report-problem', 'public');
    case '/login':
      return buildClassification('/login', 'guest');
    case '/register':
      return buildClassification('/register', 'guest');
    case '/verify-email':
      return buildClassification('/verify-email', 'guest');
    case '/reset-password':
      return buildClassification('/reset-password', 'guest');
    case '/people':
      return buildClassification('/people', 'authenticated');
    case '/notifications':
      return buildClassification('/notifications', 'authenticated');
    case '/profile':
      return buildClassification('/profile', 'authenticated');
    case '/profile/blog':
      return buildClassification('/profile/blog', 'authenticated');
    case '/settings':
      return buildClassification('/settings', 'authenticated');
    case '/data-entry':
      return buildClassification('/data-entry', 'workspace');
    case '/admin':
      return buildClassification('/admin', 'admin');
    case '/admin/content':
      return buildClassification('/admin/content', 'admin');
    case '/admin/reports':
      return buildClassification('/admin/reports', 'admin');
    case '/admin/users':
      return buildClassification('/admin/users', 'admin');
    case '/admin/system-settings':
      return buildClassification('/admin/system-settings', 'admin');
    case '/admin/data-studio':
      return buildClassification('/admin/data-studio', 'admin');
    default:
      break;
  }

  if (segments[0] === 'blog' && segments.length === 2) {
    return buildClassification('/blog/[slug]', 'public');
  }

  if (segments[0] === 'changelog' && segments.length === 2) {
    return buildClassification('/changelog/[slug]', 'public');
  }

  if (segments[0] === 'profile' && segments.length === 2) {
    return buildClassification('/profile/[userId]', 'public');
  }

  if (segments[0] === 'profile' && segments.length === 3 && segments[2] === 'followers') {
    return buildClassification('/profile/[userId]/followers', 'public');
  }

  if (segments[0] === 'profile' && segments.length === 3 && segments[2] === 'blog') {
    return buildClassification('/profile/[userId]/blog', 'public');
  }

  if (segments[0] === 'admin' && segments[1] === 'reports' && segments.length === 3) {
    return buildClassification('/admin/reports/[reportId]', 'admin');
  }

  if (segments[0] === 'admin' && segments[1] === 'users' && segments.length === 3) {
    return buildClassification('/admin/users/[userId]', 'admin');
  }

  const resolvedPublicRoute = resolvePublicRoute(loadActiveApp(), segments);

  if (resolvedPublicRoute) {
    return buildClassification('/[publicSlug*]', 'public');
  }

  return buildClassification('/[unknown]', 'unknown');
}
