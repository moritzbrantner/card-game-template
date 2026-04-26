import type { GameMove, MatchState, PlayerId } from '@repo/game-contracts';
import { createSeededRandom } from '@repo/game-engine';
import {
  choosePhase10Move,
  type Phase10Card,
  type Phase10Move,
  type Phase10PhaseDefinition,
  type Phase10State,
} from '@repo/game-phase-10';
import type {
  LocalGameSessionBot,
  SessionParticipant,
} from '@repo/game-session';
import type { PokerBetMove, PokerMove, PokerState } from '@repo/game-poker';
import type { UnoCard, UnoMove, UnoState } from '@repo/game-uno';

export type UnoBotAiProfileId =
  | 'house-bot'
  | 'table-bot'
  | 'player-two-bot'
  | 'fallback-bot';

export type UnoBotAiProfile = {
  id: UnoBotAiProfileId;
  displayName: string;
  description: string;
  enabled: boolean;
  aggression: number;
  actionCardBias: number;
  wildCardBias: number;
  drawBias: number;
  unoCallBias: number;
  notes: string;
};

export type PokerBotAiProfileId = 'caller-bot' | 'check-bot' | 'fallback-bot';

export type PokerBotAiProfile = {
  id: PokerBotAiProfileId;
  displayName: string;
  description: string;
  enabled: boolean;
  betBias: number;
  callBias: number;
  foldBias: number;
  bigBetBias: number;
  stackPreservationBias: number;
  notes: string;
};

export type Phase10BotAiProfileId =
  | 'run-bot'
  | 'set-bot'
  | 'phase-bot'
  | 'fallback-bot';

export type Phase10BotAiProfile = {
  id: Phase10BotAiProfileId;
  displayName: string;
  description: string;
  enabled: boolean;
  phaseLayBias: number;
  hitBias: number;
  discardPickupBias: number;
  wildRetentionBias: number;
  highCardDiscardBias: number;
  notes: string;
};

type BotParticipantLike = {
  displayName: string;
};

type ScoreMoveInput<TMove extends GameMove> = {
  moves: readonly TMove[];
  seed: number | string;
  score: (move: TMove) => number;
};

const defaultUnoProfiles: readonly UnoBotAiProfile[] = [
  {
    id: 'house-bot',
    displayName: 'House Bot',
    description:
      'Default duel opponent that keeps the hand moving and usually saves wilds.',
    enabled: true,
    aggression: 50,
    actionCardBias: 55,
    wildCardBias: -110,
    drawBias: -20,
    unoCallBias: 95,
    notes: '',
  },
  {
    id: 'table-bot',
    displayName: 'Table Bot',
    description:
      'Pressure-oriented table opponent that spends action cards early.',
    enabled: true,
    aggression: 85,
    actionCardBias: 110,
    wildCardBias: -20,
    drawBias: -75,
    unoCallBias: 95,
    notes: '',
  },
  {
    id: 'player-two-bot',
    displayName: 'Player Two Bot',
    description:
      'Conservative solo-fill bot that waits longer before spending wild cards.',
    enabled: true,
    aggression: 30,
    actionCardBias: 5,
    wildCardBias: -160,
    drawBias: 25,
    unoCallBias: 85,
    notes: '',
  },
  {
    id: 'fallback-bot',
    displayName: 'Fallback Bot',
    description: 'Shared UNO ruleset for bot seats without a named profile.',
    enabled: true,
    aggression: 50,
    actionCardBias: 45,
    wildCardBias: -100,
    drawBias: 0,
    unoCallBias: 90,
    notes: '',
  },
] as const;

const defaultPokerProfiles: readonly PokerBotAiProfile[] = [
  {
    id: 'caller-bot',
    displayName: 'Caller Bot',
    description:
      'Leans toward staying in hands, then takes modest betting lines.',
    enabled: true,
    betBias: 10,
    callBias: 80,
    foldBias: -25,
    bigBetBias: -10,
    stackPreservationBias: 20,
    notes: '',
  },
  {
    id: 'check-bot',
    displayName: 'Check Bot',
    description:
      'Pot-control profile that checks often and protects short stacks.',
    enabled: true,
    betBias: -40,
    callBias: 10,
    foldBias: 70,
    bigBetBias: -45,
    stackPreservationBias: 95,
    notes: '',
  },
  {
    id: 'fallback-bot',
    displayName: 'Fallback Bot',
    description: 'Shared poker ruleset for bot seats without a named profile.',
    enabled: true,
    betBias: 0,
    callBias: 35,
    foldBias: 10,
    bigBetBias: 0,
    stackPreservationBias: 50,
    notes: '',
  },
] as const;

