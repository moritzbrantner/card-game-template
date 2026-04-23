import assert from "node:assert/strict";
import test from "node:test";

import { createGameEngine } from "../../game-engine/src/index.ts";
import type {
  MatchState,
  PlayerProfile,
} from "../../game-contracts/src/index.ts";
import {
  createDefaultTcgCollection,
  createTcgAdapter,
  createTcgBots,
  createTcgDeckFromList,
  createStarterTcgDeckList,
  defaultTcgRules,
  tcgCardCatalog,
  TCG_DECK_SIZE,
  TCG_MAX_COPIES_PER_CARD,
  validateTcgDeck,
  type TcgCard,
  type TcgState,
  type TcgUnit,
} from "../src/index.ts";

const adapter = createTcgAdapter();
const players: readonly PlayerProfile[] = [
  { playerId: "p1", displayName: "Alice", seat: 1 },
  { playerId: "p2", displayName: "Bob", seat: 2 },
];

const ember: TcgCard = {
  id: "ember",
  kind: "creature",
  label: "Ember Adept",
  cost: 1,
  attack: 2,
  health: 1,
};
const warden: TcgCard = {
  id: "warden",
  kind: "creature",
  label: "Ancient Warden",
  cost: 4,
  attack: 4,
  health: 5,
};
const spark: TcgCard = {
  id: "spark",
  kind: "spell",
  label: "Spark",
  cost: 1,
  effect: "deal-2",
};

function unit(
  card: TcgCard,
  ownerPlayerId: string,
  id = `${ownerPlayerId}:${card.id}:unit`,
): TcgUnit {
  return {
    card,
    damage: 0,
    id,
    ownerPlayerId,
  };
}

function createState(
  state: Partial<TcgState>,
  activePlayerId = "p1",
): MatchState<TcgState> {
  return {
    matchId: "match-tcg",
    gameId: "arcane-duel",
    players,
    activePlayerId,
    turn: 1,
    executionMode: "local",
    state: {
      battlefield: {
        p1: [],
        p2: [],
      },
      decks: {
        p1: [],
        p2: [],
      },
      exhaustedUnitIds: [],
      graveyards: {
        p1: [],
        p2: [],
      },
      hands: {
        p1: [],
        p2: [],
      },
      lastEvent: "Test duel",
      life: {
        p1: 20,
        p2: 20,
      },
      mana: {
        p1: 1,
        p2: 0,
      },
      maxMana: {
        p1: 1,
        p2: 0,
      },
      rules: defaultTcgRules,
      seed: "test-seed",
      winnerPlayerId: null,
      ...state,
    },
  };
}

test("Arcane Duel initial state is deterministic for the same seed", () => {
  const first = adapter.createInitialState({
    matchId: "tcg-1",
    players,
    setup: { seed: "tcg-seed" },
    executionMode: "local",
  });
  const second = adapter.createInitialState({
    matchId: "tcg-2",
    players,
    setup: { seed: "tcg-seed" },
    executionMode: "local",
  });

  assert.deepEqual(first.state.hands.p1, second.state.hands.p1);
  assert.deepEqual(first.state.decks.p2, second.state.decks.p2);
});

test("Arcane Duel exposes about 100 distinct collectible cards", () => {
  const ids = new Set(tcgCardCatalog.map((card) => card.id));
  const labels = new Set(tcgCardCatalog.map((card) => card.label));

  assert.equal(tcgCardCatalog.length, 100);
  assert.equal(ids.size, tcgCardCatalog.length);
  assert.equal(labels.size, tcgCardCatalog.length);
  assert.equal(
    tcgCardCatalog.some((card) => card.kind === "creature"),
    true,
  );
  assert.equal(
    tcgCardCatalog.some((card) => card.kind === "spell"),
    true,
  );
});

test("TCG deck validation requires 60 cards, ownership, and at most 3 copies", () => {
  const collection = createDefaultTcgCollection();
  const validDeckList = createStarterTcgDeckList();
  const cardId = validDeckList[0]!;

  assert.equal(validDeckList.length, TCG_DECK_SIZE);
  assert.deepEqual(validateTcgDeck(validDeckList, collection).errors, []);

  const tooManyCopies = [
    cardId,
    cardId,
    cardId,
    cardId,
    ...validDeckList.slice(4),
  ];
  const tooManyCopyResult = validateTcgDeck(tooManyCopies, collection);

  assert.equal(tooManyCopyResult.valid, false);
  assert.equal(
    tooManyCopyResult.copyCounts[cardId],
    TCG_MAX_COPIES_PER_CARD + 1,
  );
  assert.equal(
    tooManyCopyResult.errors.some((error) =>
      error.includes("more than 3 copies"),
    ),
    true,
  );

  const shortDeckResult = validateTcgDeck(validDeckList.slice(1), collection);

  assert.equal(shortDeckResult.valid, false);
  assert.equal(
    shortDeckResult.errors.some((error) => error.includes("60 cards")),
    true,
  );

  const missingFromCollection = validateTcgDeck(validDeckList, {
    ...collection,
    [cardId]: 0,
  });

  assert.equal(missingFromCollection.valid, false);
  assert.equal(
    missingFromCollection.missingCards[cardId],
    TCG_MAX_COPIES_PER_CARD,
  );
});

test("TCG deck lists build unique in-match card instances", () => {
  const deck = createTcgDeckFromList(createStarterTcgDeckList());
  const ids = new Set(deck.map((card) => card.id));

  assert.equal(deck.length, TCG_DECK_SIZE);
  assert.equal(ids.size, deck.length);
  assert.equal(
    deck.every((card) => card.catalogId),
    true,
  );
});

test("Arcane Duel starts from validated 60-card deck lists", () => {
  const deckList = createStarterTcgDeckList();
  const state = adapter.createInitialState({
    matchId: "tcg-custom-deck",
    players,
    setup: {
      deckLists: {
        p1: deckList,
      },
      seed: "tcg-custom-deck",
    },
    executionMode: "local",
  });

  assert.equal(state.state.hands.p1.length, defaultTcgRules.startingHandSize);
  assert.equal(
    state.state.decks.p1.length,
    TCG_DECK_SIZE - defaultTcgRules.startingHandSize,
  );
  assert.equal(
    state.state.hands.p1.every((card) => card.catalogId),
    true,
  );
  assert.throws(
    () =>
      adapter.createInitialState({
        matchId: "tcg-invalid-deck",
        players,
        setup: {
          deckLists: {
            p1: deckList.slice(1),
          },
        },
        executionMode: "local",
      }),
    /Invalid TCG deck for p1/,
  );
});

test("playing a creature spends mana and starts exhausted", () => {
  const next = adapter.applyMove(
    createState({
      decks: {
        p1: [spark],
        p2: [spark],
      },
      hands: {
        p1: [ember],
        p2: [],
      },
    }),
    {
      playerId: "p1",
      kind: "play-card",
      createdAt: "2026-04-21T12:00:00.000Z",
      payload: {
        cardId: "ember",
      },
    },
  );

  assert.equal(next.state.mana.p1, 0);
  assert.equal(next.state.hands.p1.length, 0);
  assert.equal(next.state.battlefield.p1.length, 1);
  assert.equal(
    next.state.exhaustedUnitIds.includes(next.state.battlefield.p1[0]!.id),
    true,
  );
  assert.equal(
    adapter.listLegalMoves(next).some((move) => move.kind === "attack"),
    false,
  );
});

test("ending turns readies existing units and attacks the opposing player", () => {
  let state = adapter.applyMove(
    createState({
      decks: {
        p1: [spark],
        p2: [spark],
      },
      hands: {
        p1: [ember],
        p2: [],
      },
    }),
    {
      playerId: "p1",
      kind: "play-card",
      createdAt: "2026-04-21T12:00:00.000Z",
      payload: {
        cardId: "ember",
      },
    },
  );

  state = adapter.applyMove(state, {
    playerId: "p1",
    kind: "end-turn",
    createdAt: "2026-04-21T12:00:01.000Z",
    payload: {},
  });
  state = adapter.applyMove(state, {
    playerId: "p2",
    kind: "end-turn",
    createdAt: "2026-04-21T12:00:02.000Z",
    payload: {},
  });

  const attackerUnitId = state.state.battlefield.p1[0]!.id;
  const legalAttacks = adapter
    .listLegalMoves(state)
    .filter((move) => move.kind === "attack");

  assert.equal(legalAttacks.length > 0, true);

  state = adapter.applyMove(state, {
    playerId: "p1",
    kind: "attack",
    createdAt: "2026-04-21T12:00:03.000Z",
    payload: {
      attackerUnitId,
      targetPlayerId: "p2",
    },
  });

  assert.equal(state.state.life.p2, 18);
  assert.equal(state.state.exhaustedUnitIds.includes(attackerUnitId), true);
});

test("damage spells can destroy opposing units", () => {
  const target = unit(ember, "p2", "target-ember");
  const next = adapter.applyMove(
    createState({
      battlefield: {
        p1: [],
        p2: [target],
      },
      hands: {
        p1: [spark],
        p2: [],
      },
      mana: {
        p1: 1,
        p2: 0,
      },
    }),
    {
      playerId: "p1",
      kind: "play-card",
      createdAt: "2026-04-21T12:00:00.000Z",
      payload: {
        cardId: "spark",
        targetUnitId: target.id,
      },
    },
  );

  assert.equal(next.state.battlefield.p2.length, 0);
  assert.deepEqual(next.state.graveyards.p2, [ember]);
  assert.deepEqual(next.state.graveyards.p1, [spark]);
});

test("match completes when a player reaches zero life", () => {
  const engine = createGameEngine(adapter);
  const state = createState({
    battlefield: {
      p1: [unit(warden, "p1", "attacker")],
      p2: [],
    },
    life: {
      p1: 20,
      p2: 4,
    },
  });
  const next = engine.submitMove(state, {
    playerId: "p1",
    kind: "attack",
    createdAt: "2026-04-21T12:00:00.000Z",
    payload: {
      attackerUnitId: "attacker",
      targetPlayerId: "p2",
    },
  });

  assert.equal(next.state.winnerPlayerId, "p1");
  assert.deepEqual(engine.finalizeMatch(next)?.winnerIds, ["p1"]);
});

test("TCG bots choose proactive moves before ending the turn", () => {
  const bots = createTcgBots([
    { playerId: "p1", displayName: "Alice", seat: 1, controller: "human" },
    { playerId: "p2", displayName: "Bot", seat: 2, controller: "bot" },
  ]);
  const state = createState(
    {
      hands: {
        p1: [],
        p2: [ember],
      },
      mana: {
        p1: 0,
        p2: 1,
      },
      maxMana: {
        p1: 0,
        p2: 1,
      },
    },
    "p2",
  );
  const choice = bots.p2?.chooseMove({
    legalMoves: adapter.listLegalMoves(state),
    participants: [
      { playerId: "p1", displayName: "Alice", seat: 1, controller: "human" },
      { playerId: "p2", displayName: "Bot", seat: 2, controller: "bot" },
    ],
    playerId: "p2",
    state,
  });

  assert.equal(choice?.kind, "play-card");
});
