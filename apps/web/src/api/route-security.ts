import type { AppPermissionKey, AppRole } from '@/lib/authorization';
import type { FoundationFeatureKey } from '@/src/app-config/feature-keys';
import { getAuthSession } from '@/src/auth.server';
import {
  auditAction,
  enforceRateLimit,
  getRateLimitKey,
  type AuditOutcome,
  type AuditRecord,
  type RateLimitResult,
} from '@/src/api/security';
import type { AppSession } from '@/src/auth';
import { hasPermissionForRole } from '@/src/domain/authorization/service';
import { isFeatureEnabledForUser } from '@/src/foundation/features/access';

type SecurityDependencies = {
  getSession: () => Promise<AppSession | null>;
  getRateLimitKey: (request: Request, actorId: string | null) => string;
  enforceRateLimit: (key: string) => Promise<RateLimitResult>;
  auditAction: (record: AuditRecord) => Promise<void>;
  hasPermission: (
    role: AppRole | null | undefined,
    permission: AppPermissionKey,
  ) => Promise<boolean>;
};

type RouteSecurityOptions = {
  request: Request;
  action: string;
  requiredFeatureKey?: FoundationFeatureKey;
  requireAuth?: boolean;
  allowedRoles?: readonly AppRole[];
  requiredPermission?: AppPermissionKey;
  metadata?: Record<string, unknown>;
};

type JsonResponseOptions = {
  status?: number;
  outcome?: AuditOutcome;
  metadata?: Record<string, unknown>;
  headers?: HeadersInit;
};

type ResponseOptions = {
  status?: number;
  outcome?: AuditOutcome;
  metadata?: Record<string, unknown>;
  headers?: HeadersInit;
  statusText?: string;
};

type RouteSecuritySuccess = {
  ok: true;
  session: AppSession | null;
  actorId: string | null;
  json: (body: unknown, options?: JsonResponseOptions) => Promise<Response>;
  respond: (
    body: BodyInit | null | undefined,
    options?: ResponseOptions,
  ) => Promise<Response>;
};

type RouteSecurityFailure = {
  ok: false;
  response: Response;
};

function mergeHeaders(baseHeaders: HeadersInit, extraHeaders?: HeadersInit) {
  const headers = new Headers(baseHeaders);

  if (extraHeaders) {
    new Headers(extraHeaders).forEach((value, key) => {
      headers.set(key, value);
    });
  }

  return headers;
}

function withRateLimitHeaders(
  rateLimit:
    | Extract<RateLimitResult, { ok: true }>
    | Extract<RateLimitResult, { ok: false }>,
) {
  const headers = new Headers();
  headers.set('x-ratelimit-reset', String(rateLimit.resetAt));

  if (rateLimit.ok) {
    headers.set('x-ratelimit-remaining', String(rateLimit.remaining));
  } else {
    headers.set('retry-after', String(rateLimit.retryAfterSeconds));
  }

  return headers;
}

function defaultOutcomeForStatus(status: number): AuditOutcome {
  if (status >= 500) {
    return 'error';
  }

  if (status >= 400) {
    return 'denied';
  }

  return 'allowed';
}

