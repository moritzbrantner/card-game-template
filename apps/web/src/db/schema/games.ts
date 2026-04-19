import type { MatchReplayAnalysis, MatchResult, MatchState } from '@repo/game-contracts';
import type { UnoMove, UnoReplayAnalysis, UnoState } from '@repo/game-uno';
import { desc } from 'drizzle-orm';
import { boolean, index, integer, jsonb, pgTable, primaryKey, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

import { users } from './legacy';

export const gameMatches = pgTable(
  'game_matches',
  {
    id: text('id').primaryKey(),
    gameId: text('game_id').notNull(),
    status: text('status').notNull(),
    executionMode: text('execution_mode').notNull(),
    replayFormatVersion: integer('replay_format_version').notNull(),
    startedAt: timestamp('started_at', { withTimezone: false, mode: 'date' }).notNull(),
    finishedAt: timestamp('finished_at', { withTimezone: false, mode: 'date' }),
    updatedAt: timestamp('updated_at', { withTimezone: false, mode: 'date' }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: false, mode: 'date' }).notNull().defaultNow(),
    createdByKind: text('created_by_kind').notNull(),
    createdByAccountId: text('created_by_account_id').references(() => users.id, {
      onDelete: 'set null',
      onUpdate: 'cascade',
    }),
    createdByGuestId: text('created_by_guest_id'),
    initialStateJson: jsonb('initial_state_json').$type<MatchState<UnoState>>().notNull(),
    latestStateJson: jsonb('latest_state_json').$type<MatchState<UnoState>>().notNull(),
    resultJson: jsonb('result_json').$type<MatchResult | null>(),
    analysisJson: jsonb('analysis_json')
      .$type<{
        generic: MatchReplayAnalysis;
        uno: UnoReplayAnalysis;
      } | null>(),
    lastSequence: integer('last_sequence').notNull().default(0),
  },
  (table) => [
    index('game_matches_status_updated_at_idx').on(table.status, desc(table.updatedAt)),
    index('game_matches_created_by_account_updated_at_idx').on(table.createdByAccountId, desc(table.updatedAt)),
    index('game_matches_created_by_guest_updated_at_idx').on(table.createdByGuestId, desc(table.updatedAt)),
  ],
);

export const gameMatchParticipants = pgTable(
  'game_match_participants',
  {
    matchId: text('match_id')
      .notNull()
      .references(() => gameMatches.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    playerId: text('player_id').notNull(),
    seat: integer('seat').notNull(),
    displayName: text('display_name').notNull(),
    identityKind: text('identity_kind').notNull(),
    accountId: text('account_id').references(() => users.id, {
      onDelete: 'set null',
      onUpdate: 'cascade',
    }),
    guestId: text('guest_id'),
    isBot: boolean('is_bot').notNull().default(false),
  },
  (table) => [
    primaryKey({ columns: [table.matchId, table.playerId], name: 'game_match_participants_pkey' }),
    uniqueIndex('game_match_participants_match_id_player_id_key').on(table.matchId, table.playerId),
    uniqueIndex('game_match_participants_match_id_seat_key').on(table.matchId, table.seat),
    index('game_match_participants_account_match_idx').on(table.accountId, table.matchId),
    index('game_match_participants_guest_match_idx').on(table.guestId, table.matchId),
  ],
);

export const gameMatchMoves = pgTable(
  'game_match_moves',
  {
    matchId: text('match_id')
      .notNull()
      .references(() => gameMatches.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    sequence: integer('sequence').notNull(),
    acceptedAt: timestamp('accepted_at', { withTimezone: false, mode: 'date' }).notNull(),
    playerId: text('player_id').notNull(),
    moveKind: text('move_kind').notNull(),
    moveJson: jsonb('move_json').$type<UnoMove>().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.matchId, table.sequence], name: 'game_match_moves_pkey' }),
    uniqueIndex('game_match_moves_match_id_sequence_key').on(table.matchId, table.sequence),
    index('game_match_moves_match_id_sequence_idx').on(table.matchId, table.sequence),
  ],
);
