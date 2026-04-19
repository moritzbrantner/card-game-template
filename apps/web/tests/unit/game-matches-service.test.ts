import { describe, expect, it } from 'vitest';

import { buildUnoParticipants } from '@/src/domain/game-matches/service';

describe('game match service', () => {
  it('converts non-owner preset seats into bots for authoritative solo play', () => {
    const participants = buildUnoParticipants({
      identity: {
        kind: 'guest',
        guestId: 'guest-1',
      },
      fallbackDisplayName: null,
      matchInput: {
        presetId: 'mixed-table',
        displayName: 'Guest Player',
      },
    });

    expect(participants).toEqual([
      {
        playerId: 'p1',
        seat: 1,
        displayName: 'Guest Player',
        identity: {
          kind: 'guest',
          guestId: 'guest-1',
        },
        isBot: false,
      },
      {
        playerId: 'p2',
        seat: 2,
        displayName: 'House Bot',
        identity: { kind: 'bot' },
        isBot: true,
      },
      {
        playerId: 'p3',
        seat: 3,
        displayName: 'Player Two Bot',
        identity: { kind: 'bot' },
        isBot: true,
      },
      {
        playerId: 'p4',
        seat: 4,
        displayName: 'Table Bot',
        identity: { kind: 'bot' },
        isBot: true,
      },
    ]);
  });
});
