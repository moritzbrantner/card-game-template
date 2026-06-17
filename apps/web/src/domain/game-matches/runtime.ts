import type { GameId, GameMove } from '@repo/game-contracts';
import type { GameAdapter } from '@repo/game-engine';
import { createPokerAdapter, parsePokerMove } from '@repo/game-poker';
import { createTcgAdapter, parseTcgMove } from '@repo/game-tcg';
import { createUnoAdapter, parseUnoMove } from '@repo/game-uno';
import {
  createServerGameSession,
  resumeServerGameSession,
  type ServerGameSession,
} from '@repo/game-session';

import {
  listPokerBotAiProfiles,
  listUnoBotAiProfiles,
  type PokerBotAiProfile,
  type UnoBotAiProfile,
} from '@/src/domain/game-bot-ai/service';

import type {
  CreatePokerMatchInput,
  CreateTcgMatchInput,
  CreateUnoMatchInput,
  GameMatchParticipantRecord,
  MatchOwnerIdentity,
  PersistedGameMatchRecord,
} from './contracts';
import {
  buildPersistedPokerMatchRecord,
  buildPersistedPokerMatchSnapshotDto,
  buildPersistedPokerMatchSummaryDto,
  buildPersistedPokerReplayDto,
  buildPersistedTcgMatchRecord,
  buildPersistedTcgMatchSnapshotDto,
  buildPersistedTcgMatchSummaryDto,
  buildPersistedTcgReplayDto,
  buildPersistedUnoMatchRecord,
  buildPersistedUnoMatchSnapshotDto,
  buildPersistedUnoMatchSummaryDto,
  buildPersistedUnoReplayDto,
  buildPokerParticipants,
  buildTcgParticipants,
  buildUnoParticipants,
  createReplayFromPersistedMatch,
  processPokerBots,
  processTcgBots,
  processUnoBots,
  toSessionParticipants,
} from './service';

export type RegisteredWebMatchGameId =
  | 'uno-style'
  | 'texas-holdem'
  | 'arcane-duel';

type RuntimeBotContext =
  | readonly UnoBotAiProfile[]
  | readonly PokerBotAiProfile[];

type BuildParticipantsInput = {
  identity: MatchOwnerIdentity;
  fallbackDisplayName: string | null;
  input: unknown;
};

type CreateSetupInput = {
  matchId: string;
  input: unknown;
  participants: readonly GameMatchParticipantRecord[];
};

type BuildRecordInput = {
  createdAt: string;
  createdBy: MatchOwnerIdentity;
  participants: readonly GameMatchParticipantRecord[];
  session: ServerGameSession<unknown, GameMove>;
};

export type RegisteredGameRuntime = {
  gameId: RegisteredWebMatchGameId;
  routeSegment: 'uno' | 'poker' | 'tcg';
  featureKey: 'showcase.uno' | 'showcase.poker' | 'showcase.tcg';
  problemType: string;
  createAction: string;
  listAction: string;
  snapshotAction: string;
  eventsAction: string;
  submitMoveAction: string;
  replayAction: string;
  createAdapter(): GameAdapter<unknown, unknown, GameMove>;
  parseMove(value: unknown): GameMove;
  getPreset(presetId: string): unknown;
  loadBotContext(): Promise<RuntimeBotContext | null>;
  buildParticipants(
    input: BuildParticipantsInput,
  ): readonly GameMatchParticipantRecord[];
  createSetup(input: CreateSetupInput): unknown;
  projectView(input: unknown): unknown;
  buildAnalysis(replay: unknown): unknown;
  buildReplayDto(match: PersistedGameMatchRecord): unknown;
  buildSummaryDto(match: PersistedGameMatchRecord): unknown;
  buildSnapshotDto(
    match: PersistedGameMatchRecord,
    identity: MatchOwnerIdentity,
  ): unknown;
  buildPersistedRecord(input: BuildRecordInput): PersistedGameMatchRecord;
  processBots(
    session: ServerGameSession<unknown, GameMove>,
    participants: readonly GameMatchParticipantRecord[],
    botContext: RuntimeBotContext | null,
  ): void;
};

function createRuntimeSession(input: {
  runtime: RegisteredGameRuntime;
  matchId: string;
  participants: readonly GameMatchParticipantRecord[];
  createInput: unknown;
  now?: () => string;
}) {
  return createServerGameSession({
    adapter: input.runtime.createAdapter(),
    matchId: input.matchId,
    participants: toSessionParticipants(input.participants),
    setup: input.runtime.createSetup({
      matchId: input.matchId,
      input: input.createInput,
      participants: input.participants,
    }),
    now: input.now,
  });
}

export function createRegisteredRuntimeSession(input: {
  runtime: RegisteredGameRuntime;
  matchId: string;
  participants: readonly GameMatchParticipantRecord[];
  createInput: unknown;
  now?: () => string;
}) {
  return createRuntimeSession(input);
}

export function resumeRegisteredRuntimeSession(input: {
  runtime: RegisteredGameRuntime;
  match: PersistedGameMatchRecord;
  now?: () => string;
}) {
  return resumeServerGameSession({
    adapter: input.runtime.createAdapter(),
    participants: toSessionParticipants(input.match.participants),
    replay: createReplayFromPersistedMatch(input.match),
    now: input.now,
  });
}

const genericProjectView = (input: unknown) => input;
const genericBuildAnalysis = (replay: unknown) => replay;

