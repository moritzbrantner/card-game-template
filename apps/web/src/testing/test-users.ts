import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";

import { hashPassword } from "@/lib/password";
import { classifyNavigationPathname } from "@/src/analytics/navigation-classification";
import { getDb } from "@/src/db/client";
import { notifications, pageVisits, profiles, userFollows, users } from "@/src/db/schema";
import type { FollowerVisibilityRole } from "@/src/profile/follower-visibility";

type TestUserSeed = {
  email: string;
  tag: string;
  password: string;
  name: string;
  role: "SUPERADMIN" | "ADMIN" | "MANAGER" | "USER";
  isSearchable: boolean;
  followerVisibility: FollowerVisibilityRole;
  emailVerified: boolean;
  profile: {
    bio: string;
    locale: string;
    timezone: string;
  };
};

type TestUserFollowSeed = {
  followerEmail: string;
  followingEmail: string;
};

type TestUserNotificationSeed = {
  id: string;
  userEmail: string;
  actorEmail?: string;
  title: string;
  body: string;
  href?: string;
  status: "unread" | "read";
  minutesAgo: number;
  readMinutesAgo?: number;
};

type TestUserPageVisitSeed = {
  id: string;
  userEmail: string;
  href: string;
  pathname: string;
  minutesAgo: number;
};

export const TEST_USERS: readonly TestUserSeed[] = [
  {
    email: "superadmin@example.com",
    tag: "test-superadmin",
    password: "superadmin",
    name: "Test Superadmin",
    role: "SUPERADMIN",
    isSearchable: false,
    followerVisibility: "PRIVATE",
    emailVerified: true,
    profile: {
      bio: "Owns privileged workspace access and can assign or revoke elevated roles.",
      locale: "en",
      timezone: "Europe/Berlin",
    },
  },
  {
    email: "admin@example.com",
    tag: "test-admin",
    password: "admin",
    name: "Test Admin",
    role: "ADMIN",
    isSearchable: false,
    followerVisibility: "PRIVATE",
    emailVerified: true,
    profile: {
      bio: "Keeps the shared test environment organized and can send admin notifications.",
      locale: "en",
      timezone: "Europe/Berlin",
    },
  },
  {
    email: "manager@example.com",
    tag: "test-manager",
    password: "manager",
    name: "Test Manager",
    role: "MANAGER",
    isSearchable: false,
    followerVisibility: "MEMBERS",
    emailVerified: true,
    profile: {
      bio: "Reviews operational workflows and keeps an eye on user activity.",
      locale: "en",
      timezone: "Europe/London",
    },
  },
  {
    email: "user@example.com",
    tag: "test-user",
    password: "user",
    name: "Test User",
    role: "USER",
    isSearchable: true,
    followerVisibility: "PUBLIC",
    emailVerified: true,
    profile: {
      bio: "Primary member account for following, notifications, and profile workflows.",
      locale: "en",
      timezone: "America/New_York",
    },
  },
  {
    email: "alice@example.com",
    tag: "alice",
    password: "alice",
    name: "Alice Archer",
    role: "USER",
    isSearchable: true,
    followerVisibility: "PUBLIC",
    emailVerified: true,
    profile: {
      bio: "Publishes updates often and is useful as a baseline follow target.",
      locale: "en",
      timezone: "America/Chicago",
    },
  },
  {
    email: "bob@example.com",
    tag: "bob",
    password: "bob",
    name: "Bob Baker",
    role: "USER",
    isSearchable: true,
    followerVisibility: "MEMBERS",
    emailVerified: true,
    profile: {
      bio: "Another discoverable member account for testing follow and unfollow flows.",
      locale: "en",
      timezone: "America/Los_Angeles",
    },
  },
  {
    email: "casey@example.com",
    tag: "casey",
    password: "casey",
    name: "Casey Carter",
    role: "USER",
    isSearchable: true,
    followerVisibility: "PUBLIC",
    emailVerified: true,
    profile: {
      bio: "Shows up in the people directory search so you can test new follow actions.",
      locale: "en",
      timezone: "Europe/Paris",
    },
  },
  {
    email: "dana@example.com",
    tag: "dana",
    password: "dana",
    name: "Dana Diaz",
    role: "USER",
    isSearchable: true,
    followerVisibility: "PUBLIC",
    emailVerified: true,
    profile: {
      bio: "Receives and sends notifications in the seeded social graph.",
      locale: "en",
      timezone: "America/Toronto",
    },
  },
  {
    email: "private@example.com",
    tag: "hidden-member",
    password: "private",
    name: "Private Member",
    role: "USER",
    isSearchable: false,
    followerVisibility: "PRIVATE",
    emailVerified: true,
    profile: {
      bio: "Hidden from people search but still part of the follower graph.",
      locale: "en",
      timezone: "Europe/Vienna",
    },
  },
] as const;

