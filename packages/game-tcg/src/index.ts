import type {
  GameDefinition,
  GameMove,
  MatchResult,
  MatchState,
  PlayerId,
  PlayerProfile,
} from "@repo/game-contracts";
import {
  areMovesEquivalent,
  shuffleWithSeed,
  type GameAdapter,
} from "@repo/game-engine";
import type {
  LocalGameSessionBot,
  LocalGameSessionProjectViewInput,
  SessionParticipant,
} from "@repo/game-session";

export type TcgCardKind = "creature" | "spell";
export type TcgSpellEffect = "deal-2" | "heal-2";

export type TcgCard = {
  attack?: number;
  catalogId?: string;
  cost: number;
  effect?: TcgSpellEffect;
  health?: number;
  id: string;
  kind: TcgCardKind;
  label: string;
};

export type TcgUnit = {
  card: TcgCard;
  damage: number;
  id: string;
  ownerPlayerId: PlayerId;
};

export type TcgRules = {
  maxBattlefieldSize: number;
  maxMana: number;
  startingHandSize: number;
  startingLife: number;
};

export type TcgCollection = Record<string, number>;
export type TcgDeckList = readonly string[];
export type TcgDeckValidation = {
  copyCounts: Record<string, number>;
  deckSize: number;
  errors: readonly string[];
  missingCards: Record<string, number>;
  unknownCardIds: readonly string[];
  valid: boolean;
};

export type TcgSetup = {
  collections?: Partial<Record<PlayerId, TcgCollection>>;
  deckLists?: Partial<Record<PlayerId, TcgDeckList>>;
  rules?: Partial<TcgRules>;
  seed?: number | string;
};

export type TcgState = {
  battlefield: Record<PlayerId, readonly TcgUnit[]>;
  decks: Record<PlayerId, readonly TcgCard[]>;
  exhaustedUnitIds: readonly string[];
  graveyards: Record<PlayerId, readonly TcgCard[]>;
  hands: Record<PlayerId, readonly TcgCard[]>;
  lastEvent: string;
  life: Record<PlayerId, number>;
  mana: Record<PlayerId, number>;
  maxMana: Record<PlayerId, number>;
  rules: TcgRules;
  seed: number | string;
  winnerPlayerId: PlayerId | null;
};

export type TcgPlayCardMove = GameMove<{
  cardId: string;
  targetPlayerId?: PlayerId;
  targetUnitId?: string;
}> & {
  kind: "play-card";
};
export type TcgAttackMove = GameMove<{
  attackerUnitId: string;
  targetPlayerId?: PlayerId;
  targetUnitId?: string;
}> & {
  kind: "attack";
};
export type TcgEndTurnMove = GameMove<Record<string, never>> & {
  kind: "end-turn";
};
export type TcgMove = TcgPlayCardMove | TcgAttackMove | TcgEndTurnMove;

export type TcgPlayerView = {
  activePlayerId: PlayerId;
  legalActions: ReadonlyArray<{
    id: string;
    label: string;
    move: TcgMove;
  }>;
  matchResultBanner: string | null;
  players: ReadonlyArray<{
    battlefield: readonly TcgUnit[];
    controller: SessionParticipant["controller"];
    deckCount: number;
    displayName: string;
    handCount: number;
    isActive: boolean;
    isViewer: boolean;
    life: number;
    mana: number;
    maxMana: number;
    playerId: PlayerId;
    visibleHand: readonly TcgCard[];
  }>;
  status: string;
  viewerPlayerId: PlayerId | null;
};

export type TcgExamplePresetId = "duel" | "bot-rival";
export type TcgExamplePreset = {
  hotseat: boolean;
  id: TcgExamplePresetId;
  label: string;
  seats: readonly SessionParticipant[];
};

export type TcgCatalogMetadata = {
  presets: readonly TcgExamplePreset[];
  route: "/tcg";
  supportsBots: true;
};

