import {
  MATCH_REPLAY_FORMAT_VERSION,
  createMatchReplay,
  summarizeMatchReplay,
  type GameId,
  type GameReplayMetadata,
  type GameMove,
  type MatchReplay,
  type PlayerIdentityRef,
} from '@repo/game-contracts';
import {
  createPokerAdapter,
  getPokerExamplePreset,
  projectPokerPlayerView,
  type PokerExamplePresetId,
  type PokerMove,
  type PokerPlayerView,
  type PokerSetup,
  type PokerState,
} from '@repo/game-poker';
import {
  createTcgAdapter,
  createTcgBots,
  getTcgExamplePreset,
  projectTcgPlayerView,
  type TcgExamplePresetId,
  type TcgMove,
  type TcgPlayerView,
  type TcgSetup,
  type TcgState,
} from '@repo/game-tcg';
import {
  createUnoAdapter,
  getUnoExamplePreset,
  projectUnoPlayerView,
  summarizeUnoReplay,
  type UnoExamplePresetId,
  type UnoMove,
  type UnoPlayerView,
  type UnoState,
  type UnoSetup,
} from '@repo/game-uno';
import {
  createServerGameSession,
  resumeServerGameSession,
  type SessionParticipant,
  type ServerGameSession,
} from '@repo/game-session';

import {
  choosePokerBotMove,
  chooseUnoBotMove,
  getDefaultPokerBotAiProfiles,
  getDefaultUnoBotAiProfiles,
  resolvePokerBotAiProfileForParticipant,
  resolveUnoBotAiProfileForParticipant,
  type PokerBotAiProfile,
  type UnoBotAiProfile,
} from '@/src/domain/game-bot-ai/service';
import type { GameRoomParticipantRecord } from '@/src/domain/game-rooms/contracts';

import type {
  CreatePokerMatchInput,
  CreateTcgMatchInput,
  CreateUnoMatchInput,
  GenericGameMatchAnalysisRecord,
  GameMatchAnalysisRecord,
  GameMatchParticipantRecord,
  MatchOwnerIdentity,
  PersistedGameMatchRecord,
  PersistedPokerMatchRecord,
  PersistedPokerMatchSnapshotDto,
  PersistedPokerMatchSummaryDto,
  PersistedPokerReplayDto,
  PersistedTcgMatchRecord,
  PersistedTcgMatchSnapshotDto,
  PersistedTcgMatchSummaryDto,
  PersistedTcgReplayDto,
  PersistedUnoMatchRecord,
  PersistedUnoMatchSnapshotDto,
  PersistedUnoMatchSummaryDto,
  PersistedUnoReplayDto,
} from './contracts';

const unoAdapter = createUnoAdapter();
const pokerAdapter = createPokerAdapter();
const tcgAdapter = createTcgAdapter();
type UnoServerSession = ServerGameSession<UnoState, UnoMove>;
type PokerServerSession = ServerGameSession<PokerState, PokerMove>;
type TcgServerSession = ServerGameSession<TcgState, TcgMove>;

function matchesIdentity(
  identity: MatchOwnerIdentity,
  participant: GameMatchParticipantRecord,
) {
  if (participant.identity.kind === 'bot') {
    return false;
  }

  return identity.kind === 'account'
    ? participant.identity.kind === 'account' &&
        participant.identity.accountId === identity.accountId
    : participant.identity.kind === 'guest' &&
        participant.identity.guestId === identity.guestId;
}

export function toSessionParticipants(
  participants: readonly GameMatchParticipantRecord[],
): SessionParticipant[] {
  return participants.map((participant) => ({
    playerId: participant.playerId,
    displayName: participant.displayName,
    seat: participant.seat,
    controller: participant.isBot ? 'bot' : 'human',
    ...(participant.identity.kind === 'account'
      ? { accountId: participant.identity.accountId }
      : {}),
    ...(participant.identity.kind === 'guest' ? { isGuest: true } : {}),
  }));
}

function getViewerPlayerId(
  participants: readonly GameMatchParticipantRecord[],
  identity: MatchOwnerIdentity,
) {
  return (
    participants.find((participant) => matchesIdentity(identity, participant))
      ?.playerId ?? null
  );
}

function createAnalysisRecord(
  replay: MatchReplay<UnoState, UnoMove>,
): GameMatchAnalysisRecord {
  return {
    generic: summarizeMatchReplay(replay),
    uno: summarizeUnoReplay(replay),
  };
}