const defaultPhase10Profiles: readonly Phase10BotAiProfile[] = [
  {
    id: 'run-bot',
    displayName: 'Run Bot',
    description:
      'Prioritizes drawing into a clean phase and keeping wilds for later.',
    enabled: true,
    phaseLayBias: 120,
    hitBias: 20,
    discardPickupBias: 85,
    wildRetentionBias: 125,
    highCardDiscardBias: 35,
    notes: '',
  },
  {
    id: 'set-bot',
    displayName: 'Set Bot',
    description:
      'Commits hard to matching sets and rarely throws away useful numbers.',
    enabled: true,
    phaseLayBias: 140,
    hitBias: 10,
    discardPickupBias: 110,
    wildRetentionBias: 150,
    highCardDiscardBias: 15,
    notes: '',
  },
  {
    id: 'phase-bot',
    displayName: 'Phase Bot',
    description:
      'Balanced finisher for bot-duel mode that values laying and hitting.',
    enabled: true,
    phaseLayBias: 135,
    hitBias: 80,
    discardPickupBias: 70,
    wildRetentionBias: 110,
    highCardDiscardBias: 55,
    notes: '',
  },
  {
    id: 'fallback-bot',
    displayName: 'Fallback Bot',
    description:
      'Shared Phase 10 ruleset for bot seats without a named profile.',
    enabled: true,
    phaseLayBias: 125,
    hitBias: 45,
    discardPickupBias: 75,
    wildRetentionBias: 110,
    highCardDiscardBias: 45,
    notes: '',
  },
] as const;

function clampInteger(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
) {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number.parseFloat(value)
        : Number.NaN;

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.round(parsed)));
}

function trimText(value: unknown, fallback: string, maxLength: number) {
  if (typeof value !== 'string') {
    return fallback;
  }

  return value.trim().slice(0, maxLength);
}

function normalizeName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function chooseTopScoredMove<TMove extends GameMove>({
  moves,
  seed,
  score,
}: ScoreMoveInput<TMove>): TMove | null {
  if (moves.length === 0) {
    return null;
  }

  const scoredMoves = moves.map((move) => ({
    move,
    score: score(move),
  }));
  const topScore = Math.max(...scoredMoves.map((entry) => entry.score));
  const finalists = scoredMoves
    .filter((entry) => entry.score === topScore)
    .map((entry) => entry.move);

  if (finalists.length === 1) {
    return finalists[0] ?? null;
  }

  const fingerprint = finalists.map((move) => JSON.stringify(move)).join('|');
  const random = createSeededRandom(`${seed}:${fingerprint}`);
  const index = Math.floor(random() * finalists.length);

  return finalists[index] ?? finalists[0] ?? null;
}

function resolveEnabledProfile<
  TProfile extends { enabled: boolean; id: string },
>(matchedProfile: TProfile | undefined, fallbackProfile: TProfile) {
  if (matchedProfile?.enabled) {
    return matchedProfile;
  }

  return fallbackProfile.enabled
    ? fallbackProfile
    : (matchedProfile ?? fallbackProfile);
}

type UnoBotAiProfileInput = Partial<Record<keyof UnoBotAiProfile, unknown>>;

function normalizeUnoProfile(
  input: UnoBotAiProfileInput,
  fallback: UnoBotAiProfile,
): UnoBotAiProfile {
  return {
    id: fallback.id,
    displayName:
      trimText(input.displayName, fallback.displayName, 80) ||
      fallback.displayName,
    description: fallback.description,
    enabled:
      typeof input.enabled === 'boolean' ? input.enabled : fallback.enabled,
    aggression: clampInteger(input.aggression, fallback.aggression, 0, 100),
    actionCardBias: clampInteger(
      input.actionCardBias,
      fallback.actionCardBias,
      -200,
      200,
    ),
    wildCardBias: clampInteger(
      input.wildCardBias,
      fallback.wildCardBias,
      -200,
      200,
    ),
    drawBias: clampInteger(input.drawBias, fallback.drawBias, -200, 200),
    unoCallBias: clampInteger(input.unoCallBias, fallback.unoCallBias, 0, 100),
    notes: trimText(input.notes, fallback.notes, 280),
  };
}

