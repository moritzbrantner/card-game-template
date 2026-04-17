CREATE TYPE "public"."NotificationAudience" AS ENUM('user', 'role', 'all');--> statement-breakpoint
CREATE TYPE "public"."NotificationStatus" AS ENUM('unread', 'read');--> statement-breakpoint
CREATE TABLE "Notification" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"actorId" text,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"href" text,
	"status" "NotificationStatus" DEFAULT 'unread' NOT NULL,
	"audience" "NotificationAudience" DEFAULT 'user' NOT NULL,
	"audienceValue" text,
	"readAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_actorId_User_id_fk" FOREIGN KEY ("actorId") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification" USING btree ("userId","createdAt");--> statement-breakpoint
CREATE INDEX "Notification_userId_status_idx" ON "Notification" USING btree ("userId","status");--> statement-breakpoint
CREATE INDEX "Notification_actorId_idx" ON "Notification" USING btree ("actorId");--> statement-breakpoint
CREATE INDEX "Notification_audience_idx" ON "Notification" USING btree ("audience","audienceValue");