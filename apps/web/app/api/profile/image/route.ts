import * as z from 'zod';

import { signInSession } from '@/src/auth.server';
import { updateProfileImageUseCase } from '@/src/domain/profile/use-cases';
import { getLogger } from '@/src/observability/logger';
import { problem, ProblemError } from '@/src/http/errors';
import { createApiRoute } from '@/src/http/route';

export const POST = createApiRoute({
  action: 'profile.updateImage',
  auth: true,
  bodySchema: z.object({
    image: z.instanceof(File),
  }),
  async handler({ body, session, actorId }) {
    try {
      const result = await updateProfileImageUseCase(actorId!, body.image);

      if (!result.ok) {
        throw new ProblemError(problem('/problems/profile-image', 'Unable to update profile image', 400, result.error.message));
      }

      await signInSession({
        ...session!.user,
        image: result.data.imageUrl,
      });

      return { ok: true };
    } catch (error) {
      getLogger({ subsystem: 'profile' }).error({ err: error }, 'Profile image upload failed');
      throw error;
    }
  },
});
