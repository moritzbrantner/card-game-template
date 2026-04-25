import { describe, expect, it } from 'vitest';

import {
  buildRoomMatchParticipants,
  buildUnoParticipants,
} from '@/src/domain/game-matches/service';

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

  it('builds room-based match participants with reserved bot seats at open positions', () => {
    const participants = buildRoomMatchParticipants({
      seats: [
        {
          seat: 1,
          playerId: 'host-player',
          displayName: 'Alice',
          identity: {
            kind: 'guest',
            guestId: 'guest-host',
          },
        },
        {
          seat: 3,
          playerId: 'guest-player',
          displayName: 'Bob',
          identity: {
            kind: 'account',
            accountId: 'account-bob',
          },
        },
      ],
      maxPlayers: 4,
      botCount: 2,
    });

    expect(participants).toEqual([
      {
        playerId: 'host-player',
        seat: 1,
        displayName: 'Alice',
        identity: {
          kind: 'guest',
          guestId: 'guest-host',
        },
        isBot: false,
      },
      {
        playerId: 'bot-room-seat-2',
        seat: 2,
        displayName: 'Bot 1',
        identity: {
          kind: 'bot',
        },
        isBot: true,
      },
      {
        playerId: 'guest-player',
        seat: 3,
        displayName: 'Bob',
        identity: {
          kind: 'account',
          accountId: 'account-bob',
        },
        isBot: false,
      },
      {
        playerId: 'bot-room-seat-4',
        seat: 4,
        displayName: 'Bot 2',
        identity: {
          kind: 'bot',
        },
        isBot: true,
      },
    ]);
  });
});
