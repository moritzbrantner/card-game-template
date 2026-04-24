import type { ZodError } from 'zod';

export type ProblemDetail = {
  type: string;
  title: string;
  status: number;
  detail?: string;
  fieldErrors?: Record<string, string[]>;
};

export class ProblemError extends Error {
  constructor(public readonly problem: ProblemDetail) {
    super(problem.detail ?? problem.title);
    this.name = 'ProblemError';
  }
}

export function problem(
  type: string,
  title: string,
  status: number,
  detail?: string,
  fieldErrors?: Record<string, string[]>,
) {
  return {
    type,
    title,
    status,
    detail,
    fieldErrors,
  } satisfies ProblemDetail;
}

export function createProblemResponse(
  problemDetail: ProblemDetail,
  init?: ResponseInit,
) {
  const headers = new Headers(init?.headers);
  headers.set('content-type', 'application/problem+json; charset=utf-8');

  return new Response(JSON.stringify(problemDetail), {
    ...init,
    status: problemDetail.status,
    headers,
  });
}

export function zodFieldErrors(error: ZodError) {
  const flattened = error.flatten((issue) => issue.message);

  return Object.fromEntries(
    Object.entries(flattened.fieldErrors).filter(
      (entry): entry is [string, string[]] =>
        Array.isArray(entry[1]) && entry[1].length > 0,
    ),
  );
}

export function invalidBodyProblem(
  detail = 'Request body is invalid.',
  fieldErrors?: Record<string, string[]>,
) {
  return problem(
    '/problems/invalid-body',
    'Invalid request body',
    400,
    detail,
    fieldErrors,
  );
}

export function invalidQueryProblem(
  detail = 'Request query is invalid.',
  fieldErrors?: Record<string, string[]>,
) {
  return problem(
    '/problems/invalid-query',
    'Invalid query parameters',
    400,
    detail,
    fieldErrors,
  );
}

export function authenticationRequiredProblem(
  detail = 'Authentication required.',
) {
  return problem(
    '/problems/authentication-required',
    'Authentication required',
    401,
    detail,
  );
}

export function forbiddenProblem(detail = 'Forbidden.') {
  return problem('/problems/forbidden', 'Forbidden', 403, detail);
}

export function notFoundProblem(detail = 'Not found.') {
  return problem('/problems/not-found', 'Not found', 404, detail);
}

export function rateLimitedProblem(detail = 'Rate limit exceeded.') {
  return problem('/problems/rate-limited', 'Too many requests', 429, detail);
}

export function internalServerProblem(
  detail = 'An unexpected error occurred.',
) {
  return problem(
    '/problems/internal-server-error',
    'Internal server error',
    500,
    detail,
  );
}