export function createRouteSecurity(deps: SecurityDependencies) {
  return async function secureRoute(
    options: RouteSecurityOptions,
  ): Promise<RouteSecuritySuccess | RouteSecurityFailure> {
    const session = await deps.getSession();
    const actorId = session?.user?.id ?? null;
    const rateLimitKey = `${options.action}:${deps.getRateLimitKey(options.request, actorId)}`;
    const rateLimit = await deps.enforceRateLimit(rateLimitKey);

    if (!rateLimit.ok) {
      await deps.auditAction({
        actorId,
        action: options.action,
        outcome: 'rate_limited',
        statusCode: 429,
        metadata: options.metadata,
      });

      return {
        ok: false,
        response: Response.json(
          { error: 'Rate limit exceeded.' },
          {
            status: 429,
            headers: withRateLimitHeaders(rateLimit),
          },
        ),
      };
    }

    if (options.requireAuth && !session?.user?.id) {
      await deps.auditAction({
        actorId,
        action: options.action,
        outcome: 'denied',
        statusCode: 401,
        metadata: options.metadata,
      });

      return {
        ok: false,
        response: Response.json(
          { error: 'Authentication required.' },
          {
            status: 401,
            headers: withRateLimitHeaders(rateLimit),
          },
        ),
      };
    }

    if (
      options.requiredFeatureKey &&
      !(await isFeatureEnabledForUser(
        options.requiredFeatureKey,
        session?.user?.id
          ? { id: session.user.id, role: session.user.role }
          : null,
      ))
    ) {
      await deps.auditAction({
        actorId,
        action: options.action,
        outcome: 'denied',
        statusCode: 404,
        metadata: {
          ...(options.metadata ?? {}),
          featureKey: options.requiredFeatureKey,
        },
      });

      return {
        ok: false,
        response: new Response('Not found', {
          status: 404,
          headers: withRateLimitHeaders(rateLimit),
        }),
      };
    }

    if (options.allowedRoles?.length) {
      if (!session?.user?.id) {
        await deps.auditAction({
          actorId,
          action: options.action,
          outcome: 'denied',
          statusCode: 401,
          metadata: options.metadata,
        });

        return {
          ok: false,
          response: Response.json(
            { error: 'Authentication required.' },
            {
              status: 401,
              headers: withRateLimitHeaders(rateLimit),
            },
          ),
        };
      }

      if (
        !session.user.role ||
        !options.allowedRoles.includes(session.user.role)
      ) {
        await deps.auditAction({
          actorId,
          action: options.action,
          outcome: 'denied',
          statusCode: 403,
          metadata: options.metadata,
        });

        return {
          ok: false,
          response: Response.json(
            { error: 'Forbidden.' },
            {
              status: 403,
              headers: withRateLimitHeaders(rateLimit),
            },
          ),
        };
      }
    }

    if (options.requiredPermission) {
      if (!session?.user?.id) {
        await deps.auditAction({
          actorId,
          action: options.action,
          outcome: 'denied',
          statusCode: 401,
          metadata: options.metadata,
        });

        return {
          ok: false,
          response: Response.json(
            { error: 'Authentication required.' },
            {
              status: 401,
              headers: withRateLimitHeaders(rateLimit),
            },
          ),
        };
      }

      if (
        !(await deps.hasPermission(
          session.user.role,
          options.requiredPermission,
        ))
      ) {
        await deps.auditAction({
          actorId,
          action: options.action,
          outcome: 'denied',
          statusCode: 403,
          metadata: {
            ...(options.metadata ?? {}),
            permission: options.requiredPermission,
          },
        });

        return {
          ok: false,
          response: Response.json(
            { error: 'Forbidden.' },
            {
              status: 403,
              headers: withRateLimitHeaders(rateLimit),
            },
          ),
        };
      }
    }

    return {
      ok: true,
      session,
      actorId,
      json: async (body, responseOptions = {}) => {
        const status = responseOptions.status ?? 200;
        const outcome =
          responseOptions.outcome ?? defaultOutcomeForStatus(status);
        const headers = mergeHeaders(
          withRateLimitHeaders(rateLimit),
          responseOptions.headers,
        );

        await deps.auditAction({
          actorId,
          action: options.action,
          outcome,
          statusCode: status,
          metadata: {
            ...(options.metadata ?? {}),
            ...(responseOptions.metadata ?? {}),
          },
        });

        return Response.json(body, {
          status,
          headers,
        });
      },
      respond: async (body, responseOptions = {}) => {
        const status = responseOptions.status ?? 200;
        const outcome =
          responseOptions.outcome ?? defaultOutcomeForStatus(status);
        const headers = mergeHeaders(
          withRateLimitHeaders(rateLimit),
          responseOptions.headers,
        );

        await deps.auditAction({
          actorId,
          action: options.action,
          outcome,
          statusCode: status,
          metadata: {
            ...(options.metadata ?? {}),
            ...(responseOptions.metadata ?? {}),
          },
        });

        return new Response(body, {
          status,
          statusText: responseOptions.statusText,
          headers,
        });
      },
    };
  };
}

export const secureRoute = createRouteSecurity({
  getSession: getAuthSession,
  getRateLimitKey,
  enforceRateLimit,
  auditAction,
  hasPermission: hasPermissionForRole,
});
