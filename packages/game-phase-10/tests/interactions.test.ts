import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getPhase10CardActions,
  getPhase10DrawAction,
  getPhase10FallbackActions,
  getPhase10TableActions,
} from '../src/interactions.ts';
import type { Phase10PlayerView } from '../src/index.ts';

const baseMove = {
  createdAt: '2026-09-08T18:00:00.000Z',
  playerId: 'p1',
};

function createView(
  legalActions: Phase10PlayerView['legalActions'],
): Pick<Phase10PlayerView, 'legalActions'> {
  return { legalActions };
}

test('Phase 10 maps each draw source to its pile control', () => {
  const drawPileAction = {
    id: 'draw-pile',
    label: 'Draw from pile',
    move: {
      ...baseMove,
      kind: 'draw-card' as const,
      payload: { source: 'draw' as const },
    },
  };
  const discardPileAction = {
    id: 'draw-discard',
    label: 'Pick up discard',
    move: {
      ...baseMove,
      kind: 'draw-card' as const,
      payload: { source: 'discard' as const },
    },
  };
  const view = createView([drawPileAction, discardPileAction]);

  assert.equal(getPhase10DrawAction(view, 'draw')?.id, 'draw-pile');
  assert.equal(getPhase10DrawAction(view, 'discard')?.id, 'draw-discard');
});

test('Phase 10 maps discard and hit moves to the selected hand card', () => {
  const view = createView([
    {
      id: 'discard-red-5',
      label: 'Discard Red 5',
      move: {
        ...baseMove,
        kind: 'discard-card',
        payload: { cardId: 'red-5' },
      },
    },
    {
      id: 'hit-red-5',
      label: 'Add Red 5 to set',
      move: {
        ...baseMove,
        kind: 'hit-phase',
        payload: {
          cardId: 'red-5',
          groupIndex: 0,
          targetPlayerId: 'p1',
        },
      },
    },
    {
      id: 'discard-blue-7',
      label: 'Discard Blue 7',
      move: {
        ...baseMove,
        kind: 'discard-card',
        payload: { cardId: 'blue-7' },
      },
    },
  ]);

  assert.deepEqual(
    getPhase10CardActions(view, 'red-5').map((action) => action.id),
    ['discard-red-5', 'hit-red-5'],
  );
});

test('Phase 10 keeps whole-table and fallback actions separate from direct controls', () => {
  const view = createView([
    {
      id: 'lay-phase',
      label: 'Lay phase',
      move: {
        ...baseMove,
        kind: 'lay-phase',
        payload: { groups: [['red-5', 'blue-5']] },
      },
    },
  ]);

  assert.deepEqual(
    getPhase10TableActions(view).map((action) => action.id),
    ['lay-phase'],
  );
  assert.deepEqual(getPhase10FallbackActions(view), []);
});
