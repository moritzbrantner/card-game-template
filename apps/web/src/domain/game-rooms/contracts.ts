import type {
  GameId,
  MatchExecutionMode,
  PlayerIdentityRef,
  PlayerId,
} from '@repo/game-contracts';
import type {
  PlayerConnectionStatus,
  RoomId,
  RoomVisibility,
} from '@repo/multiplayer-contract';

import type { MatchOwnerIdentity } from '@/src/domain/game-matches/contracts';

export type GameRoomStatus = 'open' | 'active' | 'closed';

export type GameRoomParticipantRecord = {
  roomId: RoomId;
  playerId: PlayerId;
  seat: number;
  displayName: string;
  identity: PlayerIdentityRef;
  ready: boolean;
  connectionStatus: PlayerConnectionStatus;
  joinedAt: string;
  updatedAt: string;
};

export type PersistedGameRoomRecord = {
  roomId: RoomId;
  roomName: string;
  gameId: GameId;
  status: GameRoomStatus;
  visibility: RoomVisibility;
  executionMode: Extract<MatchExecutionMode, 'server-authoritative'>;
  maxPlayers: number;
  hostPlayerId: PlayerId;
  activeMatchId: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: MatchOwnerIdentity;
  participants: readonly GameRoomParticipantRecord[];
};

export type GameRoomSeatDto = {
  seat: number;
  playerId?: PlayerId;
  displayName?: string;
  ready: boolean;
  connectionStatus: PlayerConnectionStatus;
};

export type GameRoomDto = {
  roomId: RoomId;
  roomName: string;
  gameId: GameId;
  status: GameRoomStatus;
  visibility: RoomVisibility;
  executionMode: Extract<MatchExecutionMode, 'server-authoritative'>;
  maxPlayers: number;
  hostPlayerId: PlayerId;
  activeMatchId: string | null;
  createdAt: string;
  updatedAt: string;
  seats: readonly GameRoomSeatDto[];
  viewerPlayerId: PlayerId;
  viewerIsHost: boolean;
  canStart: boolean;
};

export type CreatePrivateGameRoomInput = {
  gameId: GameId;
  displayName?: string | null;
  maxPlayers?: number | null;
};

export type JoinPrivateGameRoomInput = {
  displayName?: string | null;
};

export type SetGameRoomReadyInput = {
  ready: boolean;
};
