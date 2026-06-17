// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { TcgCardVisual, TcgHiddenHand } from '@/components/tcg-card-visuals';

describe('TCG card visuals', () => {
  it('renders creature combat stats and mana cost', () => {
    render(
      <TcgCardVisual
        card={{
          attack: 3,
          cost: 2,
          health: 4,
          id: 'ember-guard-1',
          kind: 'creature',
          label: 'Ember Guard',
        }}
      />,
    );

    expect(screen.getByLabelText('Ember Guard')).toBeTruthy();
    expect(screen.getByText('2 mana')).toBeTruthy();
    expect(screen.getByText('3 ATK')).toBeTruthy();
    expect(screen.getByText('4 HP')).toBeTruthy();
  });

  it('renders hidden opponent hand cards without exposing labels', () => {
    render(<TcgHiddenHand cardCount={3} label="Opponent hand" />);

    expect(screen.getByLabelText('Opponent hand: 3 hidden cards')).toBeTruthy();
    expect(screen.getByText('3 hidden cards')).toBeTruthy();
  });
});