export const TEST_USER_FOLLOWS: readonly TestUserFollowSeed[] = [
  { followerEmail: "user@example.com", followingEmail: "alice@example.com" },
  { followerEmail: "user@example.com", followingEmail: "bob@example.com" },
  { followerEmail: "alice@example.com", followingEmail: "user@example.com" },
  { followerEmail: "alice@example.com", followingEmail: "casey@example.com" },
  { followerEmail: "bob@example.com", followingEmail: "user@example.com" },
  { followerEmail: "casey@example.com", followingEmail: "user@example.com" },
  { followerEmail: "casey@example.com", followingEmail: "alice@example.com" },
  { followerEmail: "dana@example.com", followingEmail: "user@example.com" },
  { followerEmail: "manager@example.com", followingEmail: "user@example.com" },
  { followerEmail: "private@example.com", followingEmail: "user@example.com" },
] as const;

export const TEST_USER_NOTIFICATIONS: readonly TestUserNotificationSeed[] = [
  {
    id: "seed-notification-user-admin-welcome",
    userEmail: "user@example.com",
    actorEmail: "admin@example.com",
    title: "Admin welcome for the social test graph",
    body: "Use the people directory to follow more members or open settings to review notification preferences.",
    href: "/settings",
    status: "unread",
    minutesAgo: 15,
  },
  {
    id: "seed-notification-user-alice-post",
    userEmail: "user@example.com",
    actorEmail: "alice@example.com",
    title: "Alice Archer published a new blog post",
    body: "Baseline seeded activity for checking read and unread notification states.",
    href: "/profile/@alice",
    status: "read",
    minutesAgo: 180,
    readMinutesAgo: 120,
  },
  {
    id: "seed-notification-alice-manager-note",
    userEmail: "alice@example.com",
    actorEmail: "manager@example.com",
    title: "Manager review request",
    body: "Alice has an unread manager notification for admin and feed testing.",
    href: "/notifications",
    status: "unread",
    minutesAgo: 30,
  },
  {
    id: "seed-notification-dana-admin-note",
    userEmail: "dana@example.com",
    actorEmail: "admin@example.com",
    title: "Dana received an operational check-in",
    body: "This gives a second member account seeded notification history.",
    href: "/profile",
    status: "read",
    minutesAgo: 240,
    readMinutesAgo: 210,
  },
] as const;

const TEST_USER_PAGE_VISITS: readonly TestUserPageVisitSeed[] = [
  {
    id: "seed-page-visit-admin-users",
    userEmail: "superadmin@example.com",
    href: "/en/admin/users",
    pathname: "/en/admin/users",
    minutesAgo: 4,
  },
  {
    id: "seed-page-visit-manager-settings",
    userEmail: "manager@example.com",
    href: "/en/settings",
    pathname: "/en/settings",
    minutesAgo: 12,
  },
  {
    id: "seed-page-visit-user-people",
    userEmail: "user@example.com",
    href: "/en/people",
    pathname: "/en/people",
    minutesAgo: 6,
  },
  {
    id: "seed-page-visit-user-notifications",
    userEmail: "user@example.com",
    href: "/en/notifications",
    pathname: "/en/notifications",
    minutesAgo: 14,
  },
  {
    id: "seed-page-visit-alice-profile",
    userEmail: "alice@example.com",
    href: "/en/profile",
    pathname: "/en/profile",
    minutesAgo: 22,
  },
  {
    id: "seed-page-visit-bob-profile",
    userEmail: "bob@example.com",
    href: "/en/profile",
    pathname: "/en/profile",
    minutesAgo: 28,
  },
  {
    id: "seed-page-visit-casey-people",
    userEmail: "casey@example.com",
    href: "/en/people",
    pathname: "/en/people",
    minutesAgo: 10,
  },
  {
    id: "seed-page-visit-dana-notifications",
    userEmail: "dana@example.com",
    href: "/en/notifications",
    pathname: "/en/notifications",
    minutesAgo: 18,
  },
] as const;

function toSeedDate(minutesAgo: number) {
  return new Date(Date.now() - minutesAgo * 60_000);
}

function getRequiredUserId(userIdByEmail: Map<string, string>, email: string) {
  const userId = userIdByEmail.get(email);

  if (!userId) {
    throw new Error(`Missing seeded test user for ${email}`);
  }

  return userId;
}

