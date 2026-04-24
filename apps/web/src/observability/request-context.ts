import { AsyncLocalStorage } from 'node:async_hooks';

import type { RequestContext } from '@/src/observability/contracts';

const requestContextStorage = new AsyncLocalStorage<RequestContext>();

export function createRequestContext(request: Request): RequestContext {
  const url = new URL(request.url);

  return {
    requestId: request.headers.get('x-request-id') ?? crypto.randomUUID(),
    method: request.method,
    pathname: url.pathname,
  };
}

export async function withRequestContext<T>(
  context: RequestContext,
  callback: () => Promise<T>,
): Promise<T> {
  return requestContextStorage.run(context, callback);
}

export function getRequestContext(): RequestContext | undefined {
  return requestContextStorage.getStore();
}

export function setRequestActorId(actorId: string | null) {
  const context = requestContextStorage.getStore();

  if (context) {
    context.actorId = actorId;
  }
}
