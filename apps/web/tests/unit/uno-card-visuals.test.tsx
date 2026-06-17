// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { UnoHandPreview } from '@/components/uno-card-visuals';

describe('UNO card visuals', () => {
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
