ALTER TABLE "BlogPost" ADD COLUMN "clientRequestId" text;--> statement-breakpoint
UPDATE "BlogPost" SET "clientRequestId" = "id" WHERE "clientRequestId" IS NULL;--> statement-breakpoint
ALTER TABLE "BlogPost" ALTER COLUMN "clientRequestId" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "BlogPost_userId_clientRequestId_key" ON "BlogPost" USING btree ("userId","clientRequestId");
