import { loadActiveApp } from '@/src/app-config/load-active-app';
import { isSiteFeatureEnabled } from '@/src/foundation/features/access';

function normalizePath(path: string[] | string | undefined) {
  return Array.isArray(path) ? path.join('/') : (path ?? '');
}

async function handleRequest(
  request: Request,
  paramsPromise: Promise<{ path?: string[] }>,
) {
  const manifest = loadActiveApp();
  const { path } = await paramsPromise;
  const registryKey = normalizePath(path);
  const exampleApi = manifest.exampleApis[registryKey];

  if (!exampleApi) {
    return new Response('Not found', { status: 404 });
  }

  if (
    exampleApi.featureKey &&
    !(await isSiteFeatureEnabled(exampleApi.featureKey, manifest))
  ) {
    return new Response('Not found', { status: 404 });
  }

  const handlers = await exampleApi.loadRouteModule();
  const handler = handlers[request.method as keyof typeof handlers];

  if (!handler) {
    return new Response('Method not allowed', { status: 405 });
  }

  return handler(request);
}

export async function GET(
  request: Request,
  context: { params: Promise<{ path?: string[] }> },
) {
  return handleRequest(request, context.params);
}
