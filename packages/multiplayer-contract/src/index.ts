import type {
  GameId,
  MatchExecutionMode,
  PlayerId,
  PlayerProfile,
} from '../../game-contracts/src/index.ts';

export type RoomId = string;
export type RoomVisibility = 'private' | 'friends' | 'public';
export type PlayerConnectionStatus = 'connected' | 'reconnecting' | 'offline';

export type RoomSeat = {
  seat: number;
  playerId?: PlayerId;
  ready: boolean;
  connectionStatus: PlayerConnectionStatus;
};

export type RoomSummary = {
  roomId: RoomId;
  gameId: GameId;
  hostPlayerId: PlayerId;
  maxPlayers: number;
  visibility: RoomVisibility;
  executionMode: MatchExecutionMode;
  seats: readonly RoomSeat[];
};

export type RealtimeMatchEvent =
  | {
      type: 'room.joined' | 'room.updated';
      roomId: RoomId;
      occurredAt: string;
    }
  | {
      type: 'move.accepted';
      roomId: RoomId;
      occurredAt: string;
      playerId: PlayerId;
      moveKind: string;
    }
  | {
      type: 'match.finished';
      roomId: RoomId;
      occurredAt: string;
      winnerIds: readonly PlayerId[];
    };

export function createRoomSummary(input: {
  roomId: RoomId;
  gameId: GameId;
  hostPlayerId: PlayerId;
  visibility: RoomVisibility;
  executionMode?: MatchExecutionMode;
  maxPlayers: number;
  players: readonly PlayerProfile[];
}): RoomSummary {
  return {
    roomId: input.roomId,
    gameId: input.gameId,
    hostPlayerId: input.hostPlayerId,
    visibility: input.visibility,
    executionMode: input.executionMode ?? 'server-authoritative',
    maxPlayers: input.maxPlayers,
    seats: input.players.map((player) => ({
      seat: player.seat,
      playerId: player.playerId,
      ready: true,
      connectionStatus: 'connected',
    })),
  };
}

export function canStartRoom(room: RoomSummary): boolean {
  const occupiedSeats = room.seats.filter((seat) => seat.playerId);

  return (
    occupiedSeats.length >= 2 &&
    occupiedSeats.length <= room.maxPlayers &&
    occupiedSeats.every((seat) => seat.ready)
  );
}
