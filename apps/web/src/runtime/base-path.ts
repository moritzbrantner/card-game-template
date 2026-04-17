export function normalizePublicBasePath(value: string | undefined): string {
  if (!value || value === '/') {
    return '/';
  }

  return `/${value.replace(/^\/+|\/+$/g, '')}/`;
}

export function normalizeRouterBasePath(value: string | undefined): string {
  const publicBasePath = normalizePublicBasePath(value);

  return publicBasePath === '/' ? '/' : publicBasePath.slice(0, -1);
}