export type TcgCatalogEntry = {
  definition: GameDefinition;
  metadata: TcgCatalogMetadata;
};

export const defaultTcgRules: TcgRules = {
  maxBattlefieldSize: 6,
  maxMana: 10,
  startingHandSize: 4,
  startingLife: 20,
};

export const tcgDefinition: GameDefinition = {
  gameId: "arcane-duel",
  name: "Arcane Duel",
  minPlayers: 2,
  maxPlayers: 2,
  supportsLocal: true,
  supportsOnline: false,
  tags: ["card-game", "trading-card-game", "local"],
};

export const TCG_DECK_SIZE = 60;
export const TCG_MAX_COPIES_PER_CARD = 3;

const CARD_REALMS = [
  {
    id: "ember",
    label: "Ember",
    attackBonus: 1,
    healthBonus: 0,
    effect: "deal-2",
  },
  {
    id: "tide",
    label: "Tide",
    attackBonus: 0,
    healthBonus: 1,
    effect: "heal-2",
  },
  {
    id: "grove",
    label: "Grove",
    attackBonus: 0,
    healthBonus: 2,
    effect: "heal-2",
  },
  {
    id: "storm",
    label: "Storm",
    attackBonus: 1,
    healthBonus: 0,
    effect: "deal-2",
  },
  { id: "sun", label: "Sun", attackBonus: 0, healthBonus: 1, effect: "heal-2" },
  {
    id: "moon",
    label: "Moon",
    attackBonus: 1,
    healthBonus: 1,
    effect: "deal-2",
  },
  {
    id: "iron",
    label: "Iron",
    attackBonus: 0,
    healthBonus: 2,
    effect: "heal-2",
  },
  {
    id: "thorn",
    label: "Thorn",
    attackBonus: 1,
    healthBonus: 0,
    effect: "deal-2",
  },
  {
    id: "frost",
    label: "Frost",
    attackBonus: 0,
    healthBonus: 1,
    effect: "heal-2",
  },
  {
    id: "void",
    label: "Void",
    attackBonus: 1,
    healthBonus: 0,
    effect: "deal-2",
  },
] as const;

const CREATURE_ARCHETYPES = [
  { id: "scout", label: "Scout", cost: 1, attack: 1, health: 2 },
  { id: "adept", label: "Adept", cost: 1, attack: 2, health: 1 },
  { id: "guard", label: "Guard", cost: 2, attack: 1, health: 4 },
  { id: "raider", label: "Raider", cost: 2, attack: 3, health: 2 },
  { id: "mystic", label: "Mystic", cost: 3, attack: 3, health: 3 },
  { id: "warden", label: "Warden", cost: 4, attack: 4, health: 5 },
  { id: "colossus", label: "Colossus", cost: 6, attack: 6, health: 7 },
] as const;

const SPELL_ARCHETYPES = [
  { id: "spark", label: "Spark", cost: 1 },
  { id: "surge", label: "Surge", cost: 2 },
  { id: "rite", label: "Rite", cost: 3 },
] as const;

export const tcgCardCatalog: readonly TcgCard[] = [
  ...CARD_REALMS.flatMap((realm) =>
    CREATURE_ARCHETYPES.map((archetype) => ({
      id: `${realm.id}-${archetype.id}`,
      kind: "creature" as const,
      label: `${realm.label} ${archetype.label}`,
      cost: archetype.cost,
      attack: archetype.attack + realm.attackBonus,
      health: archetype.health + realm.healthBonus,
    })),
  ),
  ...CARD_REALMS.flatMap((realm) =>
    SPELL_ARCHETYPES.map((archetype) => ({
      id: `${realm.id}-${archetype.id}`,
      kind: "spell" as const,
      label: `${realm.label} ${archetype.label}`,
      cost: archetype.cost,
      effect: realm.effect as TcgSpellEffect,
    })),
  ),
];

