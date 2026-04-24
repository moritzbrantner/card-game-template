import type { MatchResult, PlayerProfile } from '@repo/game-contracts';
import {
  canStartRoom,
  createRoomSummary,
  type RoomVisibility,
} from '@repo/multiplayer-contract';

export const UNO_DEMO_GAME_ID = 'uno-style' as const;
export const UNO_DEMO_MAX_PLAYERS = 4;

export type UnoLobbyPlayer = PlayerProfile & {
  joinedAt: string;
};

export type UnoLobbyStatus = 'open' | 'active';
export type UnoArchivedMatchStatus = 'completed' | 'abandoned';

export type UnoActiveMatch = {
  matchId: string;
  startedAt: string;
};

export type UnoLobbyRecord = {
  roomId: string;
  roomName: string;
  gameId: typeof UNO_DEMO_GAME_ID;
  createdAt: string;
  updatedAt: string;
  hostPlayerId: string;
  maxPlayers: number;
  visibility: RoomVisibility;
  executionMode: 'server-authoritative';
  status: UnoLobbyStatus;
  players: readonly UnoLobbyPlayer[];
  activeMatch: UnoActiveMatch | null;
};

export type UnoArchivedMatchRecord = {
  archiveId: string;
  matchId: string;
  roomId: string;
  roomName: string;
  gameId: typeof UNO_DEMO_GAME_ID;
  startedAt: string;
  endedAt: string;
  status: UnoArchivedMatchStatus;
  note: string;
  players: readonly UnoLobbyPlayer[];
  result: MatchResult | null;
};

export type UnoDemoStore = {
  lobbies: readonly UnoLobbyRecord[];
  archivedMatches: readonly UnoArchivedMatchRecord[];
};

type IdFactory = () => string;

export function createEmptyUnoDemoStore(): UnoDemoStore {
  return {
    lobbies: [],
    archivedMatches: [],
  };
}

function sortLobbies(lobbies: readonly UnoLobbyRecord[]) {
  return [...lobbies].sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt),
  );
}

function sortArchivedMatches(matches: readonly UnoArchivedMatchRecord[]) {
  return [...matches].sort((left, right) =>
    right.endedAt.localeCompare(left.endedAt),
  );
}

function sanitizeStore(store: UnoDemoStore): UnoDemoStore {
  return {
    lobbies: sortLobbies(store.lobbies),
    archivedMatches: sortArchivedMatches(store.archivedMatches),
  };
}

export function findUnoLobbyByPlayer(store: UnoDemoStore, playerId: string) {
  return (
    store.lobbies.find((lobby) =>
      lobby.players.some((player) => player.playerId === playerId),
    ) ?? null
  );
}

export function findUnoLobby(store: UnoDemoStore, roomId: string) {
  return store.lobbies.find((lobby) => lobby.roomId === roomId) ?? null;
}

export function buildUnoRoomSummary(lobby: UnoLobbyRecord) {
  return createRoomSummary({
    roomId: lobby.roomId,
    gameId: lobby.gameId,
    hostPlayerId: lobby.hostPlayerId,
    visibility: lobby.visibility,
    executionMode: lobby.executionMode,
    maxPlayers: lobby.maxPlayers,
    players: lobby.players,
  });
}

export function canStartUnoLobby(lobby: UnoLobbyRecord) {
  return lobby.status === 'open' && canStartRoom(buildUnoRoomSummary(lobby));
}

function updateLobby(
  store: UnoDemoStore,
  roomId: string,
  updater: (lobby: UnoLobbyRecord) => UnoLobbyRecord | null,
) {
  const nextLobbies: UnoLobbyRecord[] = [];

  for (const lobby of store.lobbies) {
    if (lobby.roomId !== roomId) {
      nextLobbies.push(lobby);
      continue;
    }

    const nextLobby = updater(lobby);

    if (nextLobby) {
      nextLobbies.push(nextLobby);
    }
  }

  return sanitizeStore({
    ...store,
    lobbies: nextLobbies,
  });
}

export function createUnoLobby(
  store: UnoDemoStore,
  input: {
    playerId: string;
    displayName: string;
    now: string;
    idFactory: IdFactory;
  },
) {
  const normalizedName = input.displayName.trim();

  if (!normalizedName) {
    throw new Error('A player name is required to create a lobby.');
  }

  const roomId = `room-${input.idFactory()}`;
  const nextLobby: UnoLobbyRecord = {
    roomId,
    roomName: `${normalizedName} table`,
    gameId: UNO_DEMO_GAME_ID,
    createdAt: input.now,
    updatedAt: input.now,
    hostPlayerId: input.playerId,
    maxPlayers: UNO_DEMO_MAX_PLAYERS,
    visibility: 'public',
    executionMode: 'server-authoritative',
    status: 'open',
    players: [
      {
        playerId: input.playerId,
        displayName: normalizedName,
        seat: 0,
        joinedAt: input.now,
      },
    ],
    activeMatch: null,
  };

  return {
    roomId,
    store: sanitizeStore({
      ...store,
      lobbies: [...store.lobbies, nextLobby],
    }),
  };
}

export function joinUnoLobby(
  store: UnoDemoStore,
  input: {
    roomId: string;
    playerId: string;
    displayName: string;
    now: string;
  },
) {
  const normalizedName = input.displayName.trim();

  if (!normalizedName) {
    throw new Error('A player name is required to join a lobby.');
  }

  return updateLobby(store, input.roomId, (lobby) => {
    if (lobby.status !== 'open') {
      throw new Error('Only open lobbies can be joined.');
    }

    if (lobby.players.some((player) => player.playerId === input.playerId)) {
      return {
        ...lobby,
        updatedAt: input.now,
      };
    }

    if (lobby.players.length >= lobby.maxPlayers) {
      throw new Error('This lobby is already full.');
    }

    const occupiedSeats = new Set(lobby.players.map((player) => player.seat));
    const seat = Array.from(
      { length: lobby.maxPlayers },
      (_, index) => index,
    ).find((candidate) => !occupiedSeats.has(candidate));

    if (seat === undefined) {
      throw new Error('No free seat is available in this lobby.');
    }

    return {
      ...lobby,
      updatedAt: input.now,
      players: [
        ...lobby.players,
        {
          playerId: input.playerId,
          displayName: normalizedName,
          seat,
          joinedAt: input.now,
        },
      ],
    };
  });
}

export function leaveUnoLobby(
  store: UnoDemoStore,
  input: {
    roomId: string;
    playerId: string;
    now: string;
    idFactory: IdFactory;
  },
) {
  const lobby = findUnoLobby(store, input.roomId);

  if (!lobby) {
    return store;
  }

  if (lobby.status === 'active') {
    return exitUnoMatch(store, {
      roomId: input.roomId,
      playerId: input.playerId,
      now: input.now,
      idFactory: input.idFactory,
    });
  }

  return updateLobby(store, input.roomId, (currentLobby) => {
    const nextPlayers = currentLobby.players.filter(
      (player) => player.playerId !== input.playerId,
    );

    if (nextPlayers.length === currentLobby.players.length) {
      return currentLobby;
    }

    if (nextPlayers.length === 0) {
      return null;
    }

    return {
      ...currentLobby,
      updatedAt: input.now,
      hostPlayerId: nextPlayers.some(
        (player) => player.playerId === currentLobby.hostPlayerId,
      )
        ? currentLobby.hostPlayerId
        : nextPlayers[0]!.playerId,
      players: nextPlayers,
    };
  });
}

export function startUnoLobbyGame(
  store: UnoDemoStore,
  input: {
    roomId: string;
    now: string;
    idFactory: IdFactory;
  },
) {
  return updateLobby(store, input.roomId, (lobby) => {
    if (!canStartUnoLobby(lobby)) {
      throw new Error(
        'This lobby does not have enough ready players to start.',
      );
    }

    return {
      ...lobby,
      status: 'active',
      updatedAt: input.now,
      activeMatch: {
        matchId: `match-${input.idFactory()}`,
        startedAt: input.now,
      },
    };
  });
}

export function finishUnoMatch(
  store: UnoDemoStore,
  input: {
    roomId: string;
    winnerIds: readonly string[];
    now: string;
    idFactory: IdFactory;
  },
) {
  const lobby = findUnoLobby(store, input.roomId);

  if (!lobby || !lobby.activeMatch) {
    return store;
  }

  const result: MatchResult = {
    matchId: lobby.activeMatch.matchId,
    gameId: lobby.gameId,
    executionMode: lobby.executionMode,
    finishedAt: input.now,
    winnerIds: input.winnerIds,
    rankings: lobby.players
      .map((player) => ({
        playerId: player.playerId,
        position: input.winnerIds.includes(player.playerId) ? 1 : 2,
      }))
      .sort((left, right) => left.position - right.position),
  };

  return sanitizeStore({
    lobbies: store.lobbies.filter(
      (existingLobby) => existingLobby.roomId !== input.roomId,
    ),
    archivedMatches: [
      ...store.archivedMatches,
      {
        archiveId: `archive-${input.idFactory()}`,
        matchId: lobby.activeMatch.matchId,
        roomId: lobby.roomId,
        roomName: lobby.roomName,
        gameId: lobby.gameId,
        startedAt: lobby.activeMatch.startedAt,
        endedAt: input.now,
        status: 'completed',
        note:
          input.winnerIds.length > 0
            ? `${lobby.players.find((player) => player.playerId === input.winnerIds[0])?.displayName ?? 'A player'} won the demo match`
            : 'The demo match finished.',
        players: lobby.players,
        result,
      },
    ],
  });
}

export function exitUnoMatch(
  store: UnoDemoStore,
  input: {
    roomId: string;
    playerId: string;
    now: string;
    idFactory: IdFactory;
  },
) {
  const lobby = findUnoLobby(store, input.roomId);

  if (!lobby?.activeMatch) {
    return store;
  }

  const exitingPlayer = lobby.players.find(
    (player) => player.playerId === input.playerId,
  );

  return sanitizeStore({
    lobbies: store.lobbies.filter(
      (existingLobby) => existingLobby.roomId !== input.roomId,
    ),
    archivedMatches: [
      ...store.archivedMatches,
      {
        archiveId: `archive-${input.idFactory()}`,
        matchId: lobby.activeMatch.matchId,
        roomId: lobby.roomId,
        roomName: lobby.roomName,
        gameId: lobby.gameId,
        startedAt: lobby.activeMatch.startedAt,
        endedAt: input.now,
        status: 'abandoned',
        note: `${exitingPlayer?.displayName ?? 'A player'} exited the match`,
        players: lobby.players,
        result: null,
      },
    ],
  });
}

export function getUnoSeatFillLabel(lobby: UnoLobbyRecord) {
  return `${lobby.players.length} / ${lobby.maxPlayers} seats filled`;
}

export function isUnoLobbyHost(
  lobby: UnoLobbyRecord,
  playerId: string | null | undefined,
) {
  return !!playerId && lobby.hostPlayerId === playerId;
}
