
import { pgEnum, pgTable, primaryKey, text, timestamp, integer, index, uniqueIndex, jsonb, boolean } from "drizzle-orm/pg-core";

import { followerVisibilityRoles } from "@/src/social/follower-visibility";

export const roleEnum = pgEnum("Role", ["SUPERADMIN", "ADMIN", "MANAGER", "USER"]);
export const followerVisibilityEnum = pgEnum("FollowerVisibility", followerVisibilityRoles);
export const notificationStatusEnum = pgEnum("NotificationStatus", ["unread", "read"]);
export const notificationAudienceEnum = pgEnum("NotificationAudience", ["user", "role", "all"]);
export const siteAnnouncementStatusEnum = pgEnum("SiteAnnouncementStatus", ["draft", "scheduled", "published", "archived"]);
export const jobOutboxStatusEnum = pgEnum("JobOutboxStatus", ["pending", "running", "retrying", "completed", "failed"]);

export const users = pgTable(
  "User",
  {
    id: text("id").primaryKey(),
    email: text("email"),
    tag: text("tag").notNull(),
    name: text("name"),
    image: text("image"),
    emailVerified: timestamp("emailVerified", { withTimezone: false, mode: "date" }),
    role: roleEnum("role").notNull().default("USER"),
    isSearchable: boolean("isSearchable").notNull().default(true),
    followerVisibility: followerVisibilityEnum("followerVisibility").notNull().default("PUBLIC"),
    passwordHash: text("passwordHash"),
    failedSignInAttempts: integer("failedSignInAttempts").notNull().default(0),
    lockoutUntil: timestamp("lockoutUntil", { withTimezone: false, mode: "date" }),
    createdAt: timestamp("createdAt", { withTimezone: false, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: false, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("User_email_key").on(table.email),
    uniqueIndex("User_tag_key").on(table.tag),
    index("User_email_idx").on(table.email),
    index("User_tag_idx").on(table.tag),
    index("User_role_idx").on(table.role),
    index("User_isSearchable_idx").on(table.isSearchable),
    index("User_followerVisibility_idx").on(table.followerVisibility),
  ],
);

export const profiles = pgTable(
  "Profile",
  {
    id: text("id").primaryKey(),
    userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" }),
    bio: text("bio"),
    locale: text("locale"),
    timezone: text("timezone"),
    createdAt: timestamp("createdAt", { withTimezone: false, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: false, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("Profile_userId_key").on(table.userId)],
);

export const userFollows = pgTable(
  "UserFollow",
  {
    followerId: text("followerId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" }),
    followingId: text("followingId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" }),
    createdAt: timestamp("createdAt", { withTimezone: false, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.followerId, table.followingId], name: "UserFollow_pkey" }),
    index("UserFollow_followerId_idx").on(table.followerId),
    index("UserFollow_followingId_idx").on(table.followingId),
  ],
);

export const userBlocks = pgTable(
  "UserBlock",
  {
    blockerId: text("blockerId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" }),
    blockedId: text("blockedId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" }),
    createdAt: timestamp("createdAt", { withTimezone: false, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.blockerId, table.blockedId], name: "UserBlock_pkey" }),
    index("UserBlock_blockerId_idx").on(table.blockerId),
    index("UserBlock_blockedId_idx").on(table.blockedId),
  ],
);

export const blogPosts = pgTable(
  "BlogPost",
  {
    id: text("id").primaryKey(),
    userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" }),
    clientRequestId: text("clientRequestId").notNull(),
    title: text("title").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("createdAt", { withTimezone: false, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: false, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("BlogPost_userId_clientRequestId_key").on(table.userId, table.clientRequestId),
    index("BlogPost_userId_createdAt_idx").on(table.userId, table.createdAt),
    index("BlogPost_userId_updatedAt_idx").on(table.userId, table.updatedAt),
  ],
);

export const accounts = pgTable(
  "Account",
  {
    userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (table) => [
    primaryKey({ columns: [table.provider, table.providerAccountId], name: "Account_pkey" }),
    index("Account_userId_idx").on(table.userId),
  ],
);

export const sessions = pgTable(
  "Session",
  {
    sessionToken: text("sessionToken").notNull().primaryKey(),
    userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" }),
    expires: timestamp("expires", { withTimezone: false, mode: "date" }).notNull(),
  },
  (table) => [index("Session_userId_idx").on(table.userId)],
);

export const verificationTokens = pgTable(
  "VerificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { withTimezone: false, mode: "date" }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.identifier, table.token], name: "VerificationToken_pkey" }),
    uniqueIndex("VerificationToken_token_key").on(table.token),
  ],
);

export const newsletterSubscriptions = pgTable(
  "NewsletterSubscription",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    locale: text("locale").notNull().default("en"),
    source: text("source").notNull().default("communication-page"),
    createdAt: timestamp("createdAt", { withTimezone: false, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: false, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("NewsletterSubscription_email_key").on(table.email),
    index("NewsletterSubscription_locale_idx").on(table.locale),
  ],
);


export const securityRateLimitCounters = pgTable("SecurityRateLimitCounter", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  resetAt: timestamp("resetAt", { withTimezone: false, mode: "date" }).notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: false, mode: "date" }).notNull().defaultNow(),
});

