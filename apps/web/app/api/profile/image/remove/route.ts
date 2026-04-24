import { signInSession } from '@/src/auth.server';
import { removeProfileImageUseCase } from '@/src/domain/profile/use-cases';
import { problem, ProblemError } from '@/src/http/errors';
import { createApiRoute } from '@/src/http/route';

export const POST = createApiRoute({
  action: 'profile.removeImage',
  auth: true,
  permission: 'profile.manageOwnImage',
  async handler({ actorId, session }) {
    const result = await removeProfileImageUseCase(actorId!);

    if (!result.ok) {
      throw new ProblemError(
        problem(
          '/problems/profile-image-remove',
          'Unable to remove profile image',
          400,
          result.error.message,
        ),
      );
    }

    await signInSession({
      ...session!.user,
      image: null,
    });

    return { ok: true };
  },
});
