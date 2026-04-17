ALTER TABLE "PageVisit" DROP CONSTRAINT "PageVisit_userId_User_id_fk";
--> statement-breakpoint
ALTER TABLE "PageVisit" ALTER COLUMN "userId" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "PageVisit" ADD COLUMN "trackingVersion" integer DEFAULT 2 NOT NULL;--> statement-breakpoint
ALTER TABLE "PageVisit" ADD COLUMN "visitorId" text;--> statement-breakpoint
ALTER TABLE "PageVisit" ADD COLUMN "sessionId" text;--> statement-breakpoint
ALTER TABLE "PageVisit" ADD COLUMN "canonicalPath" text;--> statement-breakpoint
ALTER TABLE "PageVisit" ADD COLUMN "routeGroup" text;--> statement-breakpoint
ALTER TABLE "PageVisit" ADD COLUMN "isAuthenticated" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "PageVisit" ADD COLUMN "previousPathname" text;--> statement-breakpoint
ALTER TABLE "PageVisit" ADD COLUMN "previousCanonicalPath" text;--> statement-breakpoint
ALTER TABLE "PageVisit" ADD COLUMN "referrerType" text DEFAULT 'direct' NOT NULL;--> statement-breakpoint
ALTER TABLE "PageVisit" ADD COLUMN "referrerHost" text;--> statement-breakpoint
WITH "normalized_paths" AS (
  SELECT
    "id",
    CASE
      WHEN regexp_replace(regexp_replace(split_part("pathname", '?', 1), '^/(en|de)(?=/|$)', ''), '/+$', '') = '' THEN '/'
      ELSE regexp_replace(regexp_replace(split_part("pathname", '?', 1), '^/(en|de)(?=/|$)', ''), '/+$', '')
    END AS "canonicalPath"
  FROM "PageVisit"
)
UPDATE "PageVisit" AS "visit"
SET
  "trackingVersion" = 1,
  "visitorId" = 'legacy:' || COALESCE("visit"."userId", "visit"."id"),
  "sessionId" = 'legacy:' || "visit"."id",
  "canonicalPath" = "normalized_paths"."canonicalPath",
  "routeGroup" = CASE
    WHEN "normalized_paths"."canonicalPath" IN ('/login', '/register', '/verify-email', '/reset-password') THEN 'guest'
    WHEN "normalized_paths"."canonicalPath" IN ('/people', '/notifications', '/profile', '/profile/blog', '/settings') THEN 'authenticated'
    WHEN "normalized_paths"."canonicalPath" = '/data-entry' THEN 'workspace'
    WHEN "normalized_paths"."canonicalPath" = '/admin' OR "normalized_paths"."canonicalPath" LIKE '/admin/%' THEN 'admin'
    ELSE 'public'
  END,
  "isAuthenticated" = "visit"."userId" IS NOT NULL,
  "referrerType" = 'direct'
FROM "normalized_paths"
WHERE "visit"."id" = "normalized_paths"."id";--> statement-breakpoint
ALTER TABLE "PageVisit" ALTER COLUMN "visitorId" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "PageVisit" ALTER COLUMN "sessionId" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "PageVisit" ALTER COLUMN "canonicalPath" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "PageVisit" ALTER COLUMN "routeGroup" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "PageVisit" ADD CONSTRAINT "PageVisit_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "PageVisit_sessionId_visitedAt_idx" ON "PageVisit" USING btree ("sessionId","visitedAt");--> statement-breakpoint
CREATE INDEX "PageVisit_visitorId_visitedAt_idx" ON "PageVisit" USING btree ("visitorId","visitedAt");--> statement-breakpoint
CREATE INDEX "PageVisit_canonicalPath_visitedAt_idx" ON "PageVisit" USING btree ("canonicalPath","visitedAt");--> statement-breakpoint
CREATE INDEX "PageVisit_previousCanonicalPath_visitedAt_idx" ON "PageVisit" USING btree ("previousCanonicalPath","visitedAt");--> statement-breakpoint
CREATE INDEX "PageVisit_routeGroup_visitedAt_idx" ON "PageVisit" USING btree ("routeGroup","visitedAt");--> statement-breakpoint
CREATE INDEX "PageVisit_isAuthenticated_visitedAt_idx" ON "PageVisit" USING btree ("isAuthenticated","visitedAt");
