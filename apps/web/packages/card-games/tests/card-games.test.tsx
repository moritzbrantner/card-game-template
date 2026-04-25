// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CardTable } from '../src/card-table';
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
});
