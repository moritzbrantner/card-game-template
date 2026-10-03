'use client';

import { type ComponentPropsWithoutRef } from 'react';

import {
  CardStack,
  PlayerHand,
  type PlayingCardSize,
} from '@moritzbrantner/card-games';
import type { UnoCard, UnoColor } from '@repo/game-uno';

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getCardSymbol(card: UnoCard) {
  switch (card.kind) {
    case 'number':
      return String(card.value ?? '?');
    case 'skip':
      return '⊘';
    case 'reverse':
      return '↺';
    case 'draw-two':
      return '+2';
    case 'wild':
      return 'W';
    case 'wild-draw-four':
      return '+4';
  }
}

function getCardActionLabel(card: UnoCard) {
  switch (card.kind) {
    case 'number':
      return null;
    case 'skip':
      return 'Skip';
    case 'reverse':
      return 'Reverse';
    case 'draw-two':
      return 'Draw 2';
    case 'wild':
      return 'Wild';
    case 'wild-draw-four':
      return 'Draw 4';
  }
}

function getColorChipClass(color: UnoCard['color']) {
  switch (color) {
    case 'red':
      return 'bg-rose-500 text-white';
    case 'yellow':
      return 'bg-amber-300 text-zinc-950';
    case 'green':
      return 'bg-emerald-500 text-white';
    case 'blue':
      return 'bg-sky-600 text-white';
    case 'wild':
      return 'bg-gradient-to-r from-rose-500 via-amber-300 to-sky-600 text-white';
  }
}

function getFaceClass(color: UnoCard['color']) {
  switch (color) {
    case 'red':
      return 'bg-gradient-to-br from-rose-500 via-rose-600 to-red-800 text-white';
    case 'yellow':
      return 'bg-gradient-to-br from-amber-200 via-amber-300 to-orange-500 text-zinc-950';
    case 'green':
      return 'bg-gradient-to-br from-emerald-400 via-emerald-600 to-green-800 text-white';
    case 'blue':
      return 'bg-gradient-to-br from-sky-400 via-sky-600 to-blue-800 text-white';
    case 'wild':
      return 'bg-[conic-gradient(from_35deg,#e11d48,#fbbf24,#16a34a,#0284c7,#e11d48)] text-white';
  }
}

function getCenterTextClass(color: UnoCard['color']) {
  switch (color) {
    case 'red':
      return 'text-rose-600';
    case 'yellow':
      return 'text-amber-500';
    case 'green':
      return 'text-emerald-600';
    case 'blue':
      return 'text-sky-600';
    case 'wild':
      return 'text-zinc-950';
  }
}

const CARD_WIDTH_CLASSES: Record<
  'compact' | 'standard',
  Record<PlayingCardSize, string>
> = {
  compact: {
    sm: 'w-[6.75rem] min-w-[6.75rem]',
    md: 'w-[7.75rem] min-w-[7.75rem]',
    lg: 'w-[9rem] min-w-[9rem]',
  },
  standard: {
    sm: 'w-[7.75rem] min-w-[7.75rem]',
    md: 'w-[9.5rem] min-w-[9.5rem]',
    lg: 'w-[11.25rem] min-w-[11.25rem]',
  },
};

function getCardWidthClass(size: PlayingCardSize, compact: boolean) {
  return CARD_WIDTH_CLASSES[compact ? 'compact' : 'standard'][size];
}

function getCardShellClassName({
  className,
  compact,
  interactive,
  selected,
  size,
}: {
  className?: string;
  compact: boolean;
  interactive: boolean;
  selected: boolean;
  size: PlayingCardSize;
}) {
  return joinClasses(
    'relative isolate aspect-[5/7] shrink-0 select-none overflow-hidden border border-white/85 bg-white shadow-[0_12px_30px_rgba(0,0,0,0.22)] outline-none transition-[box-shadow,filter,border-color] duration-150',
    compact ? 'rounded-[0.9rem]' : 'rounded-[1.05rem]',
    getCardWidthClass(size, compact),
    interactive
      ? 'cursor-pointer hover:brightness-105 focus-visible:ring-2 focus-visible:ring-white/90 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950'
      : null,
    selected
      ? 'border-white shadow-[0_16px_38px_rgba(0,0,0,0.32)] ring-2 ring-white/80 ring-offset-2 ring-offset-zinc-950'
      : null,
    className,
  );
}

