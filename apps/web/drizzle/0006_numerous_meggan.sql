CREATE TABLE "NewsletterSubscription" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"locale" text DEFAULT 'en' NOT NULL,
	"source" text DEFAULT 'communication-page' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "NewsletterSubscription_email_key" ON "NewsletterSubscription" USING btree ("email");--> statement-breakpoint
CREATE INDEX "NewsletterSubscription_locale_idx" ON "NewsletterSubscription" USING btree ("locale");