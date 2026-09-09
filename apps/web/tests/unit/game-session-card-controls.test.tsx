// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { GameSessionFrame } from '@/apps/showcase/components/game-session';
import { CardActionPileControl } from '@moritzbrantner/card-games';

describe('GameSessionFrame card controls', () => {
  it('routes the visible pile and toolbar button through the same draw action', () => {
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
        table={
          <div>
            UNO table
            <CardActionPileControl
              actionTarget="draw-pile"
              aria-label="Visible draw pile"
            >
              Draw pile
            </CardActionPileControl>
          </div>
        }
        title="UNO"
      />,
    );

    expect(screen.getByText('UNO table')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Draw a card' })).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Visible draw pile' }),
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Play Red 5' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Visible draw pile' }));
    fireEvent.click(screen.getByRole('button', { name: 'Draw a card' }));

    expect(draw).toHaveBeenCalledTimes(2);
    expect(play).not.toHaveBeenCalled();
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
