CREATE TABLE "UserFeatureOverride" (
	"userId" text NOT NULL,
	"featureKey" text NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "UserFeatureOverride_pkey" PRIMARY KEY("userId","featureKey")
);
--> statement-breakpoint
ALTER TABLE "UserFeatureOverride" ADD CONSTRAINT "UserFeatureOverride_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "UserFeatureOverride_userId_idx" ON "UserFeatureOverride" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "UserFeatureOverride_featureKey_idx" ON "UserFeatureOverride" USING btree ("featureKey");