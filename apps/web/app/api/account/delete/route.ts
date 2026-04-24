import { secureRoute } from '@/src/api/route-security';
import { signOutSession } from '@/src/auth.server';
import {
  deleteAccountUseCase,
  type AccountError,
} from '@/src/domain/account/use-cases';

function statusForAccountError(error: AccountError) {
  switch (error.code) {
    case 'FORBIDDEN':
      return 403;
    case 'NOT_FOUND':
      return 404;
    default:
      return 400;
  }
}

export async function POST(request: Request) {
  const guard = await secureRoute({
    request,
    action: 'account.delete',
    requiredPermission: 'account.deleteOwn',
  });

  if (!guard.ok) {
    return guard.response;
  }

  const userId = guard.session!.user.id;
  const formData = await request.formData();
  const rawCurrentPassword = formData.get('currentPassword');
  const currentPassword =
    typeof rawCurrentPassword === 'string' ? rawCurrentPassword : '';

  try {
    const result = await deleteAccountUseCase(userId, { currentPassword });

    if (!result.ok) {
      return guard.json(
        { error: result.error.message },
        { status: statusForAccountError(result.error) },
      );
    }

    await signOutSession();
    return guard.json({ ok: true });
  } catch {
    return guard.json(
      { error: 'Unable to delete your account right now. Please try again.' },
      { status: 500 },
    );
  }
}
