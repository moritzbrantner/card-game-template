ALTER TABLE "User" ADD COLUMN "tag" text;--> statement-breakpoint
UPDATE "User"
SET "tag" = CONCAT('u', lower(replace("id", '-', '')))
WHERE "tag" IS NULL;--> statement-breakpoint
ALTER TABLE "User" ALTER COLUMN "tag" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "User_tag_key" ON "User" USING btree ("tag");--> statement-breakpoint
CREATE INDEX "User_tag_idx" ON "User" USING btree ("tag");
