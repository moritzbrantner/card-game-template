// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CardControls } from '../src/card-controls';
import { CardTable } from '../src/card-table';
import { InteractivePlayingCard } from '../src/interactive-playing-card';
import { PlayerHand } from '../src/player-hand';
import { PlayingCard } from '../src/playing-card';

describe('@moritzbrantner/card-games', () => {
  it('renders playing cards inside a table hand', () => {
    render(
      <CardTable title="Demo table" tone="midnight">
        <PlayerHand aria-label="Example hand">
          <PlayingCard
            aria-label="Ace of hearts"
            interactive={false}
            rank="A"
            size="sm"
            suit="hearts"
          />
          <PlayingCard
            aria-label="Queen of spades"
            interactive={false}
            rank="Q"
            size="sm"
            suit="spades"
          />
        </PlayerHand>
      </CardTable>,
    );

    expect(screen.getByText('Demo table')).toBeTruthy();
    expect(screen.getByLabelText('Example hand')).toBeTruthy();
    expect(screen.getByLabelText('Ace of hearts')).toBeTruthy();
    expect(screen.getByLabelText('Queen of spades')).toBeTruthy();
  });

  it('activates selectable cards with pointer and keyboard controls', () => {
    const onActivate = vi.fn();

    render(
      <InteractivePlayingCard
        aria-label="Ace of hearts"
        onActivate={onActivate}
        rank="A"
        selected
        size="sm"
        suit="hearts"
      />,
    );

    const card = screen.getByRole('button', { name: 'Ace of hearts' });

    expect(card.getAttribute('aria-pressed')).toBe('true');
    expect(card.getAttribute('tabindex')).toBe('0');

    fireEvent.click(card);
    fireEvent.keyDown(card, { key: 'Enter' });
    fireEvent.keyDown(card, { key: ' ' });

    expect(onActivate).toHaveBeenCalledTimes(3);
  });

  it('keeps disabled interactive cards inert', () => {
    const onActivate = vi.fn();

    render(
      <InteractivePlayingCard
        aria-label="Hidden card"
        disabled
        onActivate={onActivate}
        rank="?"
        size="sm"
      />,
    );

    const card = screen.getByRole('button', { name: 'Hidden card' });

    expect(card.getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(card);
    fireEvent.keyDown(card, { key: 'Enter' });

    expect(onActivate).not.toHaveBeenCalled();
  });

  it('renders engine-driven draw, move, flip, and discard actions', () => {
    const draw = vi.fn();
    const discard = vi.fn();

    render(
      <CardControls
        actions={[
          {
            id: 'draw',
            kind: 'draw',
            label: 'Draw',
            onActivate: draw,
          },
          {
            disabled: true,
            id: 'move-left',
            kind: 'move',
            label: 'Move left',
            onActivate: vi.fn(),
          },
          {
            id: 'flip',
            kind: 'flip',
            label: 'Flip',
            onActivate: vi.fn(),
            pressed: true,
          },
          {
            id: 'discard',
            kind: 'discard',
            label: 'Discard',
            onActivate: discard,
          },
        ]}
        selectionLabel="Ace of hearts selected"
      />,
    );

    expect(screen.getByRole('toolbar', { name: 'Card controls' })).toBeTruthy();
    expect(screen.getByText('Ace of hearts selected')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Draw' }));
    fireEvent.click(screen.getByRole('button', { name: 'Discard' }));

    expect(draw).toHaveBeenCalledOnce();
    expect(discard).toHaveBeenCalledOnce();
    expect(
      (screen.getByRole('button', { name: 'Move left' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(screen.getByRole('button', { name: 'Flip' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
  });
});