function UnoCardFace({
  card,
  compact,
}: {
  card: UnoCard;
  compact: boolean;
}) {
  const symbol = getCardSymbol(card);
  const actionLabel = getCardActionLabel(card);
  const isWild = card.color === 'wild';

  return (
    <div
      className={joinClasses(
        'absolute inset-[0.25rem] overflow-hidden border border-white/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]',
        compact ? 'rounded-[0.68rem]' : 'rounded-[0.82rem]',
        getFaceClass(card.color),
      )}
      data-uno-card-face=""
    >
      <span
        aria-hidden="true"
        className="absolute inset-[5%] rounded-[0.55rem] border border-white/18"
      />

      {isWild ? (
        <span
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(118deg,transparent_18%,rgba(255,255,255,0.34)_38%,transparent_58%)] opacity-60"
        />
      ) : null}

      <span
        aria-hidden="true"
        className={joinClasses(
          'absolute left-[9%] top-[8%] z-20 font-black leading-none drop-shadow-[0_1px_1px_rgba(0,0,0,0.18)]',
          compact ? 'text-[1.05rem]' : 'text-[1.25rem]',
        )}
      >
        {symbol}
      </span>

      <span
        aria-hidden="true"
        className={joinClasses(
          'absolute bottom-[8%] right-[9%] z-20 rotate-180 font-black leading-none drop-shadow-[0_1px_1px_rgba(0,0,0,0.18)]',
          compact ? 'text-[1.05rem]' : 'text-[1.25rem]',
        )}
      >
        {symbol}
      </span>

      <span
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 h-[70%] w-[67%] -translate-x-1/2 -translate-y-1/2 -rotate-12 rounded-[50%] bg-white/95 shadow-[0_8px_20px_rgba(0,0,0,0.18)]"
      />

      <span
        className={joinClasses(
          'absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 -rotate-12 whitespace-nowrap font-black leading-none tracking-[-0.08em]',
          compact ? 'text-[2.7rem]' : 'text-[3.7rem]',
          getCenterTextClass(card.color),
        )}
      >
        {symbol}
      </span>

      {actionLabel ? (
        <span
          className={joinClasses(
            'absolute bottom-[12%] left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-full bg-zinc-950/82 font-bold uppercase tracking-[0.12em] text-white shadow-sm',
            compact
              ? 'px-2 py-0.5 text-[0.46rem]'
              : 'px-2.5 py-1 text-[0.58rem]',
          )}
        >
          {actionLabel}
        </span>
      ) : null}
    </div>
  );
}

function UnoCardBack({
  ariaLabel,
  cardClassName,
  compact,
  size,
}: {
  ariaLabel: string;
  cardClassName?: string;
  compact: boolean;
  size: PlayingCardSize;
}) {
  return (
    <div
      aria-label={ariaLabel}
      className={getCardShellClassName({
        className: cardClassName,
        compact,
        interactive: false,
        selected: false,
        size,
      })}
      data-card-variant={compact ? 'compact' : 'standard'}
      data-uno-card=""
      data-uno-card-back=""
      role="img"
    >
      <div
        className={joinClasses(
          'absolute inset-[0.25rem] grid place-items-center overflow-hidden border border-white/30 bg-zinc-950 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16)]',
          compact ? 'rounded-[0.68rem]' : 'rounded-[0.82rem]',
        )}
        data-uno-card-face=""
      >
        <span
          aria-hidden="true"
          className="absolute left-1/2 top-1/2 h-[150%] w-[30%] -translate-x-1/2 -translate-y-1/2 -rotate-[28deg] bg-gradient-to-b from-rose-500 via-amber-300 via-emerald-500 to-sky-500 opacity-85"
        />
        <span
          aria-hidden="true"
          className="absolute left-1/2 top-1/2 h-[66%] w-[62%] -translate-x-1/2 -translate-y-1/2 -rotate-12 rounded-[50%] border-2 border-white/80 bg-zinc-950/88 shadow-[0_6px_18px_rgba(0,0,0,0.35)]"
        />
        <span
          className={joinClasses(
            'relative z-10 -rotate-12 font-black uppercase tracking-[0.1em] text-white',
            compact ? 'text-[0.72rem]' : 'text-sm',
          )}
        >
          Cards
        </span>
      </div>
    </div>
  );
}

export function UnoColorBadge({
  color,
  label,
}: {
  color: UnoColor;
  label?: string;
}) {
  return (
    <span
      className={joinClasses(
        'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]',
        getColorChipClass(color),
      )}
    >
      <span
        aria-hidden="true"
        className="inline-flex h-2.5 w-2.5 rounded-full bg-white/85"
      />
      {label ?? capitalize(color)}
    </span>
  );
}

