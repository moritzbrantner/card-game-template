CREATE TABLE "game_room_seats" (
	"room_id" text NOT NULL,
	"player_id" text NOT NULL,
	"seat" integer NOT NULL,
	"display_name" text NOT NULL,
	"identity_kind" text NOT NULL,
	"account_id" text,
	"guest_id" text,
	"ready" boolean DEFAULT false NOT NULL,
	"connection_status" text DEFAULT 'connected' NOT NULL,
	"joined_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "game_room_seats_pkey" PRIMARY KEY("room_id","player_id")
);
--> statement-breakpoint
CREATE TABLE "game_rooms" (
	"id" text PRIMARY KEY NOT NULL,
	"room_name" text NOT NULL,
	"game_id" text NOT NULL,
	"status" text NOT NULL,
	"visibility" text NOT NULL,
	"execution_mode" text NOT NULL,
	"max_players" integer NOT NULL,
	"host_player_id" text NOT NULL,
	"active_match_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"created_by_kind" text NOT NULL,
	"created_by_account_id" text,
	"created_by_guest_id" text
);
--> statement-breakpoint
ALTER TABLE "game_room_seats" ADD CONSTRAINT "game_room_seats_room_id_game_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."game_rooms"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "game_room_seats" ADD CONSTRAINT "game_room_seats_account_id_User_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "game_rooms" ADD CONSTRAINT "game_rooms_created_by_account_id_User_id_fk" FOREIGN KEY ("created_by_account_id") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "game_room_seats_room_id_player_id_key" ON "game_room_seats" USING btree ("room_id","player_id");--> statement-breakpoint
CREATE UNIQUE INDEX "game_room_seats_room_id_seat_key" ON "game_room_seats" USING btree ("room_id","seat");--> statement-breakpoint
CREATE INDEX "game_room_seats_account_room_idx" ON "game_room_seats" USING btree ("account_id","room_id");--> statement-breakpoint
CREATE INDEX "game_room_seats_guest_room_idx" ON "game_room_seats" USING btree ("guest_id","room_id");--> statement-breakpoint
CREATE INDEX "game_rooms_status_updated_at_idx" ON "game_rooms" USING btree ("status","updated_at" desc);--> statement-breakpoint
CREATE INDEX "game_rooms_game_status_updated_at_idx" ON "game_rooms" USING btree ("game_id","status","updated_at" desc);--> statement-breakpoint
CREATE INDEX "game_rooms_created_by_account_updated_at_idx" ON "game_rooms" USING btree ("created_by_account_id","updated_at" desc);--> statement-breakpoint
CREATE INDEX "game_rooms_created_by_guest_updated_at_idx" ON "game_rooms" USING btree ("created_by_guest_id","updated_at" desc);