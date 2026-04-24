// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';

import { NewsletterSignup } from '@/components/newsletter/newsletter-signup';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('NewsletterSignup problem responses', () => {
  it('renders the problem detail message from application/problem+json responses', async () => {
    const detail = 'That email is already subscribed.';

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            type: '/problems/newsletter-subscription',
            title: 'Unable to subscribe',
            status: 400,
            detail,
          }),
          {
            status: 400,
            headers: {
              'content-type': 'application/problem+json; charset=utf-8',
            },
          },
        ),
      ),
    );

    render(
      <NewsletterSignup
        locale="en"
        labels={{
          eyebrow: 'Newsletter',
          title: 'Stay updated',
          description: 'Join the list.',
          email: 'Email',
          submit: 'Subscribe',
          submitting: 'Subscribing',
          requiredEmail: 'Email is required.',
          invalidEmail: 'Email is invalid.',
          success: 'Subscribed.',
          genericError: 'Unable to subscribe.',
        }}
      />,
    );

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'person@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Subscribe' }));

    await waitFor(() => {
      expect(screen.getByText(detail)).toBeTruthy();
    });
  });
});
