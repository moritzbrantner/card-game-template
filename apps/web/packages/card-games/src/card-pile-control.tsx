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
          : 'cursor-pointer hover:border-current/20 hover:bg-current/5 active:scale-[0.985]',
        selected ? 'border-current/30 bg-current/8' : null,
        className,
      )}
      disabled={disabled}
      type={type}
    >
      {children}
    </button>
  );
}