export async function seedTestUsers() {
  const db = getDb();

  await db.execute('ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordHash" text');

  const userIdByEmail = new Map<string, string>();

  for (const testUser of TEST_USERS) {
    const passwordHash = await hashPassword(testUser.password);
    const emailVerifiedAt = testUser.emailVerified ? toSeedDate(7 * 24 * 60) : null;

    const existingUser = await db.query.users.findFirst({
      where: (table, { eq: equals }) => equals(table.email, testUser.email),
    });

    if (existingUser) {
      await db
        .update(users)
        .set({
          tag: testUser.tag,
          name: testUser.name,
          role: testUser.role,
          isSearchable: testUser.isSearchable,
          followerVisibility: testUser.followerVisibility,
          emailVerified: emailVerifiedAt,
          passwordHash,
          failedSignInAttempts: 0,
          lockoutUntil: null,
          updatedAt: new Date(),
        })
        .where(eq(users.id, existingUser.id));
      userIdByEmail.set(testUser.email, existingUser.id);
      continue;
    }

    const userId = randomUUID();

    await db.insert(users).values({
      id: userId,
      email: testUser.email,
      tag: testUser.tag,
      name: testUser.name,
      role: testUser.role,
      isSearchable: testUser.isSearchable,
      followerVisibility: testUser.followerVisibility,
      emailVerified: emailVerifiedAt,
      passwordHash,
      failedSignInAttempts: 0,
      lockoutUntil: null,
    });

    userIdByEmail.set(testUser.email, userId);
  }

  for (const testUser of TEST_USERS) {
    const userId = getRequiredUserId(userIdByEmail, testUser.email);
    const existingProfile = await db.query.profiles.findFirst({
      where: (table, { eq: equals }) => equals(table.userId, userId),
    });

    if (existingProfile) {
      await db
        .update(profiles)
        .set({
          bio: testUser.profile.bio,
          locale: testUser.profile.locale,
          timezone: testUser.profile.timezone,
          updatedAt: new Date(),
        })
        .where(eq(profiles.id, existingProfile.id));
      continue;
    }

    await db.insert(profiles).values({
      id: `seed-profile-${testUser.tag}`,
      userId,
      bio: testUser.profile.bio,
      locale: testUser.profile.locale,
      timezone: testUser.profile.timezone,
    });
  }

  for (const relation of TEST_USER_FOLLOWS) {
    const followerId = getRequiredUserId(userIdByEmail, relation.followerEmail);
    const followingId = getRequiredUserId(userIdByEmail, relation.followingEmail);

    if (followerId === followingId) {
      continue;
    }

    await db
      .insert(userFollows)
      .values({
        followerId,
        followingId,
        createdAt: toSeedDate(60),
      })
      .onConflictDoNothing();
  }

  for (const seedNotification of TEST_USER_NOTIFICATIONS) {
    const userId = getRequiredUserId(userIdByEmail, seedNotification.userEmail);
    const actorId = seedNotification.actorEmail
      ? getRequiredUserId(userIdByEmail, seedNotification.actorEmail)
      : null;
    const createdAt = toSeedDate(seedNotification.minutesAgo);
    const readAt =
      seedNotification.status === "read" && typeof seedNotification.readMinutesAgo === "number"
        ? toSeedDate(seedNotification.readMinutesAgo)
        : null;
    const existingNotification = await db.query.notifications.findFirst({
      where: (table, { eq: equals }) => equals(table.id, seedNotification.id),
    });

    if (existingNotification) {
      await db
        .update(notifications)
        .set({
          userId,
          actorId,
          title: seedNotification.title,
          body: seedNotification.body,
          href: seedNotification.href ?? null,
          status: seedNotification.status,
          audience: "user",
          audienceValue: userId,
          readAt,
          createdAt,
        })
        .where(eq(notifications.id, seedNotification.id));
      continue;
    }

    await db.insert(notifications).values({
      id: seedNotification.id,
      userId,
      actorId,
      title: seedNotification.title,
      body: seedNotification.body,
      href: seedNotification.href ?? null,
      status: seedNotification.status,
      audience: "user",
      audienceValue: userId,
      readAt,
      createdAt,
    });
  }

  for (const seedPageVisit of TEST_USER_PAGE_VISITS) {
    const userId = getRequiredUserId(userIdByEmail, seedPageVisit.userEmail);
    const visitedAt = toSeedDate(seedPageVisit.minutesAgo);
    const classification = classifyNavigationPathname(seedPageVisit.pathname);
    const existingPageVisit = await db.query.pageVisits.findFirst({
      where: (table, { eq: equals }) => equals(table.id, seedPageVisit.id),
    });

    if (existingPageVisit) {
      await db
        .update(pageVisits)
        .set({
          userId,
          trackingVersion: 2,
          visitorId: `seed-visitor:${userId}`,
          sessionId: `seed-session:${seedPageVisit.id}`,
          href: seedPageVisit.href,
          pathname: seedPageVisit.pathname,
          canonicalPath: classification.canonicalPath,
          routeGroup: classification.routeGroup,
          isAuthenticated: true,
          previousPathname: null,
          previousCanonicalPath: null,
          referrerType: "direct",
          referrerHost: null,
          visitedAt,
        })
        .where(eq(pageVisits.id, seedPageVisit.id));
      continue;
    }

    await db.insert(pageVisits).values({
      id: seedPageVisit.id,
      userId,
      trackingVersion: 2,
      visitorId: `seed-visitor:${userId}`,
      sessionId: `seed-session:${seedPageVisit.id}`,
      href: seedPageVisit.href,
      pathname: seedPageVisit.pathname,
      canonicalPath: classification.canonicalPath,
      routeGroup: classification.routeGroup,
      isAuthenticated: true,
      previousPathname: null,
      previousCanonicalPath: null,
      referrerType: "direct",
      referrerHost: null,
      visitedAt,
    });
  }
}
