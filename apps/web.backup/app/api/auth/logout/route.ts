import { createApiRoute } from '@/src/http/route';
import { signOutSession } from '@/src/auth.server';

export const POST = createApiRoute({
  action: 'auth.logout',
  auth: true,
  async handler() {
    await signOutSession();
    return { ok: true };
  },
});