function buildView(input: {
  participants: readonly GameMatchParticipantRecord[];
  state: PersistedUnoMatchRecord['latestState'];
  matchResult: PersistedUnoMatchRecord['result'];
  legalMoves: readonly UnoMove[];
  selectedActorPlayerId: string | null;
  viewerPlayerId: string | null;
}): UnoPlayerView {
  return projectUnoPlayerView({
    legalMoves: input.legalMoves,
    matchResult: input.matchResult,
    participants: toSessionParticipants(input.participants),
    pendingHotseatPlayerId: null,
    selectedActorPlayerId: input.selectedActorPlayerId,
    state: input.state,
    viewerPlayerId: input.viewerPlayerId,
  });
}

function buildPokerView(input: {
  participants: readonly GameMatchParticipantRecord[];
  state: PersistedPokerMatchRecord['latestState'];
  matchResult: PersistedPokerMatchRecord['result'];
  legalMoves: readonly PokerMove[];
  selectedActorPlayerId: string | null;
  viewerPlayerId: string | null;
}): PokerPlayerView {
  return projectPokerPlayerView({
    legalMoves: input.legalMoves,
    matchResult: input.matchResult,
    participants: toSessionParticipants(input.participants),
    pendingHotseatPlayerId: null,
    selectedActorPlayerId: input.selectedActorPlayerId,
    state: input.state,
    viewerPlayerId: input.viewerPlayerId,
  });
}

function buildTcgView(input: {
  participants: readonly GameMatchParticipantRecord[];
  state: PersistedTcgMatchRecord['latestState'];
  matchResult: PersistedTcgMatchRecord['result'];
  legalMoves: readonly TcgMove[];
  selectedActorPlayerId: string | null;
  viewerPlayerId: string | null;
}): TcgPlayerView {
  return projectTcgPlayerView({
    legalMoves: input.legalMoves,
    matchResult: input.matchResult,
    participants: toSessionParticipants(input.participants),
    pendingHotseatPlayerId: null,
    selectedActorPlayerId: input.selectedActorPlayerId,
    state: input.state,
    viewerPlayerId: input.viewerPlayerId,
  });
}

export function createReplayFromPersistedMatch<
  TState,
  TMove extends GameMove,
  TSetup = unknown,
>(
  match: PersistedGameMatchRecord<
    GameId,
    TState,
    TMove,
    GenericGameMatchAnalysisRecord,
    TSetup
  >,
) {
  return createMatchReplay({
    startedAt: match.startedAt,
    initialState: match.initialState,
    latestState: match.latestState,
    acceptedMoves: match.acceptedMoves,
    finishedAt: match.finishedAt,
    metadata: match.replayMetadata,
    result: match.result,
  });
}

export function buildPersistedUnoMatchSummaryDto(
  match: PersistedUnoMatchRecord,
): PersistedUnoMatchSummaryDto {
  return {
    matchId: match.matchId,
    gameId: 'uno-style',
    status: match.status,
    startedAt: match.startedAt,
    finishedAt: match.finishedAt,
    updatedAt: match.updatedAt,
    participants: match.participants,
    result: match.result,
    analysis: match.analysis,
    lastSequence: match.lastSequence,
  };
}

export function buildPersistedPokerMatchSummaryDto(
  match: PersistedPokerMatchRecord,
): PersistedPokerMatchSummaryDto {
  return {
    matchId: match.matchId,
    gameId: 'texas-holdem',
    status: match.status,
    startedAt: match.startedAt,
    finishedAt: match.finishedAt,
    updatedAt: match.updatedAt,
    participants: match.participants,
    result: match.result,
    analysis: match.analysis,
    lastSequence: match.lastSequence,
  };
}

export function buildPersistedTcgMatchSummaryDto(
  match: PersistedTcgMatchRecord,
): PersistedTcgMatchSummaryDto {
  return {
    matchId: match.matchId,
    gameId: 'arcane-duel',
    status: match.status,
    startedAt: match.startedAt,
    finishedAt: match.finishedAt,
    updatedAt: match.updatedAt,
    participants: match.participants,
    result: match.result,
    analysis: match.analysis,
    lastSequence: match.lastSequence,
  };
}

