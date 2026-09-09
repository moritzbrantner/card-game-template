import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getUnoDrawAction,
  getUnoFallbackActions,
} from '../src/interactions.ts';
import type { UnoPlayerView } from '../src/index.ts';

const baseMove = {
  createdAt: '2026-09-08T18:00:00.000Z',
  playerId: 'p1',
};

function createView(
  legalActions: UnoPlayerView['legalActions'],
): Pick<UnoPlayerView, 'legalActions'> {
  return { legalActions };
}

test('UNO maps its draw move to the draw pile control', () => {
  const view = createView([
    {
      id: 'draw-card',
      label: 'Draw a card',
      move: {
        ...baseMove,
        kind: 'draw-card',
        payload: {},
      },
    },
  ]);

  assert.equal(getUnoDrawAction(view)?.id, 'draw-card');
});

test('UNO leaves only non-card fallback actions in the generic controls', () => {
  const view = createView([
    {
      id: 'draw-card',
      label: 'Draw a card',
      move: {
        ...baseMove,
        kind: 'draw-card',
        payload: {},
      },
    },
    {
      id: 'play-red-5',
      label: 'Play Red 5',
      move: {
        ...baseMove,
        kind: 'play-card',
        payload: { cardId: 'red-5' },
      },
    },
    {
      id: 'pass',
      label: 'Pass',
      move: {
        ...baseMove,
        kind: 'pass',
        payload: {},
      },
    },
  ]);

  assert.deepEqual(
    getUnoFallbackActions(view).map((action) => action.id),
    ['pass'],
  );
});
