CREATE TABLE "BlogPost" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "BlogPost" ADD CONSTRAINT "BlogPost_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "BlogPost_userId_createdAt_idx" ON "BlogPost" USING btree ("userId","createdAt");--> statement-breakpoint
CREATE INDEX "BlogPost_userId_updatedAt_idx" ON "BlogPost" USING btree ("userId","updatedAt");