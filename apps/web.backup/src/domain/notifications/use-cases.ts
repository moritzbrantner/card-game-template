import type { AppRole } from '@/lib/authorization';
import { and, count, eq, gte, inArray, sql } from 'drizzle-orm';

import { getDb } from '@/src/db/client';
import { notifications, pageVisits, userFollows } from '@/src/db/schema';
import { failure, success, type ServiceResult } from '@/src/domain/shared/result';
import { buildProfileImageUrl } from '@/src/profile/object-storage';

export type NotificationStatus = 'unread' | 'read';
export type NotificationAudience = 'user' | 'role' | 'all';
export type NotificationRoleTarget = AppRole | 'ALL';
export type AdminUserStatus = 'active' | 'pending' | 'suspended';

export type NotificationFeedItem = {
  id: string;
  title: string;
  body: string;
  href: string | null;
  status: NotificationStatus;
  createdAt: string;
};

export type NotificationPreview = {
  unreadCount: number;
  items: NotificationFeedItem[];
};

export type NotificationsPageData = NotificationPreview & {
  todayCount: number;
};

export type AdminUsersPageData = {
  metrics: {
    privileged: number;
    operational: number;
    member: number;
  };
  users: AdminUserListItem[];
};

export type AdminUserListItem = {
  id: string;
  displayName: string;
  email: string;
  role: AppRole;
  status: AdminUserStatus;
  createdAt: string;
  lastActivityAt: string | null;
  totalNotifications: number;
  unreadNotifications: number;
};

export type AdminUserDetail = {
  id: string;
  displayName: string;
  email: string;
  role: AppRole;
  status: AdminUserStatus;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
  emailVerifiedAt: string | null;
  lockoutUntil: string | null;
  timezone: string | null;
  locale: string | null;
  bio: string | null;
  followerCount: number;
  visitCount: number;
  totalNotifications: number;
  unreadNotifications: number;
  lastActivityAt: string | null;
  recentActivity: Array<{
    id: string;
    pathname: string;
    href: string;
    visitedAt: string;
  }>;
  recentNotifications: NotificationFeedItem[];
};

export type SendAdminNotificationInput = {
  audience: NotificationAudience;
  targetUserId?: string;
  targetRole?: NotificationRoleTarget;
  title: string;
  body: string;
  href?: string;
};

export type NotificationError = {
  code: 'VALIDATION_ERROR' | 'NOT_FOUND';
  message: string;
};

type UserRecord = {
  id: string;
  email: string | null;
  name: string | null;
  role: AppRole;
  image: string | null;
  emailVerified: Date | null;
  lockoutUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

function resolveDisplayName(user: Pick<UserRecord, 'name' | 'email'>) {
  const trimmedName = user.name?.trim();

  if (trimmedName) {
    return trimmedName;
  }

  const emailPrefix = user.email?.split('@')[0]?.trim();
  return emailPrefix || 'User';
}

function resolveUserStatus(user: Pick<UserRecord, 'emailVerified' | 'lockoutUntil'>): AdminUserStatus {
  if (user.lockoutUntil && user.lockoutUntil.getTime() > Date.now()) {
    return 'suspended';
  }

  if (!user.emailVerified) {
    return 'pending';
  }

  return 'active';
}

function toIsoString(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

async function getLatestVisitMap(userIds: string[]) {
  if (userIds.length === 0) {
    return new Map<string, Date>();
  }

  const latestVisits = await getDb()
    .select({
      userId: pageVisits.userId,
      visitedAt: sql<Date>`max(${pageVisits.visitedAt})`,
    })
    .from(pageVisits)
    .where(inArray(pageVisits.userId, userIds))
    .groupBy(pageVisits.userId);

  return new Map(
    latestVisits
      .filter((visit) => visit.visitedAt instanceof Date)
      .map((visit) => [visit.userId, visit.visitedAt]),
  );
}

async function getNotificationCountMap(userIds: string[]) {
  if (userIds.length === 0) {
    return new Map<string, { total: number; unread: number }>();
  }

  const [totals, unread] = await Promise.all([
    getDb()
      .select({
        userId: notifications.userId,
        value: count(),
      })
      .from(notifications)
      .where(inArray(notifications.userId, userIds))
      .groupBy(notifications.userId),
    getDb()
      .select({
        userId: notifications.userId,
        value: count(),
      })
      .from(notifications)
      .where(and(inArray(notifications.userId, userIds), eq(notifications.status, 'unread')))
      .groupBy(notifications.userId),
  ]);

  const counts = new Map<string, { total: number; unread: number }>();

  for (const item of totals) {
    counts.set(item.userId, { total: item.value, unread: 0 });
  }

  for (const item of unread) {
    const current = counts.get(item.userId) ?? { total: 0, unread: 0 };
    counts.set(item.userId, { ...current, unread: item.value });
  }

  return counts;
}

function mapNotificationFeedItem(item: {
  id: string;
  title: string;
  body: string;
  href: string | null;
  status: NotificationStatus;
  createdAt: Date;
}): NotificationFeedItem {
  return {
    id: item.id,
    title: item.title,
    body: item.body,
    href: item.href,
    status: item.status,
    createdAt: item.createdAt.toISOString(),
  };
}

export async function getNotificationPreviewUseCase(userId: string, limit = 3): Promise<NotificationPreview> {
  const [items, unreadCountResult] = await Promise.all([
    getDb().query.notifications.findMany({
      where: (table, { eq: innerEq }) => innerEq(table.userId, userId),
      orderBy: (table, { desc: innerDesc }) => [innerDesc(table.createdAt)],
      limit,
    }),
    getDb()
      .select({ value: count() })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.status, 'unread'))),
  ]);

  return {
    unreadCount: unreadCountResult[0]?.value ?? 0,
    items: items.map(mapNotificationFeedItem),
  };
}

