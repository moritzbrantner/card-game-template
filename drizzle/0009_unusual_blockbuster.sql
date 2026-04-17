CREATE TYPE "public"."JobOutboxStatus" AS ENUM('pending', 'running', 'retrying', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."SiteAnnouncementStatus" AS ENUM('draft', 'scheduled', 'published', 'archived');--> statement-breakpoint
CREATE TABLE "FeatureFlag" (
	"key" text PRIMARY KEY NOT NULL,
	"enabled" integer DEFAULT 0 NOT NULL,
	"description" text,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "JobOutbox" (
	"id" text PRIMARY KEY NOT NULL,
	"jobName" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" "JobOutboxStatus" DEFAULT 'pending' NOT NULL,
	"runAt" timestamp DEFAULT now() NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"lastError" text,
	"lockedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "SiteAnnouncement" (
	"id" text PRIMARY KEY NOT NULL,
	"locale" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"href" text,
	"status" "SiteAnnouncementStatus" DEFAULT 'draft' NOT NULL,
	"publishAt" timestamp,
	"unpublishAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "SiteSetting" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "FeatureFlag_enabled_idx" ON "FeatureFlag" USING btree ("enabled");--> statement-breakpoint
CREATE INDEX "JobOutbox_status_runAt_idx" ON "JobOutbox" USING btree ("status","runAt");--> statement-breakpoint
CREATE INDEX "JobOutbox_jobName_idx" ON "JobOutbox" USING btree ("jobName");--> statement-breakpoint
CREATE INDEX "SiteAnnouncement_locale_status_idx" ON "SiteAnnouncement" USING btree ("locale","status");--> statement-breakpoint
CREATE INDEX "SiteAnnouncement_publishAt_idx" ON "SiteAnnouncement" USING btree ("publishAt");