const tcgCardCatalogById = new Map(
  tcgCardCatalog.map((card) => [card.id, card]),
);

export function createDefaultTcgCollection(
  copiesPerCard = TCG_MAX_COPIES_PER_CARD,
): TcgCollection {
  return Object.fromEntries(
    tcgCardCatalog.map((card) => [card.id, copiesPerCard]),
  );
}

export function countTcgDeckCards(
  deckList: TcgDeckList,
): Record<string, number> {
  const counts: Record<string, number> = {};

  for (const cardId of deckList) {
    counts[cardId] = (counts[cardId] ?? 0) + 1;
  }

  return counts;
}

export function validateTcgDeck(
  deckList: TcgDeckList,
  collection: TcgCollection = createDefaultTcgCollection(),
): TcgDeckValidation {
  const copyCounts = countTcgDeckCards(deckList);
  const errors: string[] = [];
  const missingCards: Record<string, number> = {};
  const unknownCardIds = Object.keys(copyCounts).filter(
    (cardId) => !tcgCardCatalogById.has(cardId),
  );

  if (deckList.length !== TCG_DECK_SIZE) {
    errors.push(`A TCG deck must contain exactly ${TCG_DECK_SIZE} cards.`);
  }

  for (const [cardId, count] of Object.entries(copyCounts)) {
    if (count > TCG_MAX_COPIES_PER_CARD) {
      errors.push(`${cardId} has more than ${TCG_MAX_COPIES_PER_CARD} copies.`);
    }

    const ownedCount = collection[cardId] ?? 0;

    if (count > ownedCount) {
      missingCards[cardId] = count - ownedCount;
      errors.push(
        `${cardId} needs ${count} copies, but the collection only has ${ownedCount}.`,
      );
    }
  }

  if (unknownCardIds.length > 0) {
    errors.push(`Unknown TCG card ids: ${unknownCardIds.join(", ")}.`);
  }

  return {
    copyCounts,
    deckSize: deckList.length,
    errors,
    missingCards,
    unknownCardIds,
    valid: errors.length === 0,
  };
}

export function createTcgDeckFromList(
  deckList: TcgDeckList,
): readonly TcgCard[] {
  const copyCounts: Record<string, number> = {};

  return deckList.map((cardId) => {
    const card = tcgCardCatalogById.get(cardId);

    if (!card) {
      throw new Error(`Unknown TCG card id: ${cardId}`);
    }

    const copyNumber = (copyCounts[cardId] ?? 0) + 1;
    copyCounts[cardId] = copyNumber;

    return {
      ...card,
      catalogId: card.id,
      id: `${card.id}-${copyNumber}`,
    };
  });
}

export function createStarterTcgDeckList(): TcgDeckList {
  const cardIds = [
    "ember-scout",
    "ember-adept",
    "ember-spark",
    "ember-surge",
    "tide-scout",
    "tide-adept",
    "tide-spark",
    "tide-surge",
    "grove-scout",
    "grove-guard",
    "grove-spark",
    "grove-surge",
    "storm-scout",
    "storm-raider",
    "storm-spark",
    "storm-surge",
    "sun-scout",
    "sun-guard",
    "sun-spark",
    "sun-surge",
  ];

  return cardIds.flatMap((cardId) => [cardId, cardId, cardId]);
}

export function summarizeTcgDeck(deckList: TcgDeckList): ReadonlyArray<{
  card: TcgCard;
  count: number;
}> {
  return Object.entries(countTcgDeckCards(deckList))
    .map(([cardId, count]) => {
      const card = tcgCardCatalogById.get(cardId);
      return card ? { card, count } : null;
    })
    .filter((entry): entry is { card: TcgCard; count: number } =>
      Boolean(entry),
    )
    .sort(
      (left, right) =>
        left.card.cost - right.card.cost ||
        left.card.label.localeCompare(right.card.label),
    );
}

