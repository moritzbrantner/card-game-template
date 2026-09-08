'use client';

import type { KeyboardEvent, MouseEvent } from 'react';

import { cx } from './lib/cx';
import { PlayingCard, type PlayingCardProps } from './playing-card';

export interface InteractivePlayingCardProps
  extends Omit<PlayingCardProps, 'interactive'> {
  disabled?: boolean;
  onActivate: () => void;
}

export function InteractivePlayingCard({
  className,
  disabled = false,
  onActivate,
  onClick,
  onKeyDown,
  role,
  selected = false,
  tabIndex,
  ...cardProps
}: InteractivePlayingCardProps) {
  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    onClick?.(event);

    if (!disabled && !event.defaultPrevented) {
      onActivate();
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);

    if (
      disabled ||
      event.defaultPrevented ||
      (event.key !== 'Enter' && event.key !== ' ')
    ) {
      return;
    }

    event.preventDefault();
    onActivate();
  };

  return (
    <PlayingCard
      {...cardProps}
      aria-disabled={disabled || undefined}
      aria-pressed={selected}
      className={cx(
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current focus-visible:ring-offset-4',
        disabled ? 'cursor-not-allowed opacity-55' : null,
        className,
      )}
      interactive={!disabled}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role={role ?? 'button'}
      selected={selected}
      tabIndex={tabIndex ?? 0}
    />
  );
}
