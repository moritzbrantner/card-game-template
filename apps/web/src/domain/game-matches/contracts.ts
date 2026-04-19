import type {
  MatchReplay,
  MatchReplayAcceptedMove,
  MatchReplayAnalysis,
  MatchResult,
  MatchState,
  PersistedMatchStatus,
  PlayerIdentityRef,
  ReplayFormatVersion,
} from '@repo/game-contracts';
import type {
  UnoExamplePresetId,
  UnoMove,
  UnoPlayerView,
  UnoReplayAnalysis,
  UnoState,
} from '@repo/game-uno';

export type MatchOwnerIdentity = Extract<PlayerIdentityRef, { kind: 'account' } | { kind: 'guest' }>;

export type GameMatchAnalysisRecord = {
  generic: MatchReplayAnalysis;
  uno: UnoReplayAnalysis;
};

export type GameMatchParticipantRecord = {
  playerId: string;
  seat: number;
  displayName: string;
  identity: PlayerIdentityRef;
  isBot: boolean;
};

export type PersistedUnoMatchRecord = {
  matchId: string;
  gameId: 'uno-style';
  status: PersistedMatchStatus;
  executionMode: 'server-authoritative';
  replayFormatVersion: ReplayFormatVersion;
  startedAt: string;
  finishedAt: string | null;
  updatedAt: string;
  createdAt: string;
  createdBy: MatchOwnerIdentity;
  initialState: MatchState<UnoState>;
  latestState: MatchState<UnoState>;
  result: MatchResult | null;
  analysis: GameMatchAnalysisRecord | null;
  lastSequence: number;
  participants: readonly GameMatchParticipantRecord[];
  acceptedMoves: readonly MatchReplayAcceptedMove<UnoMove>[];
};

export type PersistedUnoMatchSummaryDto = {
  matchId: string;
  gameId: 'uno-style';
  status: PersistedMatchStatus;
  startedAt: string;
  finishedAt: string | null;
  updatedAt: string;
  participants: readonly GameMatchParticipantRecord[];
  result: MatchResult | null;
  analysis: GameMatchAnalysisRecord | null;
  lastSequence: number;
};

export type PersistedUnoMatchSnapshotDto = PersistedUnoMatchSummaryDto & {
  executionMode: 'server-authoritative';
  replayFormatVersion: ReplayFormatVersion;
  match: MatchState<UnoState>;
  legalMoves: readonly UnoMove[];
  selectedActorPlayerId: string | null;
  view: UnoPlayerView;
};

export type PersistedUnoReplayDto = {
  summary: PersistedUnoMatchSummaryDto;
  replay: MatchReplay<UnoState, UnoMove>;
  moves: readonly MatchReplayAcceptedMove<UnoMove>[];
  analysis: MatchReplayAnalysis;
  unoAnalysis: UnoReplayAnalysis;
};

export type ListUnoMatchesResult = {
  active: readonly PersistedUnoMatchSummaryDto[];
  recent: readonly PersistedUnoMatchSummaryDto[];
};

export type CreateUnoMatchInput = {
  presetId: UnoExamplePresetId;
  displayName?: string | null;
};

export type SubmitUnoMoveInput = {
  move: UnoMove;
};
