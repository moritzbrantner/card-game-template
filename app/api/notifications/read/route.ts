import { markAllNotificationsReadUseCase } from '@/src/domain/notifications/use-cases';
import { createApiRoute } from '@/src/http/route';

export const POST = createApiRoute({
  action: 'notifications.markRead',
  auth: true,
  permission: 'notifications.readOwn',
  async handler({ actorId }) {
    await markAllNotificationsReadUseCase(actorId!);
    return { ok: true };
  },
});