export function buildPersistedUnoMatchSnapshotDto(
  match: PersistedUnoMatchRecord,
  identity: MatchOwnerIdentity,
): PersistedUnoMatchSnapshotDto {
  const viewerPlayerId = getViewerPlayerId(match.participants, identity);

  if (match.status !== 'active') {
    return {
      ...buildPersistedUnoMatchSummaryDto(match),
      executionMode: 'server-authoritative',
      replayFormatVersion: match.replayFormatVersion,
      match: match.latestState,
      legalMoves: [],
      selectedActorPlayerId: null,
      view: buildView({
        participants: match.participants,
        state: match.latestState,
        matchResult: match.result,
        legalMoves: [],
        selectedActorPlayerId: null,
        viewerPlayerId,
      }),
    };
  }

  const session = resumeServerGameSession({
    adapter: unoAdapter,
    participants: toSessionParticipants(match.participants),
    replay: createReplayFromPersistedMatch(match),
  });
  const snapshot = session.getSnapshot();

  return {
    ...buildPersistedUnoMatchSummaryDto(match),
    executionMode: 'server-authoritative',
    replayFormatVersion: match.replayFormatVersion,
    match: snapshot.match,
    legalMoves: snapshot.legalMoves,
    selectedActorPlayerId: snapshot.selectedActorPlayerId,
    view: buildView({
      participants: match.participants,
      state: snapshot.match,
      matchResult: snapshot.matchResult,
      legalMoves: snapshot.legalMoves,
      selectedActorPlayerId: snapshot.selectedActorPlayerId,
      viewerPlayerId,
    }),
  };
}

export function buildPersistedUnoReplayDto(
  match: PersistedUnoMatchRecord,
): PersistedUnoReplayDto {
  const replay = createReplayFromPersistedMatch(match);
  const analysis = match.analysis ?? createAnalysisRecord(replay);

  return {
    summary: buildPersistedUnoMatchSummaryDto(match),
    replay,
    moves: replay.acceptedMoves,
    analysis: analysis.generic,
    unoAnalysis: analysis.uno,
  };
}

export function buildPersistedPokerMatchSnapshotDto(
  match: PersistedPokerMatchRecord,
  identity: MatchOwnerIdentity,
): PersistedPokerMatchSnapshotDto {
  const viewerPlayerId = getViewerPlayerId(match.participants, identity);

  if (match.status !== 'active') {
    return {
      ...buildPersistedPokerMatchSummaryDto(match),
      executionMode: 'server-authoritative',
      replayFormatVersion: match.replayFormatVersion,
      match: match.latestState,
      legalMoves: [],
      selectedActorPlayerId: null,
      view: buildPokerView({
        participants: match.participants,
        state: match.latestState,
        matchResult: match.result,
        legalMoves: [],
        selectedActorPlayerId: null,
        viewerPlayerId,
      }),
    };
  }

  const session = resumeServerGameSession({
    adapter: pokerAdapter,
    participants: toSessionParticipants(match.participants),
    replay: createReplayFromPersistedMatch(match),
  });
  const snapshot = session.getSnapshot();

  return {
    ...buildPersistedPokerMatchSummaryDto(match),
    executionMode: 'server-authoritative',
    replayFormatVersion: match.replayFormatVersion,
    match: snapshot.match,
    legalMoves: snapshot.legalMoves,
    selectedActorPlayerId: snapshot.selectedActorPlayerId,
    view: buildPokerView({
      participants: match.participants,
      state: snapshot.match,
      matchResult: snapshot.matchResult,
      legalMoves: snapshot.legalMoves,
      selectedActorPlayerId: snapshot.selectedActorPlayerId,
      viewerPlayerId,
    }),
  };
}

export function buildPersistedPokerReplayDto(
  match: PersistedPokerMatchRecord,
): PersistedPokerReplayDto {
  const replay = createReplayFromPersistedMatch<
    PokerState,
    PokerMove,
    PokerSetup
  >(match);
  const analysis = match.analysis ?? {
    generic: summarizeMatchReplay(replay),
  };

  return {
    summary: buildPersistedPokerMatchSummaryDto(match),
    replay,
    moves: replay.acceptedMoves,
    analysis: analysis.generic,
  };
}