type UnoCardElementProps = Omit<
  ComponentPropsWithoutRef<'div'>,
  'aria-label' | 'children'
>;

export type UnoCardVisualProps = UnoCardElementProps & {
  card: UnoCard;
  size?: PlayingCardSize;
  selected?: boolean;
  interactive?: boolean;
  variant?: 'standard' | 'compact';
};

export function UnoCardVisual({
  card,
  size = 'sm',
  selected = false,
  className,
  interactive = false,
  variant = 'standard',
  role,
  ...cardProps
}: UnoCardVisualProps) {
  const compact = variant === 'compact';

  return (
    <div
      {...cardProps}
      aria-label={card.label}
      className={getCardShellClassName({
        className,
        compact,
        interactive,
        selected,
        size,
      })}
      data-card-color={card.color}
      data-card-kind={card.kind}
      data-card-size={size}
      data-card-variant={variant}
      data-interactive={interactive}
      data-selected={selected}
      data-uno-card=""
      role={role ?? 'img'}
    >
      <UnoCardFace card={card} compact={compact} />
    </div>
  );
}

export function HiddenUnoCardStack({
  cardCount,
  label,
  size = 'sm',
  cardClassName,
  className,
  compact = false,
}: {
  cardCount: number;
  label: string;
  size?: PlayingCardSize;
  cardClassName?: string;
  className?: string;
  compact?: boolean;
}) {
  if (cardCount <= 0) {
    return (
      <div
        className={joinClasses('space-y-1', className)}
        aria-label={`${label}: empty`}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-60">
          {label}
        </p>
        <p className="text-sm font-medium text-inherit">No hidden cards</p>
      </div>
    );
  }

  const previewCount = Math.max(1, Math.min(cardCount, 3));

  return (
    <div
      className={joinClasses('flex flex-wrap items-center gap-3', className)}
      aria-label={`${label}: ${cardCount} hidden cards`}
    >
      <CardStack className="shrink-0" offsetX={9} offsetY={6} rotateStep={1.4}>
        {Array.from({ length: previewCount }, (_, index) => (
          <UnoCardBack
            key={`${label}:${index}`}
            ariaLabel={`${label} hidden card ${index + 1}`}
            cardClassName={cardClassName}
            compact={compact}
            size={size}
          />
        ))}
      </CardStack>
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-55">
          {label}
        </p>
        <p className="text-sm font-medium text-inherit">
          {cardCount} hidden cards
        </p>
      </div>
    </div>
  );
}

export function UnoHandPreview({
  visibleCards,
  hiddenCount,
  label,
  size = 'sm',
  className,
  getCardProps,
  layout = 'fan',
}: {
  visibleCards: readonly UnoCard[];
  hiddenCount: number;
  label: string;
  size?: PlayingCardSize;
  className?: string;
  layout?: 'fan' | 'wrap';
  getCardProps?: (
    card: UnoCard,
    index: number,
  ) => Omit<UnoCardVisualProps, 'card' | 'selected' | 'size' | 'variant'>;
}) {
  if (visibleCards.length === 0 && hiddenCount <= 0) {
    return null;
  }

  return (
    <div className={joinClasses('space-y-3', className)}>
      {visibleCards.length > 0 && layout === 'fan' ? (
        <PlayerHand
          aria-label={`${label} visible hand`}
          className="-mx-3 overflow-x-auto px-3 pb-2"
          curve={6}
          overlap={16}
          spreadDegrees={8}
        >
          {visibleCards.map((card, index) => (
            <UnoCardVisual
              key={card.id}
              card={card}
              {...getCardProps?.(card, index)}
              selected={index === visibleCards.length - 1 && hiddenCount === 0}
              size={size}
            />
          ))}
        </PlayerHand>
      ) : null}

      {visibleCards.length > 0 && layout === 'wrap' ? (
        <div
          aria-label={`${label} visible hand`}
          className="flex max-w-full flex-wrap justify-center gap-2 pb-1 sm:gap-3"
          role="group"
        >
          {visibleCards.map((card, index) => {
            const cardProps = getCardProps?.(card, index);

            return (
              <UnoCardVisual
                key={card.id}
                card={card}
                {...cardProps}
                selected={
                  index === visibleCards.length - 1 && hiddenCount === 0
                }
                size={size}
                variant="compact"
              />
            );
          })}
        </div>
      ) : null}

      {hiddenCount > 0 ? (
        <HiddenUnoCardStack
          cardCount={hiddenCount}
          label={`${label} hidden hand`}
          compact={layout === 'wrap'}
          size={size}
        />
      ) : null}
    </div>
  );
}
