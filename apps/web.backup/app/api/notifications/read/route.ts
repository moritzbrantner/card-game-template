import { markAllNotificationsReadUseCase } from '@/src/domain/notifications/use-cases';
import { createApiRoute } from '@/src/http/route';

export const POST = createApiRoute({
  action: 'notifications.markRead',
  auth: true,
  async handler({ actorId }) {
    await markAllNotificationsReadUseCase(actorId!);
    return { ok: true };
  },
});