export function buildPersistedTcgMatchSnapshotDto(
  match: PersistedTcgMatchRecord,
  identity: MatchOwnerIdentity,
): PersistedTcgMatchSnapshotDto {
  const viewerPlayerId = getViewerPlayerId(match.participants, identity);

  if (match.status !== 'active') {
    return {
      ...buildPersistedTcgMatchSummaryDto(match),
      executionMode: 'server-authoritative',
      replayFormatVersion: match.replayFormatVersion,
      match: match.latestState,
      legalMoves: [],
      selectedActorPlayerId: null,
      view: buildTcgView({
        participants: match.participants,
        state: match.latestState,
        matchResult: match.result,
        legalMoves: [],
        selectedActorPlayerId: null,
        viewerPlayerId,
      }),
    };
  }

  const session = resumeServerGameSession({
    adapter: tcgAdapter,
    participants: toSessionParticipants(match.participants),
    replay: createReplayFromPersistedMatch(match),
  });
  const snapshot = session.getSnapshot();

  return {
    ...buildPersistedTcgMatchSummaryDto(match),
    executionMode: 'server-authoritative',
    replayFormatVersion: match.replayFormatVersion,
    match: snapshot.match,
    legalMoves: snapshot.legalMoves,
    selectedActorPlayerId: snapshot.selectedActorPlayerId,
    view: buildTcgView({
      participants: match.participants,
      state: snapshot.match,
      matchResult: snapshot.matchResult,
      legalMoves: snapshot.legalMoves,
      selectedActorPlayerId: snapshot.selectedActorPlayerId,
      viewerPlayerId,
    }),
  };
}

export function buildPersistedTcgReplayDto(
  match: PersistedTcgMatchRecord,
): PersistedTcgReplayDto {
  const replay = createReplayFromPersistedMatch<TcgState, TcgMove, TcgSetup>(
    match,
  );
  const analysis = match.analysis ?? {
    generic: summarizeMatchReplay(replay),
  };

  return {
    summary: buildPersistedTcgMatchSummaryDto(match),
    replay,
    moves: replay.acceptedMoves,
    analysis: analysis.generic,
  };
}

function buildParticipantDisplayName(input: {
  requestedDisplayName: string | null | undefined;
  fallbackDisplayName: string | null;
}) {
  const requested = input.requestedDisplayName?.trim();
  if (requested) {
    return requested;
  }

  const fallback = input.fallbackDisplayName?.trim();
  if (fallback) {
    return fallback;
  }

  throw new Error('A player display name is required.');
}

export function buildRoomMatchParticipants(input: {
  seats: readonly Pick<
    GameRoomParticipantRecord,
    'seat' | 'playerId' | 'displayName' | 'identity'
  >[];
  maxPlayers: number;
  botCount: number;
}): readonly GameMatchParticipantRecord[] {
  const sortedSeats = [...input.seats].sort(
    (left, right) => left.seat - right.seat,
  );
  const occupiedSeats = new Set(sortedSeats.map((seat) => seat.seat));
  const botSeats = Array.from(
    { length: input.maxPlayers },
    (_, index) => index + 1,
  )
    .filter((seat) => !occupiedSeats.has(seat))
    .slice(0, input.botCount);

  return [
    ...sortedSeats.map((seat) => ({
      playerId: seat.playerId,
      seat: seat.seat,
      displayName: seat.displayName,
      identity: seat.identity,
      isBot: false,
    })),
    ...botSeats.map((seat, index) => ({
      playerId: `bot-room-seat-${seat}`,
      seat,
      displayName: `Bot ${index + 1}`,
      identity: { kind: 'bot' } satisfies PlayerIdentityRef,
      isBot: true,
    })),
  ].sort((left, right) => left.seat - right.seat);
}

export function buildUnoParticipants(input: {
  identity: MatchOwnerIdentity;
  fallbackDisplayName: string | null;
  matchInput: CreateUnoMatchInput;
}): readonly GameMatchParticipantRecord[] {
  const preset = getUnoExamplePreset(input.matchInput.presetId);
  const ownerDisplayName = buildParticipantDisplayName({
    requestedDisplayName: input.matchInput.displayName,
    fallbackDisplayName: input.fallbackDisplayName,
  });

  return preset.seats.map((seat, index) => {
    if (index === 0) {
      return {
        playerId: seat.playerId,
        seat: seat.seat,
        displayName: ownerDisplayName,
        identity: input.identity,
        isBot: false,
      };
    }

    return {
      playerId: seat.playerId,
      seat: seat.seat,
      displayName:
        seat.controller === 'bot'
          ? seat.displayName
          : `${seat.displayName} Bot`,
      identity: { kind: 'bot' } satisfies PlayerIdentityRef,
      isBot: true,
    };
  });
}

