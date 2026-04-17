CREATE TABLE "UserBlock" (
	"blockerId" text NOT NULL,
	"blockedId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "UserBlock_pkey" PRIMARY KEY("blockerId","blockedId")
);
--> statement-breakpoint
ALTER TABLE "UserBlock" ADD CONSTRAINT "UserBlock_blockerId_User_id_fk" FOREIGN KEY ("blockerId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "UserBlock" ADD CONSTRAINT "UserBlock_blockedId_User_id_fk" FOREIGN KEY ("blockedId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "UserBlock_blockerId_idx" ON "UserBlock" USING btree ("blockerId");--> statement-breakpoint
CREATE INDEX "UserBlock_blockedId_idx" ON "UserBlock" USING btree ("blockedId");