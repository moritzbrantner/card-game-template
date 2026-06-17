import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

describe('game match persistence contract', () => {
  it('keeps database JSON columns generic for registered card games', () => {
    const schema = readFileSync(
      path.join(process.cwd(), 'src/db/schema/games.ts'),
      'utf8',
    );

    expect(schema).toMatch(/\$type<MatchState<unknown>>\(\)\s*\.notNull\(\)/);
    expect(schema).toMatch(/\$type<GameMove>\(\)\s*\.notNull\(\)/);
    expect(schema).not.toContain('UnoState');
    expect(schema).not.toContain('UnoMove');
  });

  it('keeps UNO persistence as a specialization of the generic match record', () => {
    const contracts = readFileSync(
      path.join(process.cwd(), 'src/domain/game-matches/contracts.ts'),
      'utf8',
    );

    expect(contracts).toContain('export type PersistedGameMatchRecord<');
    expect(contracts).toMatch(
      /export type PersistedUnoMatchRecord = PersistedGameMatchRecord<\s*['"]uno-style['"]/,
    );
    expect(contracts).toMatch(
      /export type PersistedPokerMatchRecord = PersistedGameMatchRecord<\s*['"]texas-holdem['"]/,
    );
    expect(contracts).toMatch(
      /export type PersistedTcgMatchRecord = PersistedGameMatchRecord<\s*['"]arcane-duel['"]/,
    );
    expect(contracts).toContain('export type PersistedGameMatchSummaryDto<');
  });

  it('keeps the web match repository generic across registered game ids', () => {
    const repository = readFileSync(
      path.join(process.cwd(), 'src/domain/game-matches/repository.ts'),
      'utf8',
    );

    expect(repository).toContain('export async function listOwnedGameMatches');
    expect(repository).toContain('export async function loadOwnedGameMatch');
    expect(repository).toContain('gameId?: GameId');
    expect(repository).not.toContain('@repo/game-uno');
    expect(repository).not.toContain('@repo/game-poker');
    expect(repository).not.toContain('@repo/game-tcg');
    expect(repository).not.toContain("gameId: 'uno-style'");
  });

  it('registers all web match runtime game ids', () => {
    const runtime = readFileSync(
      path.join(process.cwd(), 'src/domain/game-matches/runtime.ts'),
      'utf8',
    );

    expect(runtime).toContain("'uno-style':");
    expect(runtime).toContain("'texas-holdem':");
    expect(runtime).toContain("'arcane-duel':");
  });

  it('keeps private rooms persisted separately from match replay state', () => {
    const schema = readFileSync(
      path.join(process.cwd(), 'src/db/schema/games.ts'),
      'utf8',
    );

    expect(schema).toContain('export const gameRooms = pgTable');
    expect(schema).toContain('export const gameRoomSeats = pgTable');
    expect(schema).toContain("visibility: text('visibility').notNull()");
    expect(schema).toContain(
      "ready: boolean('ready').notNull().default(false)",
    );
    expect(schema).toContain("activeMatchId: text('active_match_id')");
  });
});
