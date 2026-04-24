import { secureRoute } from '@/src/api/route-security';
import { markNotificationReadUseCase } from '@/src/domain/notifications/use-cases';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ notificationId: string }> },
) {
  const guard = await secureRoute({
    request,
    action: 'notifications.markItemRead',
    requiredPermission: 'notifications.readOwn',
  });

  if (!guard.ok) {
    return guard.response;
  }

  const { notificationId } = await params;

  if (!notificationId.trim()) {
    return guard.json({ error: 'Notification not found.' }, { status: 404 });
  }

  const result = await markNotificationReadUseCase(
    guard.actorId!,
    notificationId,
  );

  if (!result.ok) {
    return guard.json({ error: result.error.message }, { status: 404 });
  }

  return guard.json({ ok: true, updated: result.data.updated });
}