export const securityAuditLogs = pgTable(
  "SecurityAuditLog",
  {
    id: text("id").primaryKey(),
    actorId: text("actorId"),
    action: text("action").notNull(),
    outcome: text("outcome").notNull(),
    statusCode: integer("statusCode").notNull(),
    metadata: jsonb("metadata").notNull().default({}),
    timestamp: timestamp("timestamp", { withTimezone: false, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [index("SecurityAuditLog_actorId_idx").on(table.actorId), index("SecurityAuditLog_action_idx").on(table.action)],
);

export const pageVisits = pgTable(
  "PageVisit",
  {
    id: text("id").primaryKey(),
    userId: text("userId")
      .references(() => users.id, { onDelete: "set null", onUpdate: "cascade" }),
    trackingVersion: integer("trackingVersion").notNull().default(2),
    visitorId: text("visitorId").notNull(),
    sessionId: text("sessionId").notNull(),
    href: text("href").notNull(),
    pathname: text("pathname").notNull(),
    canonicalPath: text("canonicalPath").notNull(),
    routeGroup: text("routeGroup").notNull(),
    isAuthenticated: boolean("isAuthenticated").notNull().default(false),
    previousPathname: text("previousPathname"),
    previousCanonicalPath: text("previousCanonicalPath"),
    referrerType: text("referrerType").notNull().default("direct"),
    referrerHost: text("referrerHost"),
    visitedAt: timestamp("visitedAt", { withTimezone: false, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("PageVisit_userId_visitedAt_idx").on(table.userId, table.visitedAt),
    index("PageVisit_sessionId_visitedAt_idx").on(table.sessionId, table.visitedAt),
    index("PageVisit_visitorId_visitedAt_idx").on(table.visitorId, table.visitedAt),
    index("PageVisit_canonicalPath_visitedAt_idx").on(table.canonicalPath, table.visitedAt),
    index("PageVisit_previousCanonicalPath_visitedAt_idx").on(table.previousCanonicalPath, table.visitedAt),
    index("PageVisit_routeGroup_visitedAt_idx").on(table.routeGroup, table.visitedAt),
    index("PageVisit_isAuthenticated_visitedAt_idx").on(table.isAuthenticated, table.visitedAt),
    index("PageVisit_pathname_idx").on(table.pathname),
    index("PageVisit_visitedAt_idx").on(table.visitedAt),
  ],
);

export const pageVisitQueryParameters = pgTable(
  "PageVisitQueryParameter",
  {
    id: text("id").primaryKey(),
    pageVisitId: text("pageVisitId")
      .notNull()
      .references(() => pageVisits.id, { onDelete: "cascade", onUpdate: "cascade" }),
    key: text("key").notNull(),
    value: text("value").notNull(),
    position: integer("position").notNull(),
  },
  (table) => [
    index("PageVisitQueryParameter_pageVisitId_idx").on(table.pageVisitId),
    index("PageVisitQueryParameter_key_idx").on(table.key),
    index("PageVisitQueryParameter_key_value_idx").on(table.key, table.value),
  ],
);

export const notifications = pgTable(
  "Notification",
  {
    id: text("id").primaryKey(),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" }),
    actorId: text("actorId").references(() => users.id, { onDelete: "set null", onUpdate: "cascade" }),
    title: text("title").notNull(),
    body: text("body").notNull(),
    href: text("href"),
    status: notificationStatusEnum("status").notNull().default("unread"),
    audience: notificationAudienceEnum("audience").notNull().default("user"),
    audienceValue: text("audienceValue"),
    readAt: timestamp("readAt", { withTimezone: false, mode: "date" }),
    createdAt: timestamp("createdAt", { withTimezone: false, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("Notification_userId_createdAt_idx").on(table.userId, table.createdAt),
    index("Notification_userId_status_idx").on(table.userId, table.status),
    index("Notification_actorId_idx").on(table.actorId),
    index("Notification_audience_idx").on(table.audience, table.audienceValue),
  ],
);

export const siteSettings = pgTable(
  "SiteSetting",
  {
    key: text("key").primaryKey(),
    value: text("value").notNull(),
    updatedAt: timestamp("updatedAt", { withTimezone: false, mode: "date" }).notNull().defaultNow(),
  },
);

export const featureFlags = pgTable(
  "FeatureFlag",
  {
    key: text("key").primaryKey(),
    enabled: integer("enabled").notNull().default(0),
    description: text("description"),
    updatedAt: timestamp("updatedAt", { withTimezone: false, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [index("FeatureFlag_enabled_idx").on(table.enabled)],
);

export const siteAnnouncements = pgTable(
  "SiteAnnouncement",
  {
    id: text("id").primaryKey(),
    locale: text("locale").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    href: text("href"),
    status: siteAnnouncementStatusEnum("status").notNull().default("draft"),
    publishAt: timestamp("publishAt", { withTimezone: false, mode: "date" }),
    unpublishAt: timestamp("unpublishAt", { withTimezone: false, mode: "date" }),
    createdAt: timestamp("createdAt", { withTimezone: false, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: false, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("SiteAnnouncement_locale_status_idx").on(table.locale, table.status),
    index("SiteAnnouncement_publishAt_idx").on(table.publishAt),
  ],
);

export const jobOutbox = pgTable(
  "JobOutbox",
  {
    id: text("id").primaryKey(),
    jobName: text("jobName").notNull(),
    payload: jsonb("payload").notNull(),
    status: jobOutboxStatusEnum("status").notNull().default("pending"),
    runAt: timestamp("runAt", { withTimezone: false, mode: "date" }).notNull().defaultNow(),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("lastError"),
    lockedAt: timestamp("lockedAt", { withTimezone: false, mode: "date" }),
    createdAt: timestamp("createdAt", { withTimezone: false, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: false, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("JobOutbox_status_runAt_idx").on(table.status, table.runAt),
    index("JobOutbox_jobName_idx").on(table.jobName),
  ],
);
