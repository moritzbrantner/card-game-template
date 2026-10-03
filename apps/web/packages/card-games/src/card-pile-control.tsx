'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';

import {
  useCardPileActions,
  type CardActionTarget,
} from './card-action-context';
import { cx } from './lib/cx';

const ENABLED_CLASS_NAME =
  'cursor-pointer hover:border-zinc-300 hover:bg-zinc-100/60 active:scale-[0.985] dark:hover:border-zinc-700 dark:hover:bg-zinc-900/60';
const SELECTED_CLASS_NAME =
  'border-zinc-400 bg-zinc-100/70 dark:border-zinc-600 dark:bg-zinc-900/70';

export interface CardPileControlProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'children'
> {
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
        disabled ? 'cursor-not-allowed opacity-50' : ENABLED_CLASS_NAME,
        selected ? SELECTED_CLASS_NAME : null,
        className,
      )}
      disabled={disabled}
      type={type}
    >
      {children}
    </button>
  );
}

export interface CardActionPileControlProps extends Omit<
  CardPileControlProps,
  'disabled' | 'onClick'
> {
  actionTarget: CardActionTarget;
}

export function CardActionPileControl({
  actionTarget,
  ...pileProps
}: CardActionPileControlProps) {
  const actions = useCardPileActions(actionTarget);
  const action = actions.length === 1 ? actions[0] : undefined;

  return (
    <CardPileControl
      {...pileProps}
      data-card-action-id={action?.id}
      disabled={!action || action.disabled}
      onClick={action?.onActivate}
    />
  );
}
