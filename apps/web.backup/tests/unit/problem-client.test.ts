import { describe, expect, it } from 'vitest';

import { readProblemDetail } from '@/src/http/problem-client';

describe('readProblemDetail', () => {
  it('reads detail and field errors from application/problem+json responses', async () => {
    const response = new Response(
      JSON.stringify({
        type: '/problems/invalid-body',
        title: 'Invalid request body',
        status: 400,
        detail: 'Email is already in use.',
        fieldErrors: {
          email: ['Email is already in use.'],
        },
      }),
      {
        status: 400,
        headers: {
          'content-type': 'application/problem+json; charset=utf-8',
        },
      },
    );

    await expect(
      readProblemDetail(response, 'Fallback error.'),
    ).resolves.toEqual({
      title: 'Invalid request body',
      detail: 'Email is already in use.',
      fieldErrors: {
        email: ['Email is already in use.'],
      },
      fallbackText: 'Fallback error.',
      formMessage: 'Email is already in use.',
      message: 'Email is already in use.',
    });
  });

  it('uses the first field error when no detail, title, or legacy message is available', async () => {
    const response = new Response(
      JSON.stringify({
        fieldErrors: {
          password: ['Password must be at least 10 characters.'],
          email: ['A valid email is required.'],
        },
      }),
      {
        status: 400,
        headers: {
          'content-type': 'application/problem+json',
        },
      },
    );

    const problem = await readProblemDetail(response, 'Fallback error.');

    expect(problem.fieldErrors.password).toEqual([
      'Password must be at least 10 characters.',
    ]);
    expect(problem.formMessage).toBeUndefined();
    expect(problem.message).toBe('Password must be at least 10 characters.');
  });

  it('falls back to legacy error fields and then to the provided fallback text', async () => {
    const legacyResponse = new Response(
      JSON.stringify({ error: 'Legacy error.' }),
      {
        status: 400,
        headers: {
          'content-type': 'application/json',
        },
      },
    );

    const emptyResponse = new Response(null, {
      status: 500,
    });

    await expect(
      readProblemDetail(legacyResponse, 'Fallback error.'),
    ).resolves.toMatchObject({
      formMessage: 'Legacy error.',
      message: 'Legacy error.',
    });

    await expect(
      readProblemDetail(emptyResponse, 'Fallback error.'),
    ).resolves.toMatchObject({
      formMessage: undefined,
      message: 'Fallback error.',
    });
  });
});
