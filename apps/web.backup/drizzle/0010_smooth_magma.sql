ALTER TABLE "User" ADD COLUMN "isSearchable" boolean DEFAULT true NOT NULL;--> statement-breakpoint
CREATE INDEX "User_isSearchable_idx" ON "User" USING btree ("isSearchable");