function cloneZones<TValue>(
  zones: Record<PlayerId, readonly TValue[]>,
): Record<PlayerId, readonly TValue[]> {
  return Object.fromEntries(
    Object.entries(zones).map(([playerId, items]) => [playerId, [...items]]),
  );
}

function cloneBattlefield(
  zones: Record<PlayerId, readonly TcgUnit[]>,
): Record<PlayerId, readonly TcgUnit[]> {
  return Object.fromEntries(
    Object.entries(zones).map(([playerId, units]) => [
      playerId,
      units.map((unit) => ({
        ...unit,
        card: { ...unit.card },
      })),
    ]),
  );
}

function opponentOf(
  players: readonly PlayerProfile[],
  playerId: PlayerId,
): PlayerId {
  const opponent = players.find((player) => player.playerId !== playerId);

  if (!opponent) {
    throw new Error(`No TCG opponent found for ${playerId}`);
  }

  return opponent.playerId;
}

function drawOne(state: TcgState, playerId: PlayerId): TcgState {
  const deck = state.decks[playerId] ?? [];
  const nextCard = deck[0];

  if (!nextCard) {
    return {
      ...state,
      life: {
        ...state.life,
        [playerId]: (state.life[playerId] ?? 0) - 1,
      },
      lastEvent: `${playerId} took 1 fatigue damage`,
    };
  }

  return {
    ...state,
    decks: {
      ...state.decks,
      [playerId]: deck.slice(1),
    },
    hands: {
      ...state.hands,
      [playerId]: [...(state.hands[playerId] ?? []), nextCard],
    },
  };
}

function removeCardFromHand(
  state: TcgState,
  playerId: PlayerId,
  cardId: string,
) {
  const hand = state.hands[playerId] ?? [];
  const card = hand.find((candidate) => candidate.id === cardId) ?? null;
  let removed = false;

  return {
    card,
    hands: {
      ...state.hands,
      [playerId]: hand.filter((candidate) => {
        if (!removed && candidate.id === cardId) {
          removed = true;
          return false;
        }

        return true;
      }),
    },
  };
}

function removeDeadUnits(state: TcgState): TcgState {
  const battlefield = cloneZones(state.battlefield);
  const graveyards = cloneZones(state.graveyards);

  for (const [playerId, units] of Object.entries(battlefield)) {
    const survivors: TcgUnit[] = [];

    for (const unit of units) {
      if (unit.damage >= (unit.card.health ?? 0)) {
        graveyards[playerId] = [...(graveyards[playerId] ?? []), unit.card];
      } else {
        survivors.push(unit);
      }
    }

    battlefield[playerId] = survivors;
  }

  return {
    ...state,
    battlefield,
    exhaustedUnitIds: state.exhaustedUnitIds.filter((unitId) =>
      Object.values(battlefield).some((units) =>
        units.some((unit) => unit.id === unitId),
      ),
    ),
    graveyards,
  };
}

function winnerPlayerId(
  players: readonly PlayerProfile[],
  state: TcgState,
): PlayerId | null {
  const defeated = players.find(
    (player) => (state.life[player.playerId] ?? 0) <= 0,
  );

  return defeated ? opponentOf(players, defeated.playerId) : null;
}

function createUnit(
  card: TcgCard,
  ownerPlayerId: PlayerId,
  turn: number,
): TcgUnit {
  return {
    card,
    damage: 0,
    id: `${ownerPlayerId}:${card.id}:${turn}`,
    ownerPlayerId,
  };
}

function legalMovesForPlayer(
  state: MatchState<TcgState>,
  playerId: PlayerId,
): TcgMove[] {
  if (state.state.winnerPlayerId || state.activePlayerId !== playerId) {
    return [];
  }

  const moves: TcgMove[] = [];
  const opponentId = opponentOf(state.players, playerId);
  const mana = state.state.mana[playerId] ?? 0;
  const battlefield = state.state.battlefield[playerId] ?? [];

  for (const card of state.state.hands[playerId] ?? []) {
    if (card.cost > mana) {
      continue;
    }

    if (card.kind === "creature") {
      if (battlefield.length >= state.state.rules.maxBattlefieldSize) {
        continue;
      }

      moves.push({
        playerId,
        kind: "play-card",
        createdAt: "2026-04-21T12:00:00.000Z",
        payload: {
          cardId: card.id,
        },
      });
      continue;
    }

    if (card.effect === "deal-2") {
      moves.push({
        playerId,
        kind: "play-card",
        createdAt: "2026-04-21T12:00:00.000Z",
        payload: {
          cardId: card.id,
          targetPlayerId: opponentId,
        },
      });

      for (const unit of state.state.battlefield[opponentId] ?? []) {
        moves.push({
          playerId,
          kind: "play-card",
          createdAt: "2026-04-21T12:00:00.000Z",
          payload: {
            cardId: card.id,
            targetUnitId: unit.id,
          },
        });
      }
    }

    if (card.effect === "heal-2") {
      moves.push({
        playerId,
        kind: "play-card",
        createdAt: "2026-04-21T12:00:00.000Z",
        payload: {
          cardId: card.id,
          targetPlayerId: playerId,
        },
      });
    }
  }

  for (const unit of battlefield) {
    if (state.state.exhaustedUnitIds.includes(unit.id)) {
      continue;
    }

    moves.push({
      playerId,
      kind: "attack",
      createdAt: "2026-04-21T12:00:00.000Z",
      payload: {
        attackerUnitId: unit.id,
        targetPlayerId: opponentId,
      },
    });

    for (const target of state.state.battlefield[opponentId] ?? []) {
      moves.push({
        playerId,
        kind: "attack",
        createdAt: "2026-04-21T12:00:00.000Z",
        payload: {
          attackerUnitId: unit.id,
          targetUnitId: target.id,
        },
      });
    }
  }

  moves.push({
    playerId,
    kind: "end-turn",
    createdAt: "2026-04-21T12:00:00.000Z",
    payload: {},
  });

  return moves;
}

function resolveTargetUnit(
  state: TcgState,
  targetUnitId: string,
): TcgUnit | null {
  return (
    Object.values(state.battlefield)
      .flat()
      .find((unit) => unit.id === targetUnitId) ?? null
  );
}

