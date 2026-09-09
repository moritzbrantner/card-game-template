// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CardActionProvider } from '../src/card-action-context';
import { CardControls } from '../src/card-controls';
import { CARD_DRAG_MIME_TYPE, CardDropZone } from '../src/card-drop-zone';
import { CardPileControl } from '../src/card-pile-control';
import { CardTable } from '../src/card-table';
import { InteractivePlayingCard } from '../src/interactive-playing-card';
import { PlayerHand } from '../src/player-hand';
import { PlayingCard } from '../src/playing-card';

function createDataTransfer() {
  const data = new Map<string, string>();

  return {
    dropEffect: 'none',
    effectAllowed: 'all',
    getData: (type: string) => data.get(type) ?? '',
    setData: (type: string, value: string) => {
      data.set(type, value);
    },
  } as unknown as DataTransfer;
}

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

  it('activates an entire pile as one accessible control', () => {
    const onActivate = vi.fn();

    render(
      <CardPileControl aria-label="Draw pile" onClick={onActivate} selected>
        <PlayingCard
          aria-label="Top draw card"
          face="back"
          interactive={false}
          rank="?"
          size="sm"
        />
      </CardPileControl>,
    );

    const pile = screen.getByRole('button', { name: 'Draw pile' });

    expect(pile.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(pile);
    expect(onActivate).toHaveBeenCalledOnce();
  });

  it('turns engine-addressed hand cards into contextual controls', () => {
    const discard = vi.fn();

    render(
      <CardActionProvider
        actions={[
          {
            cardId: 'red-5',
            id: 'discard-red-5',
            kind: 'discard',
            label: 'Discard Red 5',
            onActivate: discard,
          },
        ]}
      >
        <PlayerHand aria-label="Player One hand">
          <PlayingCard
            key="red-5"
            aria-label="Red 5"
            interactive={false}
            rank="5"
            size="sm"
            suit="hearts"
          />
          <PlayingCard
            key="blue-7"
            aria-label="Blue 7"
            interactive={false}
            rank="7"
            size="sm"
            suit="spades"
          />
        </PlayerHand>
      </CardActionProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Red 5' }));

    expect(screen.getByText('Red 5 selected')).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Blue 7' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Discard Red 5' }));

    expect(discard).toHaveBeenCalledOnce();
    expect(screen.queryByText('Red 5 selected')).toBeNull();
  });

  it(
    'routes an unambiguous legal card drop through the registered action',
    () => {
      const discard = vi.fn();
      const dataTransfer = createDataTransfer();

      render(
        <CardActionProvider
          actions={[
            {
              cardId: 'red-5',
              id: 'discard-red-5',
              kind: 'discard',
              label: 'Discard Red 5',
              onActivate: discard,
              target: 'discard-pile',
            },
          ]}
        >
          <PlayerHand aria-label="Player One hand">
            <PlayingCard
              key="red-5"
              aria-label="Red 5"
              interactive={false}
              rank="5"
              size="sm"
              suit="hearts"
            />
          </PlayerHand>
          <CardDropZone
            aria-label="Discard pile drop target"
            target="discard-pile"
          >
            Discard pile
          </CardDropZone>
        </CardActionProvider>,
      );

      const card = screen.getByRole('button', { name: 'Red 5' });
      const target = screen.getByLabelText('Discard pile drop target');

      expect(card.getAttribute('draggable')).toBe('true');

      fireEvent.dragStart(card, { dataTransfer });
      expect(dataTransfer.getData(CARD_DRAG_MIME_TYPE)).toBe('red-5');

      fireEvent.dragOver(target, { dataTransfer });
      expect(target.getAttribute('data-card-drop-active')).toBe('true');

      fireEvent.drop(target, { dataTransfer });

      expect(discard).toHaveBeenCalledOnce();
      expect(target.getAttribute('data-card-drop-active')).toBeNull();
    },
  );

  it(
    'does not guess when one card has multiple legal actions for a drop target',
    () => {
      const first = vi.fn();
      const second = vi.fn();
      const dataTransfer = createDataTransfer();

      render(
        <CardActionProvider
          actions={[
            {
              cardId: 'wild-1',
              id: 'play-wild-red',
              label: 'Play wild as red',
              onActivate: first,
              target: 'discard-pile',
            },
            {
              cardId: 'wild-1',
              id: 'play-wild-blue',
              label: 'Play wild as blue',
              onActivate: second,
              target: 'discard-pile',
            },
          ]}
        >
          <PlayerHand aria-label="Player One hand">
            <PlayingCard
              key="wild-1"
              aria-label="Wild card"
              interactive={false}
              rank="W"
              size="sm"
            />
          </PlayerHand>
          <CardDropZone
            aria-label="Discard pile drop target"
            target="discard-pile"
          >
            Discard pile
          </CardDropZone>
        </CardActionProvider>,
      );

      const card = screen.getByRole('button', { name: 'Wild card' });
      const target = screen.getByLabelText('Discard pile drop target');

      fireEvent.dragStart(card, { dataTransfer });
      fireEvent.dragOver(target, { dataTransfer });
      fireEvent.drop(target, { dataTransfer });

      expect(first).not.toHaveBeenCalled();
      expect(second).not.toHaveBeenCalled();
      expect(target.getAttribute('data-card-drop-active')).toBeNull();
    },
  );

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
    expect(
      screen.getByRole('button', { name: 'Flip' }).getAttribute('aria-pressed'),
    ).toBe('true');
  });

  it('implements advertised card control keyboard shortcuts', () => {
    const draw = vi.fn();
    const disabledDiscard = vi.fn();

    render(
      <CardControls
        actions={[
          {
            id: 'draw',
            kind: 'draw',
            label: 'Draw',
            onActivate: draw,
            shortcut: 'D',
          },
          {
            disabled: true,
            id: 'discard',
            kind: 'discard',
            label: 'Discard',
            onActivate: disabledDiscard,
            shortcut: 'X',
          },
        ]}
      />,
    );

    const drawButton = screen.getByRole('button', { name: 'Draw' });

    expect(drawButton.getAttribute('aria-keyshortcuts')).toBe('D');

    fireEvent.keyDown(drawButton, { key: 'd' });
    fireEvent.keyDown(drawButton, { key: 'x' });

    expect(draw).toHaveBeenCalledOnce();
    expect(disabledDiscard).not.toHaveBeenCalled();
  });
});
