import type { Phase10PlayerView } from './index.js';

export type Phase10ProjectedAction = Phase10PlayerView['legalActions'][number];
export type Phase10DrawSource = 'draw' | 'discard';

export function getPhase10DrawAction(
  view: Pick<Phase10PlayerView, 'legalActions'>,
  source: Phase10DrawSource,
): Phase10ProjectedAction | null {
  return (
    view.legalActions.find(
      (action) =>
        action.move.kind === 'draw-card' &&
        action.move.payload.source === source,
    ) ?? null
  );
}

export function getPhase10CardActions(
  view: Pick<Phase10PlayerView, 'legalActions'>,
  cardId: string,
): Phase10ProjectedAction[] {
  return view.legalActions.filter((action) => {
    if (
      action.move.kind !== 'discard-card' &&
      action.move.kind !== 'hit-phase'
    ) {
      return false;
    }

    return action.move.payload.cardId === cardId;
  });
}

export function getPhase10TableActions(
  view: Pick<Phase10PlayerView, 'legalActions'>,
): Phase10ProjectedAction[] {
  return view.legalActions.filter((action) => action.move.kind === 'lay-phase');
}

export function getPhase10FallbackActions(
  view: Pick<Phase10PlayerView, 'legalActions'>,
): Phase10ProjectedAction[] {
  return view.legalActions.filter(
    (action) =>
      action.move.kind !== 'draw-card' &&
      action.move.kind !== 'discard-card' &&
      action.move.kind !== 'hit-phase' &&
      action.move.kind !== 'lay-phase',
  );
}
