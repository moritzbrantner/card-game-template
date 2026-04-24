import assert from 'node:assert/strict';
import test from 'node:test';

import {
  addCards,
  drawCardsBetweenStacks,
  drawCardsFromBottom,
  drawCardsFromSources,
  drawCardsFromTop,
  hideAllCards,
  hideCardById,
  moveCardById,
  moveCardsBetweenStacks,
  removeCardById,
  removeCardsById,
  revealAllCards,
  revealCardById,
  shuffleCards,
  shuffleWithSeed,
  sortCards,
  sortCardsByRankAndSuit,
} from '../src/index.ts';

type TestCard = {
  id: string;
  label: string;
  rank?: number | string;
  suit?: string;
};

const deck: readonly TestCard[] = [
  { id: 'a', label: 'A', rank: 'A', suit: 'spades' },
  { id: '2', label: '2', rank: 2, suit: 'clubs' },
  { id: 'k', label: 'K', rank: 'K', suit: 'hearts' },
];

test('stack helpers preserve insertion and movement semantics', () => {
  assert.deepEqual(
    addCards(deck, [{ id: 'x', label: 'X' }], { position: 'start' }).map(
      (card) => card.id,
    ),
    ['x', 'a', '2', 'k'],
  );

  assert.deepEqual(
    removeCardById(deck, '2').cards.map((card) => card.id),
    ['a', 'k'],
  );
  assert.deepEqual(removeCardsById(deck, ['a', 'k']).removedCards.length, 2);
  assert.equal(
    moveCardById(deck, 'a', { position: 'end' }).cards.at(-1)?.id,
    'a',
  );
});

test('draw helpers move cards between stacks deterministically', () => {
  const stacks = {
    deck,
    discard: [] as readonly TestCard[],
    hand: [] as readonly TestCard[],
  };

  assert.deepEqual(
    drawCardsFromTop(deck, 2).drawnCards.map((card) => card.id),
    ['a', '2'],
  );
  assert.deepEqual(
    drawCardsFromBottom(deck, 1).drawnCards.map((card) => card.id),
    ['k'],
  );

  const drawn = drawCardsBetweenStacks(stacks, {
    source: 'deck',
    destination: 'hand',
    amount: 2,
  });
  assert.deepEqual(
    drawn.stacks.hand.map((card) => card.id),
    ['a', '2'],
  );

  const moved = moveCardsBetweenStacks(drawn.stacks, {
    source: 'hand',
    destination: 'discard',
    cardIds: ['a'],
  });
  assert.deepEqual(
    moved.stacks.discard.map((card) => card.id),
    ['a'],
  );

  const multiSource = drawCardsFromSources(
    {
      deck: [{ id: 'x', label: 'X' }],
      discard: [{ id: 'y', label: 'Y' }],
      hand: [] as readonly TestCard[],
    },
    {
      amount: 2,
      destination: 'hand',
      sources: [{ source: 'deck' }, { source: 'discard' }],
    },
  );
  assert.deepEqual(
    multiSource.stacks.hand.map((card) => card.id),
    ['x', 'y'],
  );
});

test('visibility helpers annotate cards without mutating ids', () => {
  assert.deepEqual(
    revealAllCards(deck).map((card) => card.visibility),
    ['face-up', 'face-up', 'face-up'],
  );
  assert.deepEqual(
    hideAllCards(deck).map((card) => card.visibility),
    ['face-down', 'face-down', 'face-down'],
  );
  assert.equal(revealCardById(deck, '2')[1]?.visibility, 'face-up');
  assert.equal(hideCardById(deck, 'a')[0]?.visibility, 'face-down');
});

test('shuffle and sort helpers remain deterministic', () => {
  assert.deepEqual(
    shuffleWithSeed(deck, 'cards'),
    shuffleWithSeed(deck, 'cards'),
  );
  assert.deepEqual(
    shuffleCards(deck, { seed: 'cards' }),
    shuffleCards(deck, { seed: 'cards' }),
  );
  assert.throws(() => {
    shuffleCards(deck, { seed: 'cards', nextRandom: () => 0 });
  });

  assert.deepEqual(
    sortCards(deck, (left, right) => left.id.localeCompare(right.id)).map(
      (card) => card.id,
    ),
    ['2', 'a', 'k'],
  );
  assert.deepEqual(
    sortCardsByRankAndSuit(deck).map((card) => card.id),
    ['2', 'k', 'a'],
  );
});
