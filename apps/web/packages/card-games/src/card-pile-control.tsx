'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { cx } from './lib/cx';

export interface CardPileControlProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  children: ReactNode;
  selected?: boolean;
}

export function CardPileControl({
  children,
  className,
  disabled = false,
  selected = false,
  type = 'button',
  ...buttonProps
}: CardPileControlProps) {
  return (
    <button
      {...buttonProps}
      aria-pressed={selected || undefined}
      className={cx(
        'group inline-flex min-h-11 min-w-11 items-center justify-center rounded-2xl border border-transparent p-2 text-left transition-[border-color,background-color,transform,opacity] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current focus-visible:ring-offset-2',
        disabled
          ? 'cursor-not-allowed opacity-50'
          : 'cursor-pointer hover:border-zinc-300 hover:bg-zinc-100/60 active:scale-[0.985] dark:hover:border-zinc-700 dark:hover:bg-zinc-900/60',
        selected
          ? 'border-zinc-400 bg-zinc-100/70 dark:border-zinc-600 dark:bg-zinc-900/70'
          : null,
        className,
      )}
      disabled={disabled}
      type={type}
    >
      {children}
    </button>
  );
}