export function getDefaultUnoBotAiProfiles(): readonly UnoBotAiProfile[] {
  return defaultUnoProfiles.map((profile) => ({ ...profile }));
}

export function normalizeUnoBotAiProfiles(
  input: unknown,
): readonly UnoBotAiProfile[] {
  const rawProfiles = Array.isArray(input) ? input : [];

  return defaultUnoProfiles.map((fallback) => {
    const rawProfile = rawProfiles.find(
      (candidate): candidate is UnoBotAiProfileInput =>
        typeof candidate === 'object' &&
        candidate !== null &&
        'id' in candidate &&
        candidate.id === fallback.id,
    );

    return normalizeUnoProfile(rawProfile ?? {}, fallback);
  });
}

export function resolveUnoBotAiProfileForParticipant(
  participant: BotParticipantLike,
  profiles: readonly UnoBotAiProfile[],
): UnoBotAiProfile {
  const normalizedName = normalizeName(participant.displayName);
  const fallbackProfile =
    profiles.find((profile) => profile.id === 'fallback-bot') ??
    defaultUnoProfiles[3]!;
  const matchedProfile = profiles.find((profile) =>
    normalizedName.includes(profile.id.replace('-bot', '')),
  );

  return resolveEnabledProfile(matchedProfile, fallbackProfile);
}

function findUnoCard(
  hand: readonly UnoCard[] | undefined,
  cardId: string,
): UnoCard | null {
  return hand?.find((card) => card.id === cardId) ?? null;
}

function scoreUnoMove(
  move: UnoMove,
  state: UnoState,
  playerId: string,
  profile: UnoBotAiProfile,
) {
  if (move.kind === 'draw-card') {
    return -40 + profile.drawBias;
  }

  if (move.kind === 'pass') {
    return -20 + profile.drawBias;
  }

  const hand = state.hands[playerId] ?? [];
  const card = findUnoCard(hand, move.payload.cardId);
  const remainingHandSize = Math.max(0, hand.length - 1);
  const isWild = card?.kind === 'wild' || card?.kind === 'wild-draw-four';
  const isActionCard =
    card?.kind === 'skip' ||
    card?.kind === 'reverse' ||
    card?.kind === 'draw-two' ||
    isWild;
  let score = 40 + profile.aggression;

  if (remainingHandSize === 0) {
    score += 900 + profile.aggression * 2;
  }

  if (remainingHandSize === 1) {
    score += move.payload.sayUno ? profile.unoCallBias * 4 : -400;
  }

  if (isActionCard) {
    score += profile.actionCardBias;
  }

  if (isWild) {
    score += profile.wildCardBias;
  }

  if (card?.kind === 'number' && typeof card.value === 'number') {
    score += Math.min(card.value, 9);
  }

  if (state.pendingDrawAmount > 0 && card?.kind === state.pendingDrawSource) {
    score += profile.actionCardBias / 2;
  }

  return score;
}

export function chooseUnoBotMove(input: {
  legalMoves: readonly UnoMove[];
  playerId: string;
  profile: UnoBotAiProfile;
  seed: number | string;
  state: UnoState;
}): UnoMove | null {
  const ownMoves = input.legalMoves.filter(
    (move) => move.playerId === input.playerId,
  );

  if (ownMoves.length === 0) {
    return null;
  }

  if (!input.profile.enabled) {
    return null;
  }

  return chooseTopScoredMove({
    moves: ownMoves,
    seed: `${input.seed}:${input.playerId}:${input.state.lastEvent}`,
    score: (move) =>
      scoreUnoMove(move, input.state, input.playerId, input.profile),
  });
}

type PokerBotAiProfileInput = Partial<Record<keyof PokerBotAiProfile, unknown>>;

function normalizePokerProfile(
  input: PokerBotAiProfileInput,
  fallback: PokerBotAiProfile,
): PokerBotAiProfile {
  return {
    id: fallback.id,
    displayName:
      trimText(input.displayName, fallback.displayName, 80) ||
      fallback.displayName,
    description: fallback.description,
    enabled:
      typeof input.enabled === 'boolean' ? input.enabled : fallback.enabled,
    betBias: clampInteger(input.betBias, fallback.betBias, -200, 200),
    callBias: clampInteger(input.callBias, fallback.callBias, -200, 200),
    foldBias: clampInteger(input.foldBias, fallback.foldBias, -200, 200),
    bigBetBias: clampInteger(input.bigBetBias, fallback.bigBetBias, -200, 200),
    stackPreservationBias: clampInteger(
      input.stackPreservationBias,
      fallback.stackPreservationBias,
      -200,
      200,
    ),
    notes: trimText(input.notes, fallback.notes, 280),
  };
}

