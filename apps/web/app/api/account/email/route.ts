import { secureRoute } from '@/src/api/route-security';
import { signInSession } from '@/src/auth.server';
import {
  updateAccountEmailUseCase,
  type AccountError,
} from '@/src/domain/account/use-cases';

function statusForAccountError(error: AccountError) {
  switch (error.code) {
    case 'FORBIDDEN':
      return 403;
    case 'NOT_FOUND':
      return 404;
    case 'CONFLICT':
      return 409;
    default:
      return 400;
  }
}

export async function POST(request: Request) {
  const guard = await secureRoute({
    request,
    action: 'account.updateEmail',
    requiredPermission: 'account.updateOwnEmail',
  });

  if (!guard.ok) {
    return guard.response;
  }

  const session = guard.session!;
  const userId = session.user.id;
  const formData = await request.formData();
  const rawEmail = formData.get('email');
  const rawCurrentPassword = formData.get('currentPassword');
  const email = typeof rawEmail === 'string' ? rawEmail : '';
  const currentPassword =
    typeof rawCurrentPassword === 'string' ? rawCurrentPassword : '';

  try {
    const result = await updateAccountEmailUseCase(userId, {
      email,
      currentPassword,
    });

    if (!result.ok) {
      return guard.json(
        { error: result.error.message },
        { status: statusForAccountError(result.error) },
      );
    }

    await signInSession({
      ...session.user,
      email: result.data.email,
    });

    return guard.json({ ok: true });
  } catch {
    return guard.json(
      {
        error:
          'Unable to update your email address right now. Please try again.',
      },
      { status: 500 },
    );
  }
}
