'use client';

import type { ReactNode } from 'react';

import { CardFan, type CardFanProps } from './card-fan';
import { cx } from './lib/cx';

export interface PlayerHandProps extends CardFanProps {
  label?: ReactNode;
}

export function PlayerHand({
  label = 'Player hand',
  'aria-label': ariaLabel,
  className,
  children,
  ...divProps
}: PlayerHandProps) {
  const accessibleLabel =
    ariaLabel ?? (typeof label === 'string' ? label : undefined);

  return (
    <CardFan
      {...divProps}
      aria-label={accessibleLabel}
      className={cx('mb-player-hand justify-start overflow-x-auto', className)}
      data-player-hand=""
    >
      {children}
    </CardFan>
  );
}