export function getDefaultPokerBotAiProfiles(): readonly PokerBotAiProfile[] {
  return defaultPokerProfiles.map((profile) => ({ ...profile }));
}

export function normalizePokerBotAiProfiles(
  input: unknown,
): readonly PokerBotAiProfile[] {
  const rawProfiles = Array.isArray(input) ? input : [];

  return defaultPokerProfiles.map((fallback) => {
    const rawProfile = rawProfiles.find(
      (candidate): candidate is PokerBotAiProfileInput =>
        typeof candidate === 'object' &&
        candidate !== null &&
        'id' in candidate &&
        candidate.id === fallback.id,
    );

    return normalizePokerProfile(rawProfile ?? {}, fallback);
  });
}

export function resolvePokerBotAiProfileForParticipant(
  participant: BotParticipantLike,
  profiles: readonly PokerBotAiProfile[],
): PokerBotAiProfile {
  const normalizedName = normalizeName(participant.displayName);
  const fallbackProfile =
    profiles.find((profile) => profile.id === 'fallback-bot') ??
    defaultPokerProfiles[2]!;
  const matchedProfile = normalizedName.includes('caller')
    ? profiles.find((profile) => profile.id === 'caller-bot')
    : normalizedName.includes('check')
      ? profiles.find((profile) => profile.id === 'check-bot')
      : undefined;

  return resolveEnabledProfile(matchedProfile, fallbackProfile);
}

const POKER_RANK_VALUE: Record<string, number> = {
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
};

function estimatePokerPosture(state: PokerState, playerId: string) {
  const hand = state.hands[playerId] ?? [];
  const [first, second] = hand;

  if (!first || !second) {
    return 0;
  }

  let posture = 0;
  const firstValue = POKER_RANK_VALUE[first.rank] ?? 0;
  const secondValue = POKER_RANK_VALUE[second.rank] ?? 0;

  if (first.rank === second.rank) {
    posture += 35;
  }

  if (first.suit === second.suit) {
    posture += 10;
  }

  posture += Math.max(0, firstValue - 9) * 4;
  posture += Math.max(0, secondValue - 9) * 4;

  if (Math.abs(firstValue - secondValue) <= 1) {
    posture += 6;
  }

  posture += state.communityCards.reduce((total, card) => {
    if (card.rank === first.rank || card.rank === second.rank) {
      return total + 12;
    }

    if (card.suit === first.suit || card.suit === second.suit) {
      return total + 2;
    }

    return total;
  }, 0);

  return Math.min(100, posture);
}

function scorePokerMove(
  move: PokerMove,
  state: PokerState,
  playerId: string,
  profile: PokerBotAiProfile,
) {
  const stack = state.stacks[playerId] ?? 0;
  const committed = state.betsThisRound[playerId] ?? 0;
  const toCall = Math.max(0, state.currentBet - committed);
  const maxBet = Math.max(
    1,
    ...state.rules.betSizes,
    ...state.rules.betSizes.map((size) => size + state.currentBet),
  );
  const posture = estimatePokerPosture(state, playerId);

  if (move.kind === 'check') {
    return (
      30 +
      posture * 0.35 +
      Math.max(0, profile.callBias) * 0.15 +
      Math.max(0, profile.stackPreservationBias) * 0.25
    );
  }

  if (move.kind === 'call') {
    const callRisk = toCall / Math.max(1, stack + toCall);

    return (
      15 +
      profile.callBias +
      posture * 0.6 -
      callRisk * profile.stackPreservationBias
    );
  }

  if (move.kind === 'fold') {
    const foldRisk = toCall / Math.max(1, stack + toCall);

    return (
      (toCall > 0 ? 20 : -100) +
      profile.foldBias +
      foldRisk * (60 + profile.stackPreservationBias) -
      posture * 0.5
    );
  }

  const betMove = move as PokerBetMove;
  const normalizedBet = betMove.payload.amount / maxBet;
  const futureRisk = betMove.payload.amount / Math.max(1, stack);

  return (
    25 +
    profile.betBias +
    normalizedBet * profile.bigBetBias +
    posture * 0.8 -
    futureRisk * profile.stackPreservationBias
  );
}

