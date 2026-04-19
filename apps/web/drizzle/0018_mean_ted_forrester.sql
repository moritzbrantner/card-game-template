CREATE TABLE "game_match_moves" (
	"match_id" text NOT NULL,
	"sequence" integer NOT NULL,
	"accepted_at" timestamp NOT NULL,
	"player_id" text NOT NULL,
	"move_kind" text NOT NULL,
	"move_json" jsonb NOT NULL,
	CONSTRAINT "game_match_moves_pkey" PRIMARY KEY("match_id","sequence")
);
--> statement-breakpoint
CREATE TABLE "game_match_participants" (
	"match_id" text NOT NULL,
	"player_id" text NOT NULL,
	"seat" integer NOT NULL,
	"display_name" text NOT NULL,
	"identity_kind" text NOT NULL,
	"account_id" text,
	"guest_id" text,
	"is_bot" boolean DEFAULT false NOT NULL,
	CONSTRAINT "game_match_participants_pkey" PRIMARY KEY("match_id","player_id")
);
--> statement-breakpoint
CREATE TABLE "game_matches" (
	"id" text PRIMARY KEY NOT NULL,
	"game_id" text NOT NULL,
	"status" text NOT NULL,
	"execution_mode" text NOT NULL,
	"replay_format_version" integer NOT NULL,
	"started_at" timestamp NOT NULL,
	"finished_at" timestamp,
	"updated_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by_kind" text NOT NULL,
	"created_by_account_id" text,
	"created_by_guest_id" text,
	"initial_state_json" jsonb NOT NULL,
	"latest_state_json" jsonb NOT NULL,
	"result_json" jsonb,
	"analysis_json" jsonb,
	"last_sequence" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "game_match_moves" ADD CONSTRAINT "game_match_moves_match_id_game_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."game_matches"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "game_match_participants" ADD CONSTRAINT "game_match_participants_match_id_game_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."game_matches"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "game_match_participants" ADD CONSTRAINT "game_match_participants_account_id_User_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "game_matches" ADD CONSTRAINT "game_matches_created_by_account_id_User_id_fk" FOREIGN KEY ("created_by_account_id") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "game_match_moves_match_id_sequence_key" ON "game_match_moves" USING btree ("match_id","sequence");--> statement-breakpoint
CREATE INDEX "game_match_moves_match_id_sequence_idx" ON "game_match_moves" USING btree ("match_id","sequence");--> statement-breakpoint
CREATE UNIQUE INDEX "game_match_participants_match_id_player_id_key" ON "game_match_participants" USING btree ("match_id","player_id");--> statement-breakpoint
CREATE UNIQUE INDEX "game_match_participants_match_id_seat_key" ON "game_match_participants" USING btree ("match_id","seat");--> statement-breakpoint
CREATE INDEX "game_match_participants_account_match_idx" ON "game_match_participants" USING btree ("account_id","match_id");--> statement-breakpoint
CREATE INDEX "game_match_participants_guest_match_idx" ON "game_match_participants" USING btree ("guest_id","match_id");--> statement-breakpoint
CREATE INDEX "game_matches_status_updated_at_idx" ON "game_matches" USING btree ("status","updated_at" desc);--> statement-breakpoint
CREATE INDEX "game_matches_created_by_account_updated_at_idx" ON "game_matches" USING btree ("created_by_account_id","updated_at" desc);--> statement-breakpoint
CREATE INDEX "game_matches_created_by_guest_updated_at_idx" ON "game_matches" USING btree ("created_by_guest_id","updated_at" desc);