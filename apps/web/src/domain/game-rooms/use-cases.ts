import { randomUUID } from 'node:crypto';

import { defaultGameCatalog } from '@repo/game-catalog';

import type { AppSession } from '@/src/auth';
import { getDb } from '@/src/db/client';
import { listUnoBotAiProfiles } from '@/src/domain/game-bot-ai/service';
import {
  type PersistedGameMatchRecord,
  type PersistedPokerMatchRecord,
  type PersistedUnoMatchRecord,
} from '@/src/domain/game-matches/contracts';
import { createGameMatch } from '@/src/domain/game-matches/repository';
import {
  buildPersistedPokerMatchRecord,
  buildPersistedUnoMatchRecord,
  buildRoomMatchParticipants,
  createPokerMatchSessionFromParticipants,
  createUnoMatchSessionFromParticipants,
} from '@/src/domain/game-matches/service';
import {
  failure,
  success,
  type ServiceResult,
} from '@/src/domain/shared/result';

import type { MatchOwnerIdentity } from '../game-matches/contracts';
import {
  resolveExistingMatchOwnerIdentity,
  resolveOrCreateMatchOwnerIdentity,
} from '../game-matches/identity';
import type {
  CreatePrivateGameRoomInput,
  GameRoomDto,
  GameRoomRealtimeDto,
  GameRoomRealtimeInput,
  JoinPrivateGameRoomInput,
  PersistedGameRoomRecord,
  SetGameRoomReadyInput,
} from './contracts';
import {
  addGameRoomSeat,
  closePersistedGameRoom,
  createGameRoom,
  findRoomParticipantByIdentity,
  listParticipatingGameRooms,
  loadGameRoom,
  loadParticipatingGameRoom,
  StaleGameRoomError,
  startPersistedGameRoom,
  updateGameRoomSeatReady,
} from './repository';

type GameRoomUseCaseError = {
  code: 'VALIDATION_ERROR' | 'NOT_FOUND' | 'CONFLICT' | 'FORBIDDEN';
  message: string;
};

function isoNow() {
  return new Date().toISOString();
}

function isNewerTimestamp(current: string, previous?: string | null) {
  if (!previous) {
    return true;
  }

  return new Date(current).getTime() > new Date(previous).getTime();
}

function mapMissingIdentity() {
  return failure<GameRoomUseCaseError>({
    code: 'NOT_FOUND',
    message: 'Room not found.',
  });
}

async function resolveRoomIdentity(
  session: AppSession | null,
  createGuest: boolean,
) {
  return createGuest
    ? resolveOrCreateMatchOwnerIdentity(session)
    : resolveExistingMatchOwnerIdentity(session);
}

function getDisplayName(input: {
  requestedDisplayName?: string | null;
  fallbackDisplayName: string | null;
}) {
  return (
    input.requestedDisplayName?.trim() ||
    input.fallbackDisplayName?.trim() ||
    'Player One'
  );
}

function toSeatRows(room: PersistedGameRoomRecord): GameRoomDto['seats'] {
  return room.participants.map((participant) => ({
    seat: participant.seat,
    playerId: participant.playerId,
    displayName: participant.displayName,
    ready: participant.ready,
    connectionStatus: participant.connectionStatus,
  }));
}

function getHumanSeatCapacity(input: { maxPlayers: number; botCount: number }) {
  return input.maxPlayers - input.botCount;
}

function roomCanStart(room: PersistedGameRoomRecord) {
  const game = defaultGameCatalog.get(room.gameId);

  if (!game || room.status !== 'open') {
    return false;
  }

  const humanParticipants = room.participants;
  const totalParticipants = humanParticipants.length + room.botCount;

  return (
    humanParticipants.length > 0 &&
    totalParticipants >= game.definition.minPlayers &&
    totalParticipants <= game.definition.maxPlayers &&
    humanParticipants.every((seat) => seat.ready)
  );
}

function buildMatchInsert(input: PersistedGameMatchRecord) {
  return {
    id: input.matchId,
    gameId: input.gameId,
    status: input.status,
    executionMode: input.executionMode,
    replayFormatVersion: input.replayFormatVersion,
    startedAt: new Date(input.startedAt),
    finishedAt: input.finishedAt ? new Date(input.finishedAt) : null,
    updatedAt: new Date(input.updatedAt),
    createdAt: new Date(input.createdAt),
    createdByKind: input.createdBy.kind,
    createdByAccountId:
      input.createdBy.kind === 'account' ? input.createdBy.accountId : null,
    createdByGuestId:
      input.createdBy.kind === 'guest' ? input.createdBy.guestId : null,
    initialStateJson: input.initialState,
    latestStateJson: input.latestState,
    resultJson: input.result,
    analysisJson: input.analysis,
    lastSequence: input.lastSequence,
  };
}

function buildParticipantRows(input: PersistedGameMatchRecord) {
  return input.participants.map((participant) => ({
    matchId: input.matchId,
    playerId: participant.playerId,
    seat: participant.seat,
    displayName: participant.displayName,
    identityKind: participant.identity.kind,
    accountId:
      participant.identity.kind === 'account'
        ? participant.identity.accountId
        : null,
    guestId:
      participant.identity.kind === 'guest'
        ? participant.identity.guestId
        : null,
    isBot: participant.isBot,
  }));
}

function buildMoveRows(input: PersistedGameMatchRecord) {
  return input.acceptedMoves.map((acceptedMove) => ({
    matchId: input.matchId,
    sequence: acceptedMove.sequence,
    acceptedAt: new Date(acceptedMove.acceptedAt),
    playerId: acceptedMove.move.playerId,
    moveKind: acceptedMove.move.kind,
    moveJson: acceptedMove.move,
  }));
}

async function buildPersistedMatchFromRoom(input: {
  room: PersistedGameRoomRecord;
  createdAt: string;
}) {
  const participants = buildRoomMatchParticipants({
    seats: input.room.participants,
    maxPlayers: input.room.maxPlayers,
    botCount: input.room.botCount,
  });

  if (input.room.gameId === 'uno-style') {
    const { session } = createUnoMatchSessionFromParticipants({
      matchId: randomUUID(),
      participants,
      botAiProfiles: await listUnoBotAiProfiles(),
      now: () => input.createdAt,
    });

    return buildPersistedUnoMatchRecord({
      createdAt: input.createdAt,
      createdBy: input.room.createdBy,
      participants,
      session,
    }) satisfies PersistedUnoMatchRecord;
  }

  if (input.room.gameId === 'texas-holdem') {
    const { session } = createPokerMatchSessionFromParticipants({
      matchId: randomUUID(),
      participants,
      now: () => input.createdAt,
    });

    return buildPersistedPokerMatchRecord({
      createdAt: input.createdAt,
      createdBy: input.room.createdBy,
      participants,
      session,
    }) satisfies PersistedPokerMatchRecord;
  }

  throw new Error(
    `Online room start is not supported for ${input.room.gameId}.`,
  );
}

function buildGameRoomDto(
  room: PersistedGameRoomRecord,
  identity: MatchOwnerIdentity,
): GameRoomDto {
  const viewer = findRoomParticipantByIdentity(room, identity);

  if (!viewer) {
    throw new Error('Viewer is not seated in this room.');
  }

  return {
    roomId: room.roomId,
    roomName: room.roomName,
    gameId: room.gameId,
    status: room.status,
    visibility: room.visibility,
    executionMode: room.executionMode,
    maxPlayers: room.maxPlayers,
    botCount: room.botCount,
    hostPlayerId: room.hostPlayerId,
    activeMatchId: room.activeMatchId,
    createdAt: room.createdAt,
    updatedAt: room.updatedAt,
    seats: toSeatRows(room),
    viewerPlayerId: viewer.playerId,
    viewerIsHost: viewer.playerId === room.hostPlayerId,
    canStart: roomCanStart(room),
  };
}

function buildGameRoomRealtimeDto(input: {
  room: PersistedGameRoomRecord;
  identity: MatchOwnerIdentity;
  sinceUpdatedAt?: string | null;
}): GameRoomRealtimeDto {
  const room = buildGameRoomDto(input.room, input.identity);
  const hasChanges = isNewerTimestamp(room.updatedAt, input.sinceUpdatedAt);

  return {
    room,
    cursor: {
      updatedAt: room.updatedAt,
    },
    events: hasChanges
      ? [
          {
            type: 'room.updated',
            roomId: room.roomId,
            occurredAt: room.updatedAt,
          },
        ]
      : [],
    hasChanges,
  };
}

function assertValidRoomInput(input: CreatePrivateGameRoomInput) {
  const game = defaultGameCatalog.get(input.gameId);

  if (!game) {
    throw new Error('Only registered games can be used for private rooms.');
  }

  const maxPlayers = input.maxPlayers ?? game.definition.maxPlayers;
  const botCount = input.botCount ?? 0;

  if (!Number.isInteger(maxPlayers)) {
    throw new Error('Room size must be a whole number.');
  }

  if (!Number.isInteger(botCount)) {
    throw new Error('Bot amount must be a whole number.');
  }

  if (
    maxPlayers < game.definition.minPlayers ||
    maxPlayers > game.definition.maxPlayers
  ) {
    throw new Error(
      `Room size must be between ${game.definition.minPlayers} and ${game.definition.maxPlayers} players for ${game.definition.name}.`,
    );
  }

  if (botCount < 0 || botCount >= maxPlayers) {
    throw new Error(
      `Bot amount must be between 0 and ${maxPlayers - 1} for ${game.definition.name}.`,
    );
  }

  return {
    game,
    maxPlayers,
    botCount,
  };
}

function getNextOpenSeat(room: PersistedGameRoomRecord) {
  const occupiedSeats = new Set(
    room.participants.map((participant) => participant.seat),
  );
  const humanSeatCapacity = getHumanSeatCapacity(room);

  return Array.from(
    { length: humanSeatCapacity },
    (_, index) => index + 1,
  ).find((seat) => !occupiedSeats.has(seat));
}

function buildSeatInsert(input: {
  roomId: string;
  playerId: string;
  seat: number;
  displayName: string;
  identity: MatchOwnerIdentity;
  now: string;
}) {
  return {
    roomId: input.roomId,
    playerId: input.playerId,
    seat: input.seat,
    displayName: input.displayName,
    identityKind: input.identity.kind,
    accountId:
      input.identity.kind === 'account' ? input.identity.accountId : null,
    guestId: input.identity.kind === 'guest' ? input.identity.guestId : null,
    ready: false,
    connectionStatus: 'connected',
    joinedAt: new Date(input.now),
    updatedAt: new Date(input.now),
  };
}

export async function listGameRoomsUseCase(
  session: AppSession | null,
): Promise<ServiceResult<readonly GameRoomDto[], never>> {
  const resolvedIdentity = await resolveRoomIdentity(session, true);
  const rooms = await listParticipatingGameRooms(
    getDb(),
    resolvedIdentity.identity as MatchOwnerIdentity,
  );

  return success(
    rooms.map((room) =>
      buildGameRoomDto(room, resolvedIdentity.identity as MatchOwnerIdentity),
    ),
  );
}

export async function createPrivateGameRoomUseCase(
  session: AppSession | null,
  input: CreatePrivateGameRoomInput,
): Promise<ServiceResult<GameRoomDto, GameRoomUseCaseError>> {
  const resolvedIdentity = await resolveRoomIdentity(session, true);
  const identity = resolvedIdentity.identity as MatchOwnerIdentity;

  try {
    const { game, maxPlayers, botCount } = assertValidRoomInput(input);
    const created = await getDb().transaction(async (tx) => {
      const createdAt = isoNow();
      const roomId = randomUUID();
      const playerId = randomUUID();
      const displayName = getDisplayName({
        requestedDisplayName: input.displayName,
        fallbackDisplayName: resolvedIdentity.displayName,
      });

      await createGameRoom(tx, {
        room: {
          id: roomId,
          roomName: `${displayName}'s ${game.definition.name} room`,
          gameId: game.definition.gameId,
          status: 'open',
          visibility: 'private',
          executionMode: 'server-authoritative',
          maxPlayers,
          botCount,
          hostPlayerId: playerId,
          activeMatchId: null,
          createdAt: new Date(createdAt),
          updatedAt: new Date(createdAt),
          createdByKind: identity.kind,
          createdByAccountId:
            identity.kind === 'account' ? identity.accountId : null,
          createdByGuestId: identity.kind === 'guest' ? identity.guestId : null,
        },
        seats: [
          buildSeatInsert({
            roomId,
            playerId,
            seat: 1,
            displayName,
            identity,
            now: createdAt,
          }),
        ],
      });

      const room = await loadGameRoom(tx, roomId);

      if (!room) {
        throw new Error('Unable to load the created room.');
      }

      return buildGameRoomDto(room, identity);
    });

    return success(created);
  } catch (error) {
    return failure({
      code: 'VALIDATION_ERROR',
      message:
        error instanceof Error ? error.message : 'Unable to create room.',
    });
  }
}

export async function getGameRoomUseCase(
  session: AppSession | null,
  roomId: string,
): Promise<ServiceResult<GameRoomDto, GameRoomUseCaseError>> {
  const resolvedIdentity = await resolveRoomIdentity(session, false);

  if (!resolvedIdentity.identity) {
    return mapMissingIdentity();
  }

  const room = await loadParticipatingGameRoom(
    getDb(),
    resolvedIdentity.identity as MatchOwnerIdentity,
    roomId,
  );

  if (!room) {
    return mapMissingIdentity();
  }

  return success(
    buildGameRoomDto(room, resolvedIdentity.identity as MatchOwnerIdentity),
  );
}

export async function getGameRoomRealtimeUseCase(
  session: AppSession | null,
  roomId: string,
  input: GameRoomRealtimeInput = {},
): Promise<ServiceResult<GameRoomRealtimeDto, GameRoomUseCaseError>> {
  const resolvedIdentity = await resolveRoomIdentity(session, false);

  if (!resolvedIdentity.identity) {
    return mapMissingIdentity();
  }

  const room = await loadParticipatingGameRoom(
    getDb(),
    resolvedIdentity.identity as MatchOwnerIdentity,
    roomId,
  );

  if (!room) {
    return mapMissingIdentity();
  }

  return success(
    buildGameRoomRealtimeDto({
      room,
      identity: resolvedIdentity.identity as MatchOwnerIdentity,
      sinceUpdatedAt: input.sinceUpdatedAt,
    }),
  );
}

export async function joinPrivateGameRoomUseCase(
  session: AppSession | null,
  roomId: string,
  input: JoinPrivateGameRoomInput,
): Promise<ServiceResult<GameRoomDto, GameRoomUseCaseError>> {
  const resolvedIdentity = await resolveRoomIdentity(session, true);

  try {
    const joined = await getDb().transaction(async (tx) => {
      const room = await loadGameRoom(tx, roomId);

      if (!room || room.visibility !== 'private') {
        throw failure<GameRoomUseCaseError>({
          code: 'NOT_FOUND',
          message: 'Room not found.',
        });
      }

      const existingParticipant = findRoomParticipantByIdentity(
        room,
        resolvedIdentity.identity as MatchOwnerIdentity,
      );

      if (existingParticipant) {
        return buildGameRoomDto(
          room,
          resolvedIdentity.identity as MatchOwnerIdentity,
        );
      }

      if (room.status !== 'open') {
        throw failure<GameRoomUseCaseError>({
          code: 'CONFLICT',
          message: 'Only open rooms can be joined.',
        });
      }

      if (room.participants.length >= getHumanSeatCapacity(room)) {
        throw failure<GameRoomUseCaseError>({
          code: 'CONFLICT',
          message: 'This room is already full.',
        });
      }

      const nextSeat = getNextOpenSeat(room);

      if (!nextSeat) {
        throw failure<GameRoomUseCaseError>({
          code: 'CONFLICT',
          message: 'No free seat is available in this room.',
        });
      }

      const now = isoNow();
      await addGameRoomSeat(
        tx,
        buildSeatInsert({
          roomId,
          playerId: randomUUID(),
          seat: nextSeat,
          displayName: getDisplayName({
            requestedDisplayName: input.displayName,
            fallbackDisplayName: resolvedIdentity.displayName,
          }),
          identity: resolvedIdentity.identity as MatchOwnerIdentity,
          now,
        }),
      );

      const updatedRoom = await loadGameRoom(tx, roomId);

      if (!updatedRoom) {
        throw new Error('Unable to load the joined room.');
      }

      return buildGameRoomDto(
        updatedRoom,
        resolvedIdentity.identity as MatchOwnerIdentity,
      );
    });

    return success(joined);
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'ok' in error &&
      error.ok === false
    ) {
      return error as ServiceResult<never, GameRoomUseCaseError>;
    }

    return failure({
      code: 'VALIDATION_ERROR',
      message: error instanceof Error ? error.message : 'Unable to join room.',
    });
  }
}

export async function setGameRoomReadyUseCase(
  session: AppSession | null,
  roomId: string,
  input: SetGameRoomReadyInput,
): Promise<ServiceResult<GameRoomDto, GameRoomUseCaseError>> {
  const resolvedIdentity = await resolveRoomIdentity(session, false);

  if (!resolvedIdentity.identity) {
    return mapMissingIdentity();
  }

  const updated = await getDb().transaction(async (tx) => {
    const room = await loadParticipatingGameRoom(
      tx,
      resolvedIdentity.identity as MatchOwnerIdentity,
      roomId,
    );

    if (!room) {
      return mapMissingIdentity();
    }

    if (room.status !== 'open') {
      return failure<GameRoomUseCaseError>({
        code: 'CONFLICT',
        message: 'Ready state can only be changed before the room starts.',
      });
    }

    const participant = findRoomParticipantByIdentity(
      room,
      resolvedIdentity.identity as MatchOwnerIdentity,
    );

    if (!participant) {
      return mapMissingIdentity();
    }

    await updateGameRoomSeatReady(tx, {
      roomId,
      playerId: participant.playerId,
      ready: input.ready,
      updatedAt: new Date(isoNow()),
    });

    const updatedRoom = await loadGameRoom(tx, roomId);

    if (!updatedRoom) {
      return mapMissingIdentity();
    }

    return success(
      buildGameRoomDto(
        updatedRoom,
        resolvedIdentity.identity as MatchOwnerIdentity,
      ),
    );
  });

  return updated;
}

export async function startGameRoomUseCase(
  session: AppSession | null,
  roomId: string,
): Promise<ServiceResult<GameRoomDto, GameRoomUseCaseError>> {
  const resolvedIdentity = await resolveRoomIdentity(session, false);

  if (!resolvedIdentity.identity) {
    return mapMissingIdentity();
  }

  try {
    const started = await getDb().transaction(async (tx) => {
      const room = await loadParticipatingGameRoom(
        tx,
        resolvedIdentity.identity as MatchOwnerIdentity,
        roomId,
      );

      if (!room) {
        throw mapMissingIdentity();
      }

      const participant = findRoomParticipantByIdentity(
        room,
        resolvedIdentity.identity as MatchOwnerIdentity,
      );

      if (!participant) {
        throw mapMissingIdentity();
      }

      if (participant.playerId !== room.hostPlayerId) {
        throw failure<GameRoomUseCaseError>({
          code: 'FORBIDDEN',
          message: 'Only the host can start this room.',
        });
      }

      if (room.status !== 'open') {
        throw failure<GameRoomUseCaseError>({
          code: 'CONFLICT',
          message: 'Only open rooms can be started.',
        });
      }

      if (!roomCanStart(room)) {
        throw failure<GameRoomUseCaseError>({
          code: 'CONFLICT',
          message:
            'Every occupied seat must be ready before the room can start.',
        });
      }

      const createdAt = isoNow();
      const persistedMatch = await buildPersistedMatchFromRoom({
        room,
        createdAt,
      });

      await createGameMatch(tx, {
        match: buildMatchInsert(persistedMatch),
        participants: buildParticipantRows(persistedMatch),
        moves: buildMoveRows(persistedMatch),
      });

      await startPersistedGameRoom(tx, {
        roomId,
        activeMatchId: persistedMatch.matchId,
        updatedAt: new Date(createdAt),
      });

      const updatedRoom = await loadGameRoom(tx, roomId);

      if (!updatedRoom) {
        throw mapMissingIdentity();
      }

      return buildGameRoomDto(
        updatedRoom,
        resolvedIdentity.identity as MatchOwnerIdentity,
      );
    });

    return success(started);
  } catch (error) {
    if (error instanceof StaleGameRoomError) {
      return failure({
        code: 'CONFLICT',
        message: 'Room was updated by another request. Reload and try again.',
      });
    }

    if (
      error &&
      typeof error === 'object' &&
      'ok' in error &&
      error.ok === false
    ) {
      return error as ServiceResult<never, GameRoomUseCaseError>;
    }

    return failure({
      code: 'VALIDATION_ERROR',
      message: error instanceof Error ? error.message : 'Unable to start room.',
    });
  }
}

export async function closeGameRoomUseCase(
  session: AppSession | null,
  roomId: string,
): Promise<ServiceResult<GameRoomDto, GameRoomUseCaseError>> {
  const resolvedIdentity = await resolveRoomIdentity(session, false);

  if (!resolvedIdentity.identity) {
    return mapMissingIdentity();
  }

  const result = await getDb().transaction(async (tx) => {
    const room = await loadParticipatingGameRoom(
      tx,
      resolvedIdentity.identity as MatchOwnerIdentity,
      roomId,
    );

    if (!room) {
      return mapMissingIdentity();
    }

    const participant = findRoomParticipantByIdentity(
      room,
      resolvedIdentity.identity as MatchOwnerIdentity,
    );

    if (!participant || participant.playerId !== room.hostPlayerId) {
      return failure<GameRoomUseCaseError>({
        code: 'FORBIDDEN',
        message: 'Only the host can close this room.',
      });
    }

    await closePersistedGameRoom(tx, {
      roomId,
      updatedAt: new Date(isoNow()),
    });

    const updatedRoom = await loadGameRoom(tx, roomId);

    if (!updatedRoom) {
      return mapMissingIdentity();
    }

    return success(
      buildGameRoomDto(
        updatedRoom,
        resolvedIdentity.identity as MatchOwnerIdentity,
      ),
    );
  });

  return result;
}
