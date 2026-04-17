CREATE TABLE "UserFollow" (
	"followerId" text NOT NULL,
	"followingId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "UserFollow_pkey" PRIMARY KEY("followerId","followingId")
);
--> statement-breakpoint
ALTER TABLE "UserFollow" ADD CONSTRAINT "UserFollow_followerId_User_id_fk" FOREIGN KEY ("followerId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "UserFollow" ADD CONSTRAINT "UserFollow_followingId_User_id_fk" FOREIGN KEY ("followingId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "UserFollow_followerId_idx" ON "UserFollow" USING btree ("followerId");--> statement-breakpoint
CREATE INDEX "UserFollow_followingId_idx" ON "UserFollow" USING btree ("followingId");