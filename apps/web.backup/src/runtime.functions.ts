import { getAuthSession } from '@/src/auth.server';
import {
  getNotificationPreviewUseCase,
  type NotificationPreview,
} from '@/src/domain/notifications/use-cases';
import { isGithubPagesBuild } from '@/src/runtime/build-target';

export type AppRouteContext = {
  session: Awaited<ReturnType<typeof getAuthSession>>;
  notificationCenter: NotificationPreview | null;
};

export const emptyAppContext: AppRouteContext = {
  session: null,
  notificationCenter: null,
};

export async function loadAppContext(): Promise<AppRouteContext> {
  if (isGithubPagesBuild) {
    return emptyAppContext;
  }

  const session = await getAuthSession();

  return {
    session,
    notificationCenter: session?.user.id
      ? await getNotificationPreviewUseCase(session.user.id, 3)
      : null,
  };
}
