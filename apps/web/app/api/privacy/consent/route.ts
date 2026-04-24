import { cookies } from 'next/headers';
import * as z from 'zod';

import { createApiRoute } from '@/src/http/route';
import {
  CONSENT_COOKIE_NAME,
  serializeConsentState,
} from '@/src/privacy/contracts';

const consentBodySchema = z.object({
  necessary: z.literal(true),
  analytics: z.boolean(),
  marketing: z.boolean(),
});

export const POST = createApiRoute({
  action: 'privacy.updateConsent',
  bodySchema: consentBodySchema,
  async handler({ body }) {
    const cookieStore = await cookies();
    cookieStore.set({
      name: CONSENT_COOKIE_NAME,
      value: serializeConsentState(body),
      httpOnly: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 365 * 24 * 60 * 60,
    });

    return { ok: true };
  },
});