export async function getNotificationsPageDataUseCase(userId: string): Promise<NotificationsPageData> {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [preview, todayCountResult] = await Promise.all([
    getNotificationPreviewUseCase(userId, 20),
    getDb()
      .select({ value: count() })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), gte(notifications.createdAt, startOfToday))),
  ]);

  return {
    ...preview,
    todayCount: todayCountResult[0]?.value ?? 0,
  };
}

export async function markAllNotificationsReadUseCase(userId: string) {
  await getDb()
    .update(notifications)
    .set({
      status: 'read',
      readAt: new Date(),
    })
    .where(and(eq(notifications.userId, userId), eq(notifications.status, 'unread')));

  return success({ updated: true });
}

export async function markNotificationReadUseCase(
  userId: string,
  notificationId: string,
): Promise<ServiceResult<{ updated: boolean }, NotificationError>> {
  const updatedNotifications = await getDb()
    .update(notifications)
    .set({
      status: 'read',
      readAt: new Date(),
    })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId), eq(notifications.status, 'unread')))
    .returning({ id: notifications.id });

  if (updatedNotifications.length > 0) {
    return success({ updated: true });
  }

  const existingNotification = await getDb().query.notifications.findFirst({
    where: (table, { and: innerAnd, eq: innerEq }) =>
      innerAnd(innerEq(table.id, notificationId), innerEq(table.userId, userId)),
    columns: {
      id: true,
    },
  });

  if (!existingNotification) {
    return failure({
      code: 'NOT_FOUND',
      message: 'Notification not found.',
    });
  }

  return success({ updated: false });
}

export async function getAdminUsersPageDataUseCase(): Promise<AdminUsersPageData> {
  const userRecords = await getDb().query.users.findMany({
    orderBy: (table, { desc: innerDesc }) => [innerDesc(table.createdAt)],
  });
  const userIds = userRecords.map((user) => user.id);
  const [latestVisitMap, notificationCountMap] = await Promise.all([
    getLatestVisitMap(userIds),
    getNotificationCountMap(userIds),
  ]);

  const rows = userRecords
    .map<AdminUserListItem>((user) => {
      const counts = notificationCountMap.get(user.id) ?? { total: 0, unread: 0 };

      return {
        id: user.id,
        displayName: resolveDisplayName(user),
        email: user.email ?? 'No email',
        role: user.role,
        status: resolveUserStatus(user),
        createdAt: user.createdAt.toISOString(),
        lastActivityAt: toIsoString(latestVisitMap.get(user.id)),
        totalNotifications: counts.total,
        unreadNotifications: counts.unread,
      };
    })
    .sort((left, right) => {
      const leftActivity = left.lastActivityAt ? new Date(left.lastActivityAt).getTime() : 0;
      const rightActivity = right.lastActivityAt ? new Date(right.lastActivityAt).getTime() : 0;
      return rightActivity - leftActivity || left.displayName.localeCompare(right.displayName);
    });

  return {
    metrics: {
      privileged: rows.filter((user) => user.role === 'ADMIN' || user.role === 'SUPERADMIN').length,
      operational: rows.filter((user) => user.role === 'MANAGER').length,
      member: rows.filter((user) => user.role === 'USER').length,
    },
    users: rows,
  };
}

