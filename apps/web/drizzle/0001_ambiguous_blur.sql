ALTER TABLE "User" ADD COLUMN "passwordHash" text;--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "failedSignInAttempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "lockoutUntil" timestamp;