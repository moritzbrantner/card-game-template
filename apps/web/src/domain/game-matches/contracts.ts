import type {
  GameId,
  GameMove,
  MatchReplay,
  MatchReplayAcceptedMove,
  MatchReplayAnalysis,
  MatchResult,
  MatchState,
  PersistedMatchStatus,
  PlayerIdentityRef,
  ReplayFormatVersion,
  GameReplayMetadata,
} from '@repo/game-contracts';
import type {
  PokerExamplePresetId,
  PokerMove,
  PokerPlayerView,
  PokerSetup,
  PokerState,
} from '@repo/game-poker';
import type {
  UnoExamplePresetId,
  UnoMove,
  UnoPlayerView,
  UnoReplayAnalysis,
  UnoSetup,
  UnoState,
} from '@repo/game-uno';

export type MatchOwnerIdentity = Extract<
  PlayerIdentityRef,
  { kind: 'account' } | { kind: 'guest' }
>;

export type GenericGameMatchAnalysisRecord = {
  generic: MatchReplayAnalysis;
  [gameAnalysisKey: string]: unknown;
};

export type GameMatchAnalysisRecord = GenericGameMatchAnalysisRecord & {
  uno: UnoReplayAnalysis;
};

export type PersistedGameMatchParticipantRecord = {
  playerId: string;
  seat: number;
  displayName: string;
  identity: PlayerIdentityRef;
  isBot: boolean;
};

export type GameMatchParticipantRecord = PersistedGameMatchParticipantRecord;

export type PersistedGameMatchRecord<
  TGameId extends GameId = GameId,
  TState = unknown,
  TMove extends GameMove = GameMove,
  TAnalysis = GenericGameMatchAnalysisRecord,
  TSetup = unknown,
> = {
  matchId: string;
  gameId: TGameId;
  status: PersistedMatchStatus;
  executionMode: 'server-authoritative';
  replayFormatVersion: ReplayFormatVersion;
  startedAt: string;
  finishedAt: string | null;
  updatedAt: string;
  createdAt: string;
  createdBy: MatchOwnerIdentity;
  initialState: MatchState<TState>;
  latestState: MatchState<TState>;
  result: MatchResult | null;
  analysis: TAnalysis | null;
  replayMetadata: GameReplayMetadata<TSetup> | null;
  lastSequence: number;
  participants: readonly PersistedGameMatchParticipantRecord[];
  acceptedMoves: readonly MatchReplayAcceptedMove<TMove>[];
};

export type PersistedUnoMatchRecord = PersistedGameMatchRecord<
  'uno-style',
  UnoState,
  UnoMove,
  GameMatchAnalysisRecord,
  UnoSetup
>;

export type PersistedPokerMatchRecord = PersistedGameMatchRecord<
  'texas-holdem',
  PokerState,
  PokerMove,
  GenericGameMatchAnalysisRecord,
  PokerSetup
>;

export type PersistedGameMatchSummaryDto<
  TGameId extends GameId = GameId,
  TAnalysis = unknown,
> = {
  matchId: string;
  gameId: TGameId;
  status: PersistedMatchStatus;
  startedAt: string;
  finishedAt: string | null;
  updatedAt: string;
  participants: readonly PersistedGameMatchParticipantRecord[];
  result: MatchResult | null;
  analysis: TAnalysis | null;
  lastSequence: number;
};

export type PersistedUnoMatchSummaryDto = PersistedGameMatchSummaryDto<
  'uno-style',
  GameMatchAnalysisRecord
>;
export type PersistedPokerMatchSummaryDto = PersistedGameMatchSummaryDto<
  'texas-holdem',
  GenericGameMatchAnalysisRecord
>;

export type PersistedUnoMatchSnapshotDto = PersistedUnoMatchSummaryDto & {
  executionMode: 'server-authoritative';
  replayFormatVersion: ReplayFormatVersion;
  match: MatchState<UnoState>;
  legalMoves: readonly UnoMove[];
  selectedActorPlayerId: string | null;
  view: UnoPlayerView;
};

export type PersistedPokerMatchSnapshotDto = PersistedPokerMatchSummaryDto & {
  executionMode: 'server-authoritative';
  replayFormatVersion: ReplayFormatVersion;
  match: MatchState<PokerState>;
  legalMoves: readonly PokerMove[];
  selectedActorPlayerId: string | null;
  view: PokerPlayerView;
};

export type PersistedUnoReplayDto = {
  summary: PersistedUnoMatchSummaryDto;
  replay: MatchReplay<UnoState, UnoMove>;
  moves: readonly MatchReplayAcceptedMove<UnoMove>[];
  analysis: MatchReplayAnalysis;
  unoAnalysis: UnoReplayAnalysis;
};

export type PersistedPokerReplayDto = {
  summary: PersistedPokerMatchSummaryDto;
  replay: MatchReplay<PokerState, PokerMove, PokerSetup>;
  moves: readonly MatchReplayAcceptedMove<PokerMove>[];
  analysis: MatchReplayAnalysis;
};

export type ListUnoMatchesResult = {
  active: readonly PersistedUnoMatchSummaryDto[];
  recent: readonly PersistedUnoMatchSummaryDto[];
};

export type ListPokerMatchesResult = {
  active: readonly PersistedPokerMatchSummaryDto[];
  recent: readonly PersistedPokerMatchSummaryDto[];
};

export type CreateUnoMatchInput = {
  presetId: UnoExamplePresetId;
  displayName?: string | null;
};

export type CreatePokerMatchInput = {
  presetId: PokerExamplePresetId;
  displayName?: string | null;
};

export type SubmitUnoMoveInput = {
  move: UnoMove;
};

export type SubmitPokerMoveInput = {
  move: PokerMove;
};