export function buildPokerParticipants(input: {
  identity: MatchOwnerIdentity;
  fallbackDisplayName: string | null;
  matchInput: CreatePokerMatchInput;
}): readonly GameMatchParticipantRecord[] {
  const preset = getPokerExamplePreset(input.matchInput.presetId);
  const ownerDisplayName = buildParticipantDisplayName({
    requestedDisplayName: input.matchInput.displayName,
    fallbackDisplayName: input.fallbackDisplayName,
  });

  return preset.seats.map((seat, index) => {
    if (index === 0) {
      return {
        playerId: seat.playerId,
        seat: seat.seat,
        displayName: ownerDisplayName,
        identity: input.identity,
        isBot: false,
      };
    }

    return {
      playerId: seat.playerId,
      seat: seat.seat,
      displayName:
        seat.controller === 'bot'
          ? seat.displayName
          : `${seat.displayName} Bot`,
      identity: { kind: 'bot' } satisfies PlayerIdentityRef,
      isBot: true,
    };
  });
}

export function buildTcgParticipants(input: {
  identity: MatchOwnerIdentity;
  fallbackDisplayName: string | null;
  matchInput: CreateTcgMatchInput;
}): readonly GameMatchParticipantRecord[] {
  const preset = getTcgExamplePreset(input.matchInput.presetId);
  const ownerDisplayName = buildParticipantDisplayName({
    requestedDisplayName: input.matchInput.displayName,
    fallbackDisplayName: input.fallbackDisplayName,
  });

  return preset.seats.map((seat, index) => {
    if (index === 0) {
      return {
        playerId: seat.playerId,
        seat: seat.seat,
        displayName: ownerDisplayName,
        identity: input.identity,
        isBot: false,
      };
    }

    return {
      playerId: seat.playerId,
      seat: seat.seat,
      displayName:
        seat.controller === 'bot'
          ? seat.displayName
          : `${seat.displayName} Bot`,
      identity: { kind: 'bot' } satisfies PlayerIdentityRef,
      isBot: true,
    };
  });
}

export function createUnoMatchSession(input: {
  matchId: string;
  identity: MatchOwnerIdentity;
  fallbackDisplayName: string | null;
  presetId: UnoExamplePresetId;
  displayName?: string | null;
  botAiProfiles?: readonly UnoBotAiProfile[];
  now?: () => string;
}) {
  const participants = buildUnoParticipants({
    identity: input.identity,
    fallbackDisplayName: input.fallbackDisplayName,
    matchInput: {
      presetId: input.presetId,
      displayName: input.displayName,
    },
  });
  const sessionParticipants = toSessionParticipants(participants);
  const session = createServerGameSession({
    adapter: unoAdapter,
    matchId: input.matchId,
    participants: sessionParticipants,
    setup: {
      seed: input.matchId,
    },
    now: input.now,
  });

  processUnoBots(session, participants, input.botAiProfiles);

  return {
    participants,
    session,
  };
}

export function createUnoMatchSessionFromParticipants(input: {
  matchId: string;
  participants: readonly GameMatchParticipantRecord[];
  botAiProfiles?: readonly UnoBotAiProfile[];
  now?: () => string;
}) {
  const session = createServerGameSession({
    adapter: unoAdapter,
    matchId: input.matchId,
    participants: toSessionParticipants(input.participants),
    setup: {
      seed: input.matchId,
    },
    now: input.now,
  });

  processUnoBots(session, input.participants, input.botAiProfiles);

  return {
    participants: input.participants,
    session,
  };
}

export function createPokerMatchSession(input: {
  matchId: string;
  identity: MatchOwnerIdentity;
  fallbackDisplayName: string | null;
  presetId: PokerExamplePresetId;
  displayName?: string | null;
  botAiProfiles?: readonly PokerBotAiProfile[];
  now?: () => string;
}) {
  const participants = buildPokerParticipants({
    identity: input.identity,
    fallbackDisplayName: input.fallbackDisplayName,
    matchInput: {
      presetId: input.presetId,
      displayName: input.displayName,
    },
  });
  const sessionParticipants = toSessionParticipants(participants);
  const session = createServerGameSession({
    adapter: pokerAdapter,
    matchId: input.matchId,
    participants: sessionParticipants,
    setup: {
      seed: input.matchId,
    },
    now: input.now,
  });

  processPokerBots(session, participants, input.botAiProfiles);

  return {
    participants,
    session,
  };
}

