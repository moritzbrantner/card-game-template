import type { UnoPlayerView } from './index.ts';

export type UnoProjectedAction = UnoPlayerView['legalActions'][number];

export function getUnoDrawAction(
  view: Pick<UnoPlayerView, 'legalActions'>,
): UnoProjectedAction | null {
  return (
    view.legalActions.find((action) => action.move.kind === 'draw-card') ?? null
  );
}

export function getUnoFallbackActions(
  view: Pick<UnoPlayerView, 'legalActions'>,
): UnoProjectedAction[] {
  return view.legalActions.filter(
    (action) =>
      action.move.kind !== 'draw-card' && action.move.kind !== 'play-card',
  );
}