export function createTcgAdapter(): GameAdapter<TcgSetup, TcgState, TcgMove> {
  return {
    definition: tcgDefinition,
    createInitialState({
      executionMode,
      matchId,
      players,
      setup,
    }): MatchState<TcgState> {
      if (players.length !== 2) {
        throw new Error("Arcane Duel MVP supports exactly 2 seats.");
      }

      const rules = {
        ...defaultTcgRules,
        ...setup.rules,
      };
      const seed = setup.seed ?? "arcane-duel";
      const decks: Record<PlayerId, readonly TcgCard[]> = {};
      const hands: Record<PlayerId, readonly TcgCard[]> = {};

      for (const player of players) {
        const deckList =
          setup.deckLists?.[player.playerId] ?? createStarterTcgDeckList();
        const collection =
          setup.collections?.[player.playerId] ?? createDefaultTcgCollection();
        const validation = validateTcgDeck(deckList, collection);

        if (!validation.valid) {
          throw new Error(
            `Invalid TCG deck for ${player.playerId}: ${validation.errors.join(" ")}`,
          );
        }

        const deck = shuffleWithSeed(
          createTcgDeckFromList(deckList),
          `${seed}:${player.playerId}`,
        );
        hands[player.playerId] = deck.slice(0, rules.startingHandSize);
        decks[player.playerId] = deck.slice(rules.startingHandSize);
      }

      const firstPlayerId = players[0]!.playerId;
      const secondPlayerId = players[1]!.playerId;

      return {
        matchId,
        gameId: tcgDefinition.gameId,
        players,
        activePlayerId: firstPlayerId,
        turn: 1,
        executionMode,
        state: {
          battlefield: {
            [firstPlayerId]: [],
            [secondPlayerId]: [],
          },
          decks,
          exhaustedUnitIds: [],
          graveyards: {
            [firstPlayerId]: [],
            [secondPlayerId]: [],
          },
          hands,
          lastEvent: "Arcane Duel started",
          life: {
            [firstPlayerId]: rules.startingLife,
            [secondPlayerId]: rules.startingLife,
          },
          mana: {
            [firstPlayerId]: 1,
            [secondPlayerId]: 0,
          },
          maxMana: {
            [firstPlayerId]: 1,
            [secondPlayerId]: 0,
          },
          rules,
          seed,
          winnerPlayerId: null,
        },
      };
    },
    listLegalMoves(state): readonly TcgMove[] {
      return legalMovesForPlayer(state, state.activePlayerId);
    },
    isLegalMove(state, move): boolean {
      return this.listLegalMoves(state).some((candidate) =>
        areMovesEquivalent(candidate, move),
      );
    },
    applyMove(state, move): MatchState<TcgState> {
      let nextState: TcgState = {
        ...state.state,
        battlefield: cloneBattlefield(state.state.battlefield),
        decks: cloneZones(state.state.decks),
        graveyards: cloneZones(state.state.graveyards),
        hands: cloneZones(state.state.hands),
        life: { ...state.state.life },
        mana: { ...state.state.mana },
        maxMana: { ...state.state.maxMana },
      };

      if (move.kind === "end-turn") {
        const nextPlayerId = opponentOf(state.players, move.playerId);
        const nextMaxMana = Math.min(
          (nextState.maxMana[nextPlayerId] ?? 0) + 1,
          nextState.rules.maxMana,
        );
        nextState = drawOne(
          {
            ...nextState,
            exhaustedUnitIds: nextState.exhaustedUnitIds.filter(
              (unitId) =>
                !(nextState.battlefield[nextPlayerId] ?? []).some(
                  (unit) => unit.id === unitId,
                ),
            ),
            lastEvent: `${move.playerId} ended the turn`,
            mana: {
              ...nextState.mana,
              [nextPlayerId]: nextMaxMana,
            },
            maxMana: {
              ...nextState.maxMana,
              [nextPlayerId]: nextMaxMana,
            },
          },
          nextPlayerId,
        );

        nextState.winnerPlayerId = winnerPlayerId(state.players, nextState);

        return {
          ...state,
          activePlayerId: nextPlayerId,
          turn: state.turn + 1,
          state: nextState,
        };
      }

      if (move.kind === "play-card") {
        const removed = removeCardFromHand(
          nextState,
          move.playerId,
          move.payload.cardId,
        );

        if (!removed.card) {
          throw new Error(
            `Card ${move.payload.cardId} is not in hand for ${move.playerId}`,
          );
        }

        nextState.hands = removed.hands;
        nextState.mana[move.playerId] =
          (nextState.mana[move.playerId] ?? 0) - removed.card.cost;

        if (removed.card.kind === "creature") {
          const unit = createUnit(removed.card, move.playerId, state.turn);
          nextState.battlefield[move.playerId] = [
            ...(nextState.battlefield[move.playerId] ?? []),
            unit,
          ];
          nextState.exhaustedUnitIds = [...nextState.exhaustedUnitIds, unit.id];
          nextState.lastEvent = `${move.playerId} played ${removed.card.label}`;
        } else {
          nextState.graveyards[move.playerId] = [
            ...(nextState.graveyards[move.playerId] ?? []),
            removed.card,
          ];

          if (removed.card.effect === "deal-2" && move.payload.targetPlayerId) {
            nextState.life[move.payload.targetPlayerId] =
              (nextState.life[move.payload.targetPlayerId] ?? 0) - 2;
            nextState.lastEvent = `${move.playerId} cast ${removed.card.label}`;
          }

          if (removed.card.effect === "deal-2" && move.payload.targetUnitId) {
            const targetUnit = resolveTargetUnit(
              nextState,
              move.payload.targetUnitId,
            );

            if (targetUnit) {
              targetUnit.damage += 2;
              nextState.lastEvent = `${move.playerId} damaged ${targetUnit.card.label}`;
            }
          }

          if (removed.card.effect === "heal-2" && move.payload.targetPlayerId) {
            nextState.life[move.payload.targetPlayerId] = Math.min(
              nextState.rules.startingLife,
              (nextState.life[move.payload.targetPlayerId] ?? 0) + 2,
            );
            nextState.lastEvent = `${move.playerId} cast ${removed.card.label}`;
          }
        }
      }

      if (move.kind === "attack") {
        const attacker = (nextState.battlefield[move.playerId] ?? []).find(
          (unit) => unit.id === move.payload.attackerUnitId,
        );

        if (!attacker) {
          throw new Error(
            `Unit ${move.payload.attackerUnitId} is not on the battlefield for ${move.playerId}`,
          );
        }

        nextState.exhaustedUnitIds = [
          ...nextState.exhaustedUnitIds,
          attacker.id,
        ];

        if (move.payload.targetPlayerId) {
          nextState.life[move.payload.targetPlayerId] =
            (nextState.life[move.payload.targetPlayerId] ?? 0) -
            (attacker.card.attack ?? 0);
          nextState.lastEvent = `${move.playerId} attacked ${move.payload.targetPlayerId}`;
        }

        if (move.payload.targetUnitId) {
          const targetUnit = resolveTargetUnit(
            nextState,
            move.payload.targetUnitId,
          );

          if (targetUnit) {
            targetUnit.damage += attacker.card.attack ?? 0;
            attacker.damage += targetUnit.card.attack ?? 0;
            nextState.lastEvent = `${attacker.card.label} battled ${targetUnit.card.label}`;
          }
        }
      }

      nextState = removeDeadUnits(nextState);
      nextState.winnerPlayerId = winnerPlayerId(state.players, nextState);

      return {
        ...state,
        turn: state.turn + 1,
        state: nextState,
      };
    },
    isMatchComplete(state): boolean {
      return Boolean(state.state.winnerPlayerId);
    },
    getResult(state): MatchResult | null {
      if (!state.state.winnerPlayerId) {
        return null;
      }

      return {
        matchId: state.matchId,
        gameId: state.gameId,
        winnerIds: [state.state.winnerPlayerId],
        rankings: state.players
          .map((player) => ({
            playerId: player.playerId,
            position: player.playerId === state.state.winnerPlayerId ? 1 : 2,
            score: state.state.life[player.playerId] ?? 0,
          }))
          .sort((left, right) => left.position - right.position),
        finishedAt: "2026-04-21T12:00:01.000Z",
        executionMode: state.executionMode,
      };
    },
  };
}