export function createPokerMatchSessionFromParticipants(input: {
  matchId: string;
  participants: readonly GameMatchParticipantRecord[];
  botAiProfiles?: readonly PokerBotAiProfile[];
  now?: () => string;
}) {
  const session = createServerGameSession({
    adapter: pokerAdapter,
    matchId: input.matchId,
    participants: toSessionParticipants(input.participants),
    setup: {
      seed: input.matchId,
    },
    now: input.now,
  });

  processPokerBots(session, input.participants, input.botAiProfiles);

  return {
    participants: input.participants,
    session,
  };
}

export function createTcgMatchSession(input: {
  matchId: string;
  identity: MatchOwnerIdentity;
  fallbackDisplayName: string | null;
  presetId: TcgExamplePresetId;
  displayName?: string | null;
  now?: () => string;
}) {
  const participants = buildTcgParticipants({
    identity: input.identity,
    fallbackDisplayName: input.fallbackDisplayName,
    matchInput: {
      presetId: input.presetId,
      displayName: input.displayName,
    },
  });
  const sessionParticipants = toSessionParticipants(participants);
  const session = createServerGameSession({
    adapter: tcgAdapter,
    matchId: input.matchId,
    participants: sessionParticipants,
    setup: {
      seed: input.matchId,
    },
    now: input.now,
  });

  processTcgBots(session, participants);

  return {
    participants,
    session,
  };
}

export function createTcgMatchSessionFromParticipants(input: {
  matchId: string;
  participants: readonly GameMatchParticipantRecord[];
  now?: () => string;
}) {
  const session = createServerGameSession({
    adapter: tcgAdapter,
    matchId: input.matchId,
    participants: toSessionParticipants(input.participants),
    setup: {
      seed: input.matchId,
    },
    now: input.now,
  });

  processTcgBots(session, input.participants);

  return {
    participants: input.participants,
    session,
  };
}

export function processUnoBots(
  session: UnoServerSession,
  participants: readonly GameMatchParticipantRecord[],
  botAiProfiles: readonly UnoBotAiProfile[] = getDefaultUnoBotAiProfiles(),
) {
  while (!session.getSnapshot().matchResult) {
    const snapshot = session.getSnapshot();
    const selectedActorPlayerId = snapshot.selectedActorPlayerId;
    const activeParticipant = selectedActorPlayerId
      ? participants.find(
          (participant) => participant.playerId === selectedActorPlayerId,
        )
      : null;

    if (!activeParticipant?.isBot) {
      break;
    }

    const legalMoves = snapshot.legalMoves.filter(
      (move) => move.playerId === activeParticipant.playerId,
    );
    const profile = resolveUnoBotAiProfileForParticipant(
      activeParticipant,
      botAiProfiles,
    );
    const move =
      chooseUnoBotMove({
        legalMoves,
        playerId: activeParticipant.playerId,
        profile,
        seed: snapshot.match.matchId,
        state: snapshot.match.state,
      }) ??
      legalMoves[0] ??
      null;

    if (!move) {
      break;
    }

    session.submitMove(move);
  }
}

export function processPokerBots(
  session: PokerServerSession,
  participants: readonly GameMatchParticipantRecord[],
  botAiProfiles: readonly PokerBotAiProfile[] = getDefaultPokerBotAiProfiles(),
) {
  while (!session.getSnapshot().matchResult) {
    const snapshot = session.getSnapshot();
    const selectedActorPlayerId = snapshot.selectedActorPlayerId;
    const activeParticipant = selectedActorPlayerId
      ? participants.find(
          (participant) => participant.playerId === selectedActorPlayerId,
        )
      : null;

    if (!activeParticipant?.isBot) {
      break;
    }

    const profile = resolvePokerBotAiProfileForParticipant(
      activeParticipant,
      botAiProfiles,
    );
    const move =
      choosePokerBotMove({
        legalMoves: snapshot.legalMoves,
        playerId: activeParticipant.playerId,
        profile,
        seed: snapshot.match.matchId,
        state: snapshot.match.state,
      }) ??
      snapshot.legalMoves[0] ??
      null;

    if (!move) {
      break;
    }

    session.submitMove(move);
  }
}

