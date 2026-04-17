CREATE TABLE "SecurityAuditLog" (
	"id" text PRIMARY KEY NOT NULL,
	"actorId" text,
	"action" text NOT NULL,
	"outcome" text NOT NULL,
	"statusCode" integer NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "SecurityRateLimitCounter" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer NOT NULL,
	"resetAt" timestamp NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "SecurityAuditLog_actorId_idx" ON "SecurityAuditLog" USING btree ("actorId");--> statement-breakpoint
CREATE INDEX "SecurityAuditLog_action_idx" ON "SecurityAuditLog" USING btree ("action");