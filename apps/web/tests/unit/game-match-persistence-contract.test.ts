import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

describe('game match persistence contract', () => {
  it('keeps database JSON columns generic for registered card games', () => {
    const schema = readFileSync(path.join(process.cwd(), 'src/db/schema/games.ts'), 'utf8');

    expect(schema).toContain("$type<MatchState<unknown>>().notNull()");
    expect(schema).toContain("$type<GameMove>().notNull()");
    expect(schema).not.toContain('UnoState');
    expect(schema).not.toContain('UnoMove');
  });

  it('keeps UNO persistence as a specialization of the generic match record', () => {
    const contracts = readFileSync(path.join(process.cwd(), 'src/domain/game-matches/contracts.ts'), 'utf8');

    expect(contracts).toContain('export type PersistedGameMatchRecord<');
    expect(contracts).toContain("export type PersistedUnoMatchRecord = PersistedGameMatchRecord<");
    expect(contracts).toContain("'uno-style'");
    expect(contracts).toContain('export type PersistedGameMatchSummaryDto<');
  });
});
