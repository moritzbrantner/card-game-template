'use client';

import type { HTMLAttributes, KeyboardEvent, ReactNode } from 'react';

import { cx } from './lib/cx';

export type CardControlActionKind =
  | 'draw'
  | 'move'
  | 'flip'
  | 'discard'
  | 'other';

export type CardControlAction = {
  description?: string;
  disabled?: boolean;
  id: string;
  kind?: CardControlActionKind;
  label: ReactNode;
  onActivate: () => void;
  pressed?: boolean;
  shortcut?: string;
};

export interface CardControlsProps extends HTMLAttributes<HTMLDivElement> {
  actions: readonly CardControlAction[];
  label?: string;
  selectionLabel?: ReactNode;
}

function matchesShortcut(
  event: KeyboardEvent<HTMLDivElement>,
  shortcut: string,
) {
  const parts = shortcut.split('+').map((part) => part.trim().toLowerCase());
  const key = parts.at(-1);

  if (!key) {
    return false;
  }

  const expectedKey = key === 'space' ? ' ' : key;
  const eventKey = event.key.toLowerCase();
  const hasControl = parts.includes('control') || parts.includes('ctrl');
  const hasAlt = parts.includes('alt');
  const hasShift = parts.includes('shift');
  const hasMeta = parts.includes('meta');

  return (
    eventKey === expectedKey &&
    event.ctrlKey === hasControl &&
    event.altKey === hasAlt &&
    event.shiftKey === hasShift &&
    event.metaKey === hasMeta
  );
}

export function CardControls({
  actions,
  className,
  label = 'Card controls',
  onKeyDown,
  selectionLabel,
  ...divProps
}: CardControlsProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);

    if (event.defaultPrevented || event.repeat) {
      return;
    }

    const action = actions.find(
      (candidate) =>
        !candidate.disabled &&
        candidate.shortcut &&
        matchesShortcut(event, candidate.shortcut),
    );

    if (!action) {
      return;
    }

    event.preventDefault();
    action.onActivate();
  };

  return (
    <div
      {...divProps}
      aria-label={label}
      className={cx(
        'mb-card-controls flex min-w-0 flex-col gap-2 rounded-2xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950',
        className,
      )}
      onKeyDown={handleKeyDown}
      role="toolbar"
    >
      {selectionLabel ? (
        <div
          aria-live="polite"
          className="min-w-0 text-sm text-zinc-600 dark:text-zinc-300"
        >
          {selectionLabel}
        </div>
      ) : null}

      <div className="flex min-w-0 flex-wrap gap-2">
        {actions.map((action) => {
          const isDiscard = action.kind === 'discard';

          return (
            <button
              key={action.id}
              aria-keyshortcuts={action.shortcut}
              aria-pressed={action.pressed}
              className={cx(
                'inline-flex min-h-11 items-center justify-center rounded-xl border px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45 dark:focus-visible:ring-zinc-100',
                isDiscard
                  ? 'border-red-300 bg-red-50 text-red-800 hover:bg-red-100 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200 dark:hover:bg-red-950/65'
                  : 'border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900',
              )}
              data-card-control={action.kind ?? 'other'}
              disabled={action.disabled}
              onClick={action.onActivate}
              title={action.description}
              type="button"
            >
              {action.label}
              {action.shortcut ? (
                <span
                  aria-hidden="true"
                  className="ml-2 text-xs font-normal opacity-60"
                >
                  {action.shortcut}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
