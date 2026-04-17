CREATE TYPE "public"."FollowerVisibility" AS ENUM('PUBLIC', 'MEMBERS', 'PRIVATE');--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "followerVisibility" "FollowerVisibility" DEFAULT 'PUBLIC' NOT NULL;--> statement-breakpoint
CREATE INDEX "User_followerVisibility_idx" ON "User" USING btree ("followerVisibility");