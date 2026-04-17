import type { ZodType } from 'zod';

import type { AppPermissionKey, AppRole } from '@/lib/authorization';
import type { FoundationFeatureKey } from '@/src/app-config/feature-keys';
import type { AppSession } from '@/src/auth';
import { getAuthSession } from '@/src/auth.server';
import { hasPermissionForRole } from '@/src/domain/authorization/service';
import { isFeatureEnabledForUser } from '@/src/foundation/features/access';
import { auditAction, enforceRateLimit, getRateLimitKey } from '@/src/api/security';
import { errorReporter, getLogger } from '@/src/observability/logger';
import { createRequestContext, setRequestActorId, withRequestContext } from '@/src/observability/request-context';
import {
  authenticationRequiredProblem,
  createProblemResponse,
  forbiddenProblem,
  internalServerProblem,
  invalidBodyProblem,
  invalidQueryProblem,
  notFoundProblem,
  ProblemError,
  rateLimitedProblem,
  zodFieldErrors,
} from '@/src/http/errors';

type QueryValue = string | string[];
type QueryRecord = Record<string, QueryValue>;

type BodySchema<TBody> = ZodType<TBody> | undefined;
type QuerySchema<TQuery> = ZodType<TQuery> | undefined;

type HandlerContext<TBody, TQuery> = {
  request: Request;
  session: AppSession | null;
  actorId: string | null;
  body: TBody;
  query: TQuery;
};

type CreateApiRouteOptions<TBody, TQuery, TResult> = {
  action: string;
  featureKey?: FoundationFeatureKey;
  auth?: boolean;
  roles?: readonly AppRole[];
  permission?: AppPermissionKey;
  bodySchema?: BodySchema<TBody>;
  querySchema?: QuerySchema<TQuery>;
  handler: (context: HandlerContext<TBody, TQuery>) => Promise<Response | TResult> | Response | TResult;
};

function defaultOutcomeForStatus(status: number) {
  if (status >= 500) {
    return 'error' as const;
  }

  if (status >= 400) {
    return 'denied' as const;
  }

  return 'allowed' as const;
}

function toMultiValueRecord(entries: Iterable<[string, FormDataEntryValue | string]>) {
  const record: Record<string, FormDataEntryValue | string | Array<FormDataEntryValue | string>> = {};

  for (const [key, value] of entries) {
    const existing = record[key];

    if (existing === undefined) {
      record[key] = value;
      continue;
    }

    if (Array.isArray(existing)) {
      existing.push(value);
      continue;
    }

    record[key] = [existing, value];
  }

  return record;
}

function toQueryRecord(searchParams: URLSearchParams): QueryRecord {
  const record: QueryRecord = {};

  for (const [key, value] of searchParams.entries()) {
    const current = record[key];

    if (current === undefined) {
      record[key] = value;
      continue;
    }

    if (Array.isArray(current)) {
      current.push(value);
      continue;
    }

    record[key] = [current, value];
  }

  return record;
}

async function parseRequestBody(request: Request) {
  const contentType = request.headers.get('content-type') ?? '';

  if (contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded')) {
    const formData = await request.formData();
    return toMultiValueRecord(formData.entries());
  }

  if (contentType.includes('application/json') || contentType.includes('text/json')) {
    return request.json();
  }

  if ((request.headers.get('content-length') ?? '0') === '0') {
    return {};
  }

  return request.json();
}

function withStandardHeaders(response: Response, requestId: string, extraHeaders?: HeadersInit) {
  const headers = new Headers(response.headers);
  headers.set('x-request-id', requestId);

  if (extraHeaders) {
    new Headers(extraHeaders).forEach((value, key) => {
      headers.set(key, value);
    });
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function createApiRoute<TBody = undefined, TQuery = undefined, TResult = unknown>(
  options: CreateApiRouteOptions<TBody, TQuery, TResult>,
) {
  return async function routeHandler(request: Request) {
    const requestContext = createRequestContext(request);

    return withRequestContext(requestContext, async () => {
      const logger = getLogger({ action: options.action });
      const session = await getAuthSession();
      const actorId = session?.user.id ?? null;
      setRequestActorId(actorId);

      const rateLimit = await enforceRateLimit(`${options.action}:${getRateLimitKey(request, actorId)}`);
      const rateLimitHeaders = new Headers({
        'x-ratelimit-reset': String(rateLimit.resetAt),
      });

      if (rateLimit.ok) {
        rateLimitHeaders.set('x-ratelimit-remaining', String(rateLimit.remaining));
      } else {
        rateLimitHeaders.set('retry-after', String(rateLimit.retryAfterSeconds));
      }

      const audit = async (status: number) => {
        await auditAction({
          actorId,
          action: options.action,
          outcome: defaultOutcomeForStatus(status),
          statusCode: status,
        });
      };

      try {
        if (!rateLimit.ok) {
          await audit(429);
          return createProblemResponse(rateLimitedProblem(), {
            headers: new Headers({
              ...Object.fromEntries(rateLimitHeaders.entries()),
              'x-request-id': requestContext.requestId,
            }),
          });
        }

        if (
          options.featureKey &&
          !await isFeatureEnabledForUser(
            options.featureKey,
            session?.user?.id ? { id: session.user.id, role: session.user.role } : null,
          )
        ) {
          await audit(404);
          return createProblemResponse(notFoundProblem(), {
            headers: new Headers({
              ...Object.fromEntries(rateLimitHeaders.entries()),
              'x-request-id': requestContext.requestId,
            }),
          });
        }

        if (options.auth && !actorId) {
          await audit(401);
          return createProblemResponse(authenticationRequiredProblem(), {
            headers: new Headers({
              ...Object.fromEntries(rateLimitHeaders.entries()),
              'x-request-id': requestContext.requestId,
            }),
          });
        }

        if (options.roles?.length) {
          if (!actorId) {
            await audit(401);
            return createProblemResponse(authenticationRequiredProblem(), {
              headers: new Headers({
                ...Object.fromEntries(rateLimitHeaders.entries()),
                'x-request-id': requestContext.requestId,
              }),
            });
          }

          if (!session?.user.role || !options.roles.includes(session.user.role)) {
            await audit(403);
            return createProblemResponse(forbiddenProblem(), {
              headers: new Headers({
                ...Object.fromEntries(rateLimitHeaders.entries()),
                'x-request-id': requestContext.requestId,
              }),
            });
          }
        }

        if (options.permission) {
          if (!actorId) {
            await audit(401);
            return createProblemResponse(authenticationRequiredProblem(), {
              headers: new Headers({
                ...Object.fromEntries(rateLimitHeaders.entries()),
                'x-request-id': requestContext.requestId,
              }),
            });
          }

          if (!await hasPermissionForRole(session?.user.role, options.permission)) {
            await audit(403);
            return createProblemResponse(forbiddenProblem(), {
              headers: new Headers({
                ...Object.fromEntries(rateLimitHeaders.entries()),
                'x-request-id': requestContext.requestId,
              }),
            });
          }
        }

        const queryInput = toQueryRecord(new URL(request.url).searchParams);
        const parsedQuery = options.querySchema
          ? options.querySchema.safeParse(queryInput)
          : ({ success: true, data: undefined } as const);

        if (!parsedQuery.success) {
          await audit(400);
          return createProblemResponse(invalidQueryProblem(undefined, zodFieldErrors(parsedQuery.error)), {
            headers: new Headers({
              ...Object.fromEntries(rateLimitHeaders.entries()),
              'x-request-id': requestContext.requestId,
            }),
          });
        }

        let parsedBody: TBody | undefined;

        if (options.bodySchema) {
          let rawBody: unknown;

          try {
            rawBody = await parseRequestBody(request);
          } catch {
            await audit(400);
            return createProblemResponse(invalidBodyProblem('Request body must be valid JSON or form data.'), {
              headers: new Headers({
                ...Object.fromEntries(rateLimitHeaders.entries()),
                'x-request-id': requestContext.requestId,
              }),
            });
          }

          const bodyResult = options.bodySchema.safeParse(rawBody);

          if (!bodyResult.success) {
            await audit(400);
            return createProblemResponse(invalidBodyProblem(undefined, zodFieldErrors(bodyResult.error)), {
              headers: new Headers({
                ...Object.fromEntries(rateLimitHeaders.entries()),
                'x-request-id': requestContext.requestId,
              }),
            });
          }

          parsedBody = bodyResult.data;
        }

        const result = await options.handler({
          request,
          session,
          actorId,
          body: parsedBody as TBody,
          query: parsedQuery.data as TQuery,
        });

        const response =
          result instanceof Response
            ? result
            : Response.json(result, {
                status: 200,
              });

        await audit(response.status);
        return withStandardHeaders(response, requestContext.requestId, rateLimitHeaders);
      } catch (error) {
        const problem = error instanceof ProblemError ? error.problem : internalServerProblem();

        if (problem.status >= 500) {
          logger.error({ err: error }, 'API route failed');
          await errorReporter.captureException(error, { action: options.action });
        }

        await audit(problem.status);
        return createProblemResponse(problem, {
          headers: new Headers({
            ...Object.fromEntries(rateLimitHeaders.entries()),
            'x-request-id': requestContext.requestId,
          }),
        });
      }
    });
  };
}
