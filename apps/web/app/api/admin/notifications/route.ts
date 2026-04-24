import { secureRoute } from '@/src/api/route-security';
import {
  sendAdminNotificationUseCase,
  type NotificationAudience,
  type NotificationRoleTarget,
} from '@/src/domain/notifications/use-cases';

export async function POST(request: Request) {
  const guard = await secureRoute({
    request,
    action: 'admin.notifications.send',
    requiredFeatureKey: 'admin.users',
    requiredPermission: 'admin.users.notify',
  });

  if (!guard.ok) {
    return guard.response;
  }

  const formData = await request.formData();
  const audience = formData.get('audience');
  const targetUserId = formData.get('targetUserId');
  const targetRole = formData.get('targetRole');
  const title = formData.get('title');
  const body = formData.get('body');
  const href = formData.get('href');

  const result = await sendAdminNotificationUseCase(guard.session!.user.id, {
    audience: (typeof audience === 'string'
      ? audience
      : 'user') as NotificationAudience,
    targetUserId: typeof targetUserId === 'string' ? targetUserId : undefined,
    targetRole: (typeof targetRole === 'string' ? targetRole : undefined) as
      | NotificationRoleTarget
      | undefined,
    title: typeof title === 'string' ? title : '',
    body: typeof body === 'string' ? body : '',
    href: typeof href === 'string' ? href : undefined,
  });

  if (!result.ok) {
    const status = result.error.code === 'NOT_FOUND' ? 404 : 400;
    return guard.json({ error: result.error.message }, { status });
  }

  return guard.json({ ok: true, recipientCount: result.data.recipientCount });
}