export async function getAdminUserDetailUseCase(userId: string): Promise<AdminUserDetail | null> {
  const [user, profile, followerCountResult, visitCountResult, lastActivityResult, notificationCounts, recentActivity, recentNotifications] =
    await Promise.all([
      getDb().query.users.findFirst({
        where: (table, { eq: innerEq }) => innerEq(table.id, userId),
      }),
      getDb().query.profiles.findFirst({
        where: (table, { eq: innerEq }) => innerEq(table.userId, userId),
      }),
      getDb().select({ value: count() }).from(userFollows).where(eq(userFollows.followingId, userId)),
      getDb().select({ value: count() }).from(pageVisits).where(eq(pageVisits.userId, userId)),
      getDb()
        .select({ value: sql<Date>`max(${pageVisits.visitedAt})` })
        .from(pageVisits)
        .where(eq(pageVisits.userId, userId)),
      getNotificationCountMap([userId]),
      getDb().query.pageVisits.findMany({
        where: (table, { eq: innerEq }) => innerEq(table.userId, userId),
        orderBy: (table, { desc: innerDesc }) => [innerDesc(table.visitedAt)],
        limit: 6,
      }),
      getDb().query.notifications.findMany({
        where: (table, { eq: innerEq }) => innerEq(table.userId, userId),
        orderBy: (table, { desc: innerDesc }) => [innerDesc(table.createdAt)],
        limit: 8,
      }),
    ]);

  if (!user) {
    return null;
  }

  const notificationSummary = notificationCounts.get(userId) ?? { total: 0, unread: 0 };

  return {
    id: user.id,
    displayName: resolveDisplayName(user),
    email: user.email ?? 'No email',
    role: user.role,
    status: resolveUserStatus(user),
    imageUrl: buildProfileImageUrl(user.image) ?? null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    emailVerifiedAt: toIsoString(user.emailVerified),
    lockoutUntil: toIsoString(user.lockoutUntil),
    timezone: profile?.timezone ?? null,
    locale: profile?.locale ?? null,
    bio: profile?.bio ?? null,
    followerCount: followerCountResult[0]?.value ?? 0,
    visitCount: visitCountResult[0]?.value ?? 0,
    totalNotifications: notificationSummary.total,
    unreadNotifications: notificationSummary.unread,
    lastActivityAt: toIsoString(lastActivityResult[0]?.value ?? null),
    recentActivity: recentActivity.map((item) => ({
      id: item.id,
      pathname: item.pathname,
      href: item.href,
      visitedAt: item.visitedAt.toISOString(),
    })),
    recentNotifications: recentNotifications.map(mapNotificationFeedItem),
  };
}

async function resolveTargetUserIds(input: SendAdminNotificationInput): Promise<string[]> {
  if (input.audience === 'user') {
    if (!input.targetUserId) {
      return [];
    }

    const targetUserId = input.targetUserId;
    const user = await getDb().query.users.findFirst({
      where: (table, { eq: innerEq }) => innerEq(table.id, targetUserId),
    });

    return user ? [user.id] : [];
  }

  if (input.audience === 'role') {
    if (!input.targetRole || input.targetRole === 'ALL') {
      return [];
    }

    const targetRole = input.targetRole;
    const roleRecipients = await getDb().query.users.findMany({
      where: (table, { eq: innerEq }) => innerEq(table.role, targetRole),
      columns: { id: true },
    });

    return roleRecipients.map((user) => user.id);
  }

  const allRecipients = await getDb().query.users.findMany({
    columns: { id: true },
  });

  return allRecipients.map((user) => user.id);
}

function validateNotificationInput(input: SendAdminNotificationInput): NotificationError | null {
  const title = input.title.trim();
  const body = input.body.trim();
  const href = input.href?.trim();

  if (title.length < 3 || title.length > 120) {
    return {
      code: 'VALIDATION_ERROR',
      message: 'Notification titles must be between 3 and 120 characters.',
    };
  }

  if (body.length < 5 || body.length > 500) {
    return {
      code: 'VALIDATION_ERROR',
      message: 'Notification messages must be between 5 and 500 characters.',
    };
  }

  if (href && !href.startsWith('/')) {
    return {
      code: 'VALIDATION_ERROR',
      message: 'Notification links must start with "/".',
    };
  }

  if (input.audience === 'user' && !input.targetUserId) {
    return {
      code: 'VALIDATION_ERROR',
      message: 'Choose a user to notify.',
    };
  }

  if (input.audience === 'role' && (!input.targetRole || input.targetRole === 'ALL')) {
    return {
      code: 'VALIDATION_ERROR',
      message: 'Choose a role group to notify.',
    };
  }

  return null;
}

export async function sendAdminNotificationUseCase(
  actorUserId: string,
  input: SendAdminNotificationInput,
): Promise<ServiceResult<{ recipientCount: number }, NotificationError>> {
  const validationError = validateNotificationInput(input);

  if (validationError) {
    return failure(validationError);
  }

  const targetUserIds = [...new Set(await resolveTargetUserIds(input))];

  if (targetUserIds.length === 0) {
    return failure({
      code: 'NOT_FOUND',
      message: 'No matching recipients were found.',
    });
  }

  const now = new Date();
  const title = input.title.trim();
  const body = input.body.trim();
  const href = input.href?.trim() || null;
  const audienceValue =
    input.audience === 'user' ? input.targetUserId ?? null : input.audience === 'role' ? input.targetRole ?? null : 'ALL';

  await getDb().insert(notifications).values(
    targetUserIds.map((userId) => ({
      id: crypto.randomUUID(),
      userId,
      actorId: actorUserId,
      title,
      body,
      href,
      audience: input.audience,
      audienceValue,
      createdAt: now,
    })),
  );

  return success({
    recipientCount: targetUserIds.length,
  });
}