export function processTcgBots(
  session: TcgServerSession,
  participants: readonly GameMatchParticipantRecord[],
) {
  const bots = createTcgBots(toSessionParticipants(participants));

  while (!session.getSnapshot().matchResult) {
    const snapshot = session.getSnapshot();
    const selectedActorPlayerId = snapshot.selectedActorPlayerId;
    const activeParticipant = selectedActorPlayerId
      ? participants.find(
          (participant) => participant.playerId === selectedActorPlayerId,
        )
      : null;

    if (!activeParticipant?.isBot) {
      break;
    }

    const move =
      bots[activeParticipant.playerId]?.chooseMove({
        legalMoves: snapshot.legalMoves,
        participants: toSessionParticipants(participants),
        playerId: activeParticipant.playerId,
        state: snapshot.match,
      }) ??
      snapshot.legalMoves.find(
        (candidate) => candidate.playerId === activeParticipant.playerId,
      ) ??
      null;

    if (!move) {
      break;
    }

    session.submitMove(move);
  }
}

export function buildPersistedGameMatchRecord<
  TGameId extends GameId = GameId,
  TState = unknown,
  TMove extends GameMove = GameMove,
  TAnalysis extends GenericGameMatchAnalysisRecord =
    GenericGameMatchAnalysisRecord,
  TSetup = unknown,
>(input: {
  createdAt: string;
  createdBy: MatchOwnerIdentity;
  participants: readonly GameMatchParticipantRecord[];
  session: ServerGameSession<TState, TMove>;
  analysis?: TAnalysis;
  status?: PersistedGameMatchRecord['status'];
  finishedAt?: string | null;
}): PersistedGameMatchRecord<TGameId, TState, TMove, TAnalysis, TSetup> {
  const replay = input.session.getReplay();
  const analysis =
    input.analysis ??
    ({
      generic: summarizeMatchReplay(replay),
    } as TAnalysis);
  const status =
    input.status ??
    (input.session.getSnapshot().matchResult ? 'completed' : 'active');

  return {
    matchId: replay.matchId,
    gameId: replay.gameId as TGameId,
    status,
    executionMode: 'server-authoritative' as const,
    replayFormatVersion: MATCH_REPLAY_FORMAT_VERSION,
    startedAt: replay.startedAt,
    finishedAt: input.finishedAt ?? replay.finishedAt,
    updatedAt: input.finishedAt ?? replay.finishedAt ?? input.createdAt,
    createdAt: input.createdAt,
    createdBy: input.createdBy,
    initialState: replay.initialState,
    latestState: replay.latestState,
    result: replay.result,
    analysis,
    replayMetadata: replay.metadata as GameReplayMetadata<TSetup> | null,
    lastSequence: replay.acceptedMoves.length,
    participants: input.participants,
    acceptedMoves: replay.acceptedMoves,
  };
}

export function buildPersistedUnoMatchRecord(input: {
  createdAt: string;
  createdBy: MatchOwnerIdentity;
  participants: readonly GameMatchParticipantRecord[];
  session: UnoServerSession;
  status?: PersistedUnoMatchRecord['status'];
  finishedAt?: string | null;
}) {
  const replay = input.session.getReplay();

  return buildPersistedGameMatchRecord<
    'uno-style',
    UnoState,
    UnoMove,
    GameMatchAnalysisRecord,
    UnoSetup
  >({
    ...input,
    analysis: createAnalysisRecord(replay),
  });
}

export function buildPersistedPokerMatchRecord(input: {
  createdAt: string;
  createdBy: MatchOwnerIdentity;
  participants: readonly GameMatchParticipantRecord[];
  session: PokerServerSession;
  status?: PersistedPokerMatchRecord['status'];
  finishedAt?: string | null;
}) {
  return buildPersistedGameMatchRecord<
    'texas-holdem',
    PokerState,
    PokerMove,
    GenericGameMatchAnalysisRecord,
    PokerSetup
  >(input);
}

export function buildPersistedTcgMatchRecord(input: {
  createdAt: string;
  createdBy: MatchOwnerIdentity;
  participants: readonly GameMatchParticipantRecord[];
  session: TcgServerSession;
  status?: PersistedTcgMatchRecord['status'];
  finishedAt?: string | null;
}) {
  return buildPersistedGameMatchRecord<
    'arcane-duel',
    TcgState,
    TcgMove,
    GenericGameMatchAnalysisRecord,
    TcgSetup
  >(input);
}