export const registeredGameRuntimes = {
  'uno-style': {
    gameId: 'uno-style',
    routeSegment: 'uno',
    featureKey: 'showcase.uno',
    problemType: '/problems/uno-match-move',
    createAction: 'games.uno.matches.create',
    listAction: 'games.uno.matches.list',
    snapshotAction: 'games.uno.matches.snapshot',
    eventsAction: 'games.uno.matches.events',
    submitMoveAction: 'games.uno.matches.submitMove',
    replayAction: 'games.uno.matches.replay',
    createAdapter: () =>
      createUnoAdapter() as unknown as GameAdapter<unknown, unknown, GameMove>,
    parseMove: (value) => parseUnoMove(value) as GameMove,
    getPreset: (presetId) => presetId,
    loadBotContext: listUnoBotAiProfiles,
    buildParticipants: ({ identity, fallbackDisplayName, input }) =>
      buildUnoParticipants({
        identity,
        fallbackDisplayName,
        matchInput: input as CreateUnoMatchInput,
      }),
    createSetup: ({ matchId }) => ({ seed: matchId }),
    projectView: genericProjectView,
    buildAnalysis: genericBuildAnalysis,
    buildReplayDto: (match) => buildPersistedUnoReplayDto(match as never),
    buildSummaryDto: (match) =>
      buildPersistedUnoMatchSummaryDto(match as never),
    buildSnapshotDto: (match, identity) =>
      buildPersistedUnoMatchSnapshotDto(match as never, identity),
    buildPersistedRecord: (input) =>
      buildPersistedUnoMatchRecord({
        ...input,
        session: input.session as never,
      }) as PersistedGameMatchRecord,
    processBots: (session, participants, botContext) =>
      processUnoBots(
        session as never,
        participants,
        (botContext ?? undefined) as readonly UnoBotAiProfile[] | undefined,
      ),
  },
  'texas-holdem': {
    gameId: 'texas-holdem',
    routeSegment: 'poker',
    featureKey: 'showcase.poker',
    problemType: '/problems/poker-match-move',
    createAction: 'games.poker.matches.create',
    listAction: 'games.poker.matches.list',
    snapshotAction: 'games.poker.matches.snapshot',
    eventsAction: 'games.poker.matches.events',
    submitMoveAction: 'games.poker.matches.submitMove',
    replayAction: 'games.poker.matches.replay',
    createAdapter: () =>
      createPokerAdapter() as unknown as GameAdapter<
        unknown,
        unknown,
        GameMove
      >,
    parseMove: (value) => parsePokerMove(value) as GameMove,
    getPreset: (presetId) => presetId,
    loadBotContext: listPokerBotAiProfiles,
    buildParticipants: ({ identity, fallbackDisplayName, input }) =>
      buildPokerParticipants({
        identity,
        fallbackDisplayName,
        matchInput: input as CreatePokerMatchInput,
      }),
    createSetup: ({ matchId }) => ({ seed: matchId }),
    projectView: genericProjectView,
    buildAnalysis: genericBuildAnalysis,
    buildReplayDto: (match) => buildPersistedPokerReplayDto(match as never),
    buildSummaryDto: (match) =>
      buildPersistedPokerMatchSummaryDto(match as never),
    buildSnapshotDto: (match, identity) =>
      buildPersistedPokerMatchSnapshotDto(match as never, identity),
    buildPersistedRecord: (input) =>
      buildPersistedPokerMatchRecord({
        ...input,
        session: input.session as never,
      }) as PersistedGameMatchRecord,
    processBots: (session, participants, botContext) =>
      processPokerBots(
        session as never,
        participants,
        (botContext ?? undefined) as readonly PokerBotAiProfile[] | undefined,
      ),
  },
  'arcane-duel': {
    gameId: 'arcane-duel',
    routeSegment: 'tcg',
    featureKey: 'showcase.tcg',
    problemType: '/problems/tcg-match-move',
    createAction: 'games.tcg.matches.create',
    listAction: 'games.tcg.matches.list',
    snapshotAction: 'games.tcg.matches.snapshot',
    eventsAction: 'games.tcg.matches.events',
    submitMoveAction: 'games.tcg.matches.submitMove',
    replayAction: 'games.tcg.matches.replay',
    createAdapter: () =>
      createTcgAdapter() as unknown as GameAdapter<unknown, unknown, GameMove>,
    parseMove: (value) => parseTcgMove(value) as GameMove,
    getPreset: (presetId) => presetId,
    loadBotContext: async () => null,
    buildParticipants: ({ identity, fallbackDisplayName, input }) =>
      buildTcgParticipants({
        identity,
        fallbackDisplayName,
        matchInput: input as CreateTcgMatchInput,
      }),
    createSetup: ({ matchId }) => ({ seed: matchId }),
    projectView: genericProjectView,
    buildAnalysis: genericBuildAnalysis,
    buildReplayDto: (match) => buildPersistedTcgReplayDto(match as never),
    buildSummaryDto: (match) =>
      buildPersistedTcgMatchSummaryDto(match as never),
    buildSnapshotDto: (match, identity) =>
      buildPersistedTcgMatchSnapshotDto(match as never, identity),
    buildPersistedRecord: (input) =>
      buildPersistedTcgMatchRecord({
        ...input,
        session: input.session as never,
      }) as PersistedGameMatchRecord,
    processBots: (session, participants) =>
      processTcgBots(session as never, participants),
  },
} satisfies Record<RegisteredWebMatchGameId, RegisteredGameRuntime>;

export function getRegisteredGameRuntime(
  gameId: GameId,
): RegisteredGameRuntime | null {
  return registeredGameRuntimes[gameId as RegisteredWebMatchGameId] ?? null;
}

export function listRegisteredRuntimeGameIds(): readonly RegisteredWebMatchGameId[] {
  return Object.keys(registeredGameRuntimes) as RegisteredWebMatchGameId[];
}
