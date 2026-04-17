CREATE TABLE "PageVisitQueryParameter" (
	"id" text PRIMARY KEY NOT NULL,
	"pageVisitId" text NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"position" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "PageVisit" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"href" text NOT NULL,
	"pathname" text NOT NULL,
	"visitedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "PageVisitQueryParameter" ADD CONSTRAINT "PageVisitQueryParameter_pageVisitId_PageVisit_id_fk" FOREIGN KEY ("pageVisitId") REFERENCES "public"."PageVisit"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "PageVisit" ADD CONSTRAINT "PageVisit_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "PageVisitQueryParameter_pageVisitId_idx" ON "PageVisitQueryParameter" USING btree ("pageVisitId");--> statement-breakpoint
CREATE INDEX "PageVisitQueryParameter_key_idx" ON "PageVisitQueryParameter" USING btree ("key");--> statement-breakpoint
CREATE INDEX "PageVisitQueryParameter_key_value_idx" ON "PageVisitQueryParameter" USING btree ("key","value");--> statement-breakpoint
CREATE INDEX "PageVisit_userId_visitedAt_idx" ON "PageVisit" USING btree ("userId","visitedAt");--> statement-breakpoint
CREATE INDEX "PageVisit_pathname_idx" ON "PageVisit" USING btree ("pathname");--> statement-breakpoint
CREATE INDEX "PageVisit_visitedAt_idx" ON "PageVisit" USING btree ("visitedAt");