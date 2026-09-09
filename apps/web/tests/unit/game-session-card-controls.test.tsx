// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  CARD_DRAG_MIME_TYPE,
  PlayerHand,
  PlayingCard,
} from '@moritzbrantner/card-games';

import { GameSessionFrame } from '@/apps/showcase/components/game-session';

function createDataTransfer() {
  const data = new Map<string, string>();

  return {
    dropEffect: 'none',
    effectAllowed: 'all',
    getData: (type: string) => data.get(type) ?? '',
    setData: (type: string, value: string) => {
      data.set(type, value);
    },
  } as DataTransfer;
}

describe('GameSessionFrame card controls', () => {
  it('keeps UNO card plays on the cards while exposing draw as a table control', () => {
    const draw = vi.fn();
    const play = vi.fn();

    render(
      <GameSessionFrame
        actions={[
          {
            id: 'draw-card:{}',
            label: 'Draw a card',
            onSelect: draw,
          },
          {
            id: 'play-card:{"cardId":"red-5","sayUno":true}',
            label: 'Play Red 5',
            onSelect: play,
          },
        ]}
        actionsLabel="Legal actions"
        emptyActionsLabel="No actions"
        table={<div>UNO table</div>}
        title="UNO"
      />,
    );

    expect(screen.getByText('UNO table')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Draw a card' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Play Red 5' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Draw a card' }));

    expect(draw).toHaveBeenCalledOnce();
    expect(play).not.toHaveBeenCalled();
  });

  it('routes a Phase 10 discard by dragging the legal hand card to the discard target', () => {
    const discard = vi.fn();
    const dataTransfer = createDataTransfer();

    render(
      <GameSessionFrame
        actions={[
          {
            id: 'discard-card:{"cardId":"red-5"}',
            label: 'Discard Red 5',
            onSelect: discard,
          },
        ]}
        actionsLabel="Legal actions"
        emptyActionsLabel="No actions"
        table={
          <PlayerHand aria-label="Player One hand">
            <PlayingCard
              key="red-5"
              aria-label="Red 5"
              interactive={false}
              rank="5"
              size="sm"
            />
          </PlayerHand>
        }
        title="Phase 10"
      />,
    );

    const card = screen.getByRole('button', { name: 'Red 5' });
    const target = screen.getByLabelText(
      'Legal actions discard pile drop target',
    );

    fireEvent.dragStart(card, { dataTransfer });
    expect(dataTransfer.getData(CARD_DRAG_MIME_TYPE)).toBe('red-5');

    fireEvent.dragOver(target, { dataTransfer });
    fireEvent.drop(target, { dataTransfer });

    expect(discard).toHaveBeenCalledOnce();
  });

  it('does not suppress another game play-card action without UNO payload semantics', () => {
    const play = vi.fn();

    render(
      <GameSessionFrame
        actions={[
          {
            id: 'play-card:{"cardId":"creature-1"}',
            label: 'Play creature',
            onSelect: play,
          },
        ]}
        actionsLabel="Legal actions"
        emptyActionsLabel="No actions"
        table={<div>TCG table</div>}
        title="Arcane Duel"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Play creature' }));

    expect(play).toHaveBeenCalledOnce();
  });
});