export function choosePokerBotMove(input: {
  legalMoves: readonly PokerMove[];
  playerId: string;
  profile: PokerBotAiProfile;
  seed: number | string;
  state: PokerState;
}): PokerMove | null {
  const ownMoves = input.legalMoves.filter(
    (move) => move.playerId === input.playerId,
  );

  if (ownMoves.length === 0) {
    return null;
  }

  if (!input.profile.enabled) {
    return null;
  }

  return chooseTopScoredMove({
    moves: ownMoves,
    seed: `${input.seed}:${input.playerId}:${input.state.phase}:${input.state.pot}`,
    score: (move) =>
      scorePokerMove(move, input.state, input.playerId, input.profile),
  });
}

type Phase10BotAiProfileInput = Partial<
  Record<keyof Phase10BotAiProfile, unknown>
>;

function normalizePhase10Profile(
  input: Phase10BotAiProfileInput,
  fallback: Phase10BotAiProfile,
): Phase10BotAiProfile {
  return {
    id: fallback.id,
    displayName:
      trimText(input.displayName, fallback.displayName, 80) ||
      fallback.displayName,
    description: fallback.description,
    enabled:
      typeof input.enabled === 'boolean' ? input.enabled : fallback.enabled,
    phaseLayBias: clampInteger(
      input.phaseLayBias,
      fallback.phaseLayBias,
      -200,
      200,
    ),
    hitBias: clampInteger(input.hitBias, fallback.hitBias, -200, 200),
    discardPickupBias: clampInteger(
      input.discardPickupBias,
      fallback.discardPickupBias,
      -200,
      200,
    ),
    wildRetentionBias: clampInteger(
      input.wildRetentionBias,
      fallback.wildRetentionBias,
      -200,
      200,
    ),
    highCardDiscardBias: clampInteger(
      input.highCardDiscardBias,
      fallback.highCardDiscardBias,
      -200,
      200,
    ),
    notes: trimText(input.notes, fallback.notes, 280),
  };
}

export function getDefaultPhase10BotAiProfiles(): readonly Phase10BotAiProfile[] {
  return defaultPhase10Profiles.map((profile) => ({ ...profile }));
}

export function normalizePhase10BotAiProfiles(
  input: unknown,
): readonly Phase10BotAiProfile[] {
  const rawProfiles = Array.isArray(input) ? input : [];

  return defaultPhase10Profiles.map((fallback) => {
    const rawProfile = rawProfiles.find(
      (candidate): candidate is Phase10BotAiProfileInput =>
        typeof candidate === 'object' &&
        candidate !== null &&
        'id' in candidate &&
        candidate.id === fallback.id,
    );

    return normalizePhase10Profile(rawProfile ?? {}, fallback);
  });
}

export function resolvePhase10BotAiProfileForParticipant(
  participant: BotParticipantLike,
  profiles: readonly Phase10BotAiProfile[],
): Phase10BotAiProfile {
  const normalizedName = normalizeName(participant.displayName);
  const fallbackProfile =
    profiles.find((profile) => profile.id === 'fallback-bot') ??
    defaultPhase10Profiles[3]!;
  const matchedProfile = normalizedName.includes('run')
    ? profiles.find((profile) => profile.id === 'run-bot')
    : normalizedName.includes('set')
      ? profiles.find((profile) => profile.id === 'set-bot')
      : normalizedName.includes('phase')
        ? profiles.find((profile) => profile.id === 'phase-bot')
        : undefined;

  return resolveEnabledProfile(matchedProfile, fallbackProfile);
}

function getPhase10Definition(
  state: MatchState<Phase10State>,
  playerId: PlayerId,
): Phase10PhaseDefinition | null {
  const phaseState = state.state.phases[playerId];

  if (!phaseState) {
    return null;
  }

  return state.state.phaseDefinitions[phaseState.phaseIndex] ?? null;
}

function getPhase10HandCard(
  state: MatchState<Phase10State>,
  playerId: PlayerId,
  cardId: string,
) {
  return (
    state.state.hands[playerId]?.find((card) => card.id === cardId) ?? null
  );
}

function isPhase10PhaseComplete(
  state: MatchState<Phase10State>,
  playerId: PlayerId,
) {
  return state.state.phases[playerId]?.laidGroups !== null;
}

