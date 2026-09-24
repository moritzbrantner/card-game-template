// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  HiddenUnoCardStack,
  UnoCardVisual,
  UnoHandPreview,
} from '@/components/uno-card-visuals';

describe('UNO card visuals', () => {
  it('renders UNO cards as dedicated full-face surfaces', () => {
    render(
      <UnoCardVisual
        card={{
          color: 'red',
          id: 'red-8',
          kind: 'number',
          label: 'Red 8',
          value: 8,
        }}
        variant="compact"
      />,
    );

    const card = screen.getByRole('img', { name: 'Red 8' });

    expect(card.getAttribute('data-uno-card')).toBe('');
    expect(card.getAttribute('data-card-variant')).toBe('compact');
    expect(card.querySelector('[data-uno-card-face]')).toBeTruthy();
    expect(card.querySelector('.mb-playing-card__frame')).toBeNull();
    expect(card.textContent).toContain('8');
  });

  it('uses the same self-contained card shell for hidden UNO cards', () => {
    const { container } = render(
      <HiddenUnoCardStack cardCount={3} compact label="Draw pile" />,
    );

    const backs = container.querySelectorAll('[data-uno-card-back]');

    expect(backs).toHaveLength(3);
    for (const back of backs) {
      expect(back.querySelector('[data-uno-card-face]')).toBeTruthy();
      expect(back.querySelector('.mb-playing-card__frame')).toBeNull();
    }
  });

  it('renders wrapped hands without the wide fanned hand scroller', () => {
    const { container } = render(
      <UnoHandPreview
        hiddenCount={0}
        label="Alice"
        layout="wrap"
        visibleCards={[
          {
            color: 'red',
            id: 'red-5',
            kind: 'number',
            label: 'Red 5',
            value: 5,
          },
          {
            color: 'green',
            id: 'green-7',
            kind: 'number',
            label: 'Green 7',
            value: 7,
          },
        ]}
      />,
    );

    expect(
      screen.getByRole('group', { name: 'Alice visible hand' }),
    ).toBeTruthy();
    expect(container.querySelector('[data-player-hand]')).toBeNull();
    expect(screen.getByLabelText('Red 5')).toBeTruthy();
    expect(screen.getByLabelText('Green 7')).toBeTruthy();
  });
});