function describeMove(move: TcgMove, state: TcgState): string {
  if (move.kind === "end-turn") {
    return "End turn";
  }

  if (move.kind === "attack") {
    const attacker = resolveTargetUnit(state, move.payload.attackerUnitId);
    return `Attack with ${attacker?.card.label ?? move.payload.attackerUnitId}`;
  }

  const card = state.hands[move.playerId]?.find(
    (candidate) => candidate.id === move.payload.cardId,
  );
  return `Play ${card?.label ?? move.payload.cardId}`;
}

export function projectTcgPlayerView(
  input: LocalGameSessionProjectViewInput<TcgState, TcgMove>,
): TcgPlayerView {
  return {
    activePlayerId: input.state.activePlayerId,
    legalActions: input.viewerPlayerId
      ? input.legalMoves
          .filter((move) => move.playerId === input.viewerPlayerId)
          .map((move) => ({
            id: `${move.kind}:${JSON.stringify(move.payload)}`,
            label: describeMove(move, input.state.state),
            move,
          }))
      : [],
    matchResultBanner: input.matchResult
      ? `Winner: ${input.matchResult.winnerIds[0]}`
      : null,
    players: input.participants.map((participant) => ({
      battlefield: input.state.state.battlefield[participant.playerId] ?? [],
      controller: participant.controller,
      deckCount: input.state.state.decks[participant.playerId]?.length ?? 0,
      displayName: participant.displayName,
      handCount: input.state.state.hands[participant.playerId]?.length ?? 0,
      isActive: participant.playerId === input.state.activePlayerId,
      isViewer: participant.playerId === input.viewerPlayerId,
      life: input.state.state.life[participant.playerId] ?? 0,
      mana: input.state.state.mana[participant.playerId] ?? 0,
      maxMana: input.state.state.maxMana[participant.playerId] ?? 0,
      playerId: participant.playerId,
      visibleHand:
        participant.playerId === input.viewerPlayerId
          ? [...(input.state.state.hands[participant.playerId] ?? [])]
          : [],
    })),
    status: input.state.state.lastEvent,
    viewerPlayerId: input.viewerPlayerId,
  };
}

function moveScore(move: TcgMove, state: TcgState): number {
  if (move.kind === "attack") {
    return move.payload.targetPlayerId ? 400 : 300;
  }

  if (move.kind === "play-card") {
    const card = state.hands[move.playerId]?.find(
      (candidate) => candidate.id === move.payload.cardId,
    );
    return card?.kind === "creature"
      ? 200 + card.cost
      : 250 + (card?.cost ?? 0);
  }

  return 0;
}

export function createTcgBots(
  participants: readonly SessionParticipant[],
): Partial<Record<PlayerId, LocalGameSessionBot<TcgState, TcgMove>>> {
  return Object.fromEntries(
    participants
      .filter((participant) => participant.controller === "bot")
      .map((participant) => {
        const bot: LocalGameSessionBot<TcgState, TcgMove> = {
          chooseMove({ legalMoves, playerId, state }) {
            const ownMoves = legalMoves.filter(
              (move) => move.playerId === playerId,
            );
            const proactiveMoves = ownMoves.filter(
              (move) => move.kind !== "end-turn",
            );

            if (proactiveMoves.length > 0) {
              return (
                [...proactiveMoves].sort(
                  (left, right) =>
                    moveScore(right, state.state) -
                    moveScore(left, state.state),
                )[0] ?? null
              );
            }

            return ownMoves.find((move) => move.kind === "end-turn") ?? null;
          },
        };

        return [participant.playerId, bot] as const;
      }),
  );
}

export const tcgExamplePresets: readonly TcgExamplePreset[] = [
  {
    id: "duel",
    label: "Hotseat duel",
    hotseat: true,
    seats: [
      {
        playerId: "p1",
        displayName: "Player One",
        seat: 1,
        controller: "human",
      },
      {
        playerId: "p2",
        displayName: "Player Two",
        seat: 2,
        controller: "human",
      },
    ],
  },
  {
    id: "bot-rival",
    label: "Bot rival",
    hotseat: false,
    seats: [
      {
        playerId: "p1",
        displayName: "Player One",
        seat: 1,
        controller: "human",
      },
      { playerId: "p2", displayName: "Arcane Bot", seat: 2, controller: "bot" },
    ],
  },
] as const;

export function getTcgExamplePreset(
  presetId: TcgExamplePresetId,
): TcgExamplePreset {
  return (
    tcgExamplePresets.find((preset) => preset.id === presetId) ??
    tcgExamplePresets[0]!
  );
}

export const tcgCatalogEntry: TcgCatalogEntry = {
  definition: tcgDefinition,
  metadata: {
    presets: tcgExamplePresets,
    route: "/tcg",
    supportsBots: true,
  },
};