function isHelpfulPhase10CardForCurrentPhase(
  card: Phase10Card | null,
  state: MatchState<Phase10State>,
  playerId: PlayerId,
) {
  if (!card) {
    return false;
  }

  if (card.kind === 'wild') {
    return true;
  }

  if (card.kind !== 'number' || isPhase10PhaseComplete(state, playerId)) {
    return false;
  }

  const targetPhase = getPhase10Definition(state, playerId);

  if (!targetPhase) {
    return false;
  }

  const hand = state.state.hands[playerId] ?? [];
  const sameValueCount = hand.filter(
    (candidate) =>
      candidate.kind === 'number' && candidate.value === card.value,
  ).length;
  const wildCount = hand.filter(
    (candidate) => candidate.kind === 'wild',
  ).length;

  return sameValueCount + wildCount + 1 >= targetPhase.setSize;
}

function scorePhase10DiscardMove(input: {
  card: Phase10Card | null;
  move: Extract<Phase10Move, { kind: 'discard-card' }>;
  playerId: PlayerId;
  profile: Phase10BotAiProfile;
  state: MatchState<Phase10State>;
}) {
  const { card, move, playerId, profile, state } = input;

  if (!card) {
    return 0;
  }

  let score = 0;

  if (card.kind === 'number') {
    score += (card.value ?? 0) * (profile.highCardDiscardBias / 10);
  }

  if (card.kind === 'wild') {
    score -= profile.wildRetentionBias;
  }

  if (card.kind === 'skip') {
    score -= profile.wildRetentionBias / 2;
  }

  if (isHelpfulPhase10CardForCurrentPhase(card, state, playerId)) {
    score -= Math.max(20, Math.abs(profile.highCardDiscardBias) / 2);
  }

  if (card.kind === 'skip' && move.payload.targetPlayerId) {
    score += profile.hitBias / 3;
  }

  return score;
}

function scorePhase10Move(
  move: Phase10Move,
  state: MatchState<Phase10State>,
  playerId: PlayerId,
  profile: Phase10BotAiProfile,
) {
  if (move.kind === 'lay-phase') {
    return 320 + profile.phaseLayBias;
  }

  if (move.kind === 'hit-phase') {
    return 220 + profile.hitBias;
  }

  if (move.kind === 'draw-card') {
    if (move.payload.source === 'discard') {
      const discardTop =
        state.state.discardPile[state.state.discardPile.length - 1] ?? null;

      return isHelpfulPhase10CardForCurrentPhase(discardTop, state, playerId)
        ? 110 + profile.discardPickupBias
        : profile.discardPickupBias - 50;
    }

    return 60 - Math.max(0, profile.discardPickupBias / 3);
  }

  return (
    120 +
    scorePhase10DiscardMove({
      card: getPhase10HandCard(state, playerId, move.payload.cardId),
      move,
      playerId,
      profile,
      state,
    })
  );
}

export function choosePhase10BotMove(input: {
  legalMoves: readonly Phase10Move[];
  playerId: PlayerId;
  profile: Phase10BotAiProfile;
  seed: number | string;
  state: MatchState<Phase10State>;
}): Phase10Move | null {
  const ownMoves = input.legalMoves.filter(
    (move) => move.playerId === input.playerId,
  );

  if (ownMoves.length === 0) {
    return null;
  }

  if (!input.profile.enabled) {
    return choosePhase10Move(input);
  }

  return (
    chooseTopScoredMove({
      moves: ownMoves,
      seed: `${input.seed}:${input.playerId}:${input.state.turn}`,
      score: (move) =>
        scorePhase10Move(move, input.state, input.playerId, input.profile),
    }) ?? choosePhase10Move(input)
  );
}

export function createPhase10BotsFromProfiles(
  participants: readonly SessionParticipant[],
  profiles: readonly Phase10BotAiProfile[],
  seed: number | string = 'phase-10-bot',
): Partial<Record<PlayerId, LocalGameSessionBot<Phase10State, Phase10Move>>> {
  return Object.fromEntries(
    participants
      .filter((participant) => participant.controller === 'bot')
      .map((participant) => {
        const bot: LocalGameSessionBot<Phase10State, Phase10Move> = {
          chooseMove({ legalMoves, playerId, state }) {
            const profile = resolvePhase10BotAiProfileForParticipant(
              participant,
              profiles,
            );

            return choosePhase10BotMove({
              legalMoves,
              playerId,
              profile,
              seed: `${seed}:${state.matchId}`,
              state,
            });
          },
        };

        return [participant.playerId, bot] as const;
      }),
  );
}
