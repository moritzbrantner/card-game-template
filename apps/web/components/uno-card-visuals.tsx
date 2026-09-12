'use client';

import { type ComponentPropsWithoutRef } from 'react';

import {
  CardStack,
  PlayerHand,
  PlayingCard,
  type CardSuit,
  type PlayingCardEffect,
  type PlayingCardSize,
} from '@moritzbrantner/card-games';
import type { UnoCard, UnoColor } from '@repo/game-uno';

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getCardSuit(color: UnoCard['color']): CardSuit {
  switch (color) {
    case 'red':
      return 'hearts';
    case 'yellow':
      return 'diamonds';
    case 'green':
      return 'clubs';
    case 'blue':
      return 'spades';
    case 'wild':
      return 'joker';
  }
}

function getCardRank(card: UnoCard) {
  switch (card.kind) {
    case 'number':
      return String(card.value ?? '?');
    case 'skip':
      return 'SKIP';
    case 'reverse':
      return 'REV';
    case 'draw-two':
      return '+2';
    case 'wild':
      return 'WILD';
    case 'wild-draw-four':
      return '+4';
  }
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

function getCardEffect(card: UnoCard): PlayingCardEffect {
  if (card.kind === 'wild-draw-four' || card.kind === 'wild') {
    return 'foil';
  }

  return 'standard';
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

const unoCardBaseClassName = [
  '!rounded-[1.35rem]',
  'border-white/80',
  '[&_.mb-playing-card__frame]:inset-[0.42rem]',
  '[&_.mb-playing-card__frame]:rounded-[1rem]',
  '[&_.mb-playing-card__frame]:border-white/35',
  '[&_.mb-playing-card__frame]:p-[0.35rem]',
  '[&_.mb-playing-card__corner]:hidden',
  '[&_.mb-playing-card__badge]:hidden',
  '[&_.mb-playing-card__body]:gap-0',
  '[&_.mb-playing-card__artwork]:h-full',
  '[&_.mb-playing-card__artwork]:min-h-0',
  '[&_.mb-playing-card__artwork]:rounded-[0.82rem]',
  '[&_.mb-playing-card__artwork]:border-0',
  '[&_.mb-playing-card__artwork]:p-0',
  '[&_.mb-playing-card__content]:hidden',
].join(' ');

const compactUnoCardClassName = [
  '!w-[clamp(6rem,10vw,7.25rem)]',
  '!rounded-[1rem]',
  '[&_.mb-playing-card__frame]:inset-[0.32rem]',
  '[&_.mb-playing-card__frame]:rounded-[0.78rem]',
  '[&_.mb-playing-card__frame]:p-[0.24rem]',
  '[&_.mb-playing-card__artwork]:rounded-[0.62rem]',
  '[&_.mb-playing-card__back]:h-full',
  '[&_.mb-playing-card__back]:min-h-0',
  '[&_.mb-playing-card__back]:rounded-[0.62rem]',
  '[&_.mb-playing-card__back]:p-2',
  '[&_.mb-playing-card__back-inner]:gap-1',
  '[&_.mb-playing-card__back-inner]:rounded-[0.5rem]',
].join(' ');

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

export function UnoCardVisual({
  card,
  size = 'sm',
  selected = false,
  className,
  interactive = false,
  variant = 'standard',
  ...cardProps
}: {
  card: UnoCard;
  size?: PlayingCardSize;
  selected?: boolean;
  className?: string;
  interactive?: boolean;
  variant?: 'standard' | 'compact';
} & Omit<
  ComponentPropsWithoutRef<typeof PlayingCard>,
  | 'aria-label'
  | 'artwork'
  | 'badge'
  | 'children'
  | 'className'
  | 'description'
  | 'effect'
  | 'interactive'
  | 'rank'
  | 'selected'
  | 'size'
  | 'suit'
  | 'tone'
>) {
  const symbol = getCardSymbol(card);
  const compact = variant === 'compact';

  return (
    <PlayingCard
      {...cardProps}
      aria-label={card.label}
      artwork={
        <div
          className={joinClasses(
            'relative grid h-full w-full place-items-center overflow-hidden text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.28)]',
            getFaceClass(card.color),
          )}
        >
          <span
            aria-hidden="true"
            className="absolute left-[8%] top-[7%] text-sm font-black leading-none opacity-90 sm:text-base"
          >
            {symbol}
          </span>
          <span
            aria-hidden="true"
            className="absolute bottom-[7%] right-[8%] rotate-180 text-sm font-black leading-none opacity-90 sm:text-base"
          >
            {symbol}
          </span>
          <span
            aria-hidden="true"
            className="absolute left-1/2 top-1/2 h-[74%] w-[58%] -translate-x-1/2 -translate-y-1/2 -rotate-12 rounded-[50%] bg-white/92 shadow-[0_12px_30px_rgba(0,0,0,0.18)]"
          />
          <span
            className={joinClasses(
              'relative z-10 -rotate-12 font-black leading-none tracking-[-0.06em] text-zinc-950',
              compact
                ? 'text-[clamp(2rem,5vw,3.2rem)]'
                : 'text-[clamp(2.8rem,7vw,5rem)]',
            )}
          >
            {symbol}
          </span>
          {card.kind !== 'number' ? (
            <span
              className={joinClasses(
                'absolute bottom-[12%] z-10 -rotate-12 rounded-full bg-zinc-950/80 font-semibold uppercase tracking-[0.12em] text-white',
                compact
                  ? 'px-2 py-0.5 text-[0.48rem]'
                  : 'px-3 py-1 text-[0.62rem]',
              )}
            >
              {card.kind.replaceAll('-', ' ')}
            </span>
          ) : null}
        </div>
      }
      className={joinClasses(
        'shrink-0',
        unoCardBaseClassName,
        compact ? compactUnoCardClassName : undefined,
        className,
      )}
      effect={getCardEffect(card)}
      interactive={interactive}
      rank={getCardRank(card)}
      selected={selected}
      size={size}
      suit={getCardSuit(card.color)}
      tone="classic"
    />
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
      <CardStack className="shrink-0" offsetX={10} offsetY={7} rotateStep={1.8}>
        {Array.from({ length: previewCount }, (_, index) => (
          <PlayingCard
            key={`${label}:${index}`}
            aria-label={`${label} hidden card ${index + 1}`}
            back={
              <div className="relative grid h-full w-full place-items-center overflow-hidden rounded-[0.8rem] bg-zinc-950 text-center">
                <span
                  aria-hidden="true"
                  className="absolute -left-6 top-1/2 h-8 w-[140%] -translate-y-1/2 -rotate-12 bg-gradient-to-r from-rose-500 via-amber-300 via-emerald-500 to-sky-500 opacity-75"
                />
                <span
                  className={joinClasses(
                    'relative z-10 -rotate-12 rounded-full border border-white/25 bg-zinc-950/90 font-black uppercase text-white shadow-lg',
                    compact
                      ? 'px-3 py-1 text-[0.65rem] tracking-[0.12em]'
                      : 'px-4 py-1.5 text-xs tracking-[0.18em]',
                  )}
                >
                  Cards
                </span>
              </div>
            }
            face="back"
            className={joinClasses(
              unoCardBaseClassName,
              compact ? compactUnoCardClassName : undefined,
              '[&_.mb-playing-card__back]:h-full [&_.mb-playing-card__back]:min-h-0 [&_.mb-playing-card__back]:border-0 [&_.mb-playing-card__back]:p-0',
              cardClassName,
            )}
            interactive={false}
            rank="?"
            size={size}
            suit="joker"
            tone="midnight"
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
  ) => Omit<
    ComponentPropsWithoutRef<typeof PlayingCard>,
    | 'aria-label'
    | 'artwork'
    | 'badge'
    | 'children'
    | 'description'
    | 'effect'
    | 'rank'
    | 'selected'
    | 'size'
    | 'suit'
    | 'tone'
  > & { interactive?: boolean };
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
          curve={10}
          overlap={44}
          spreadDegrees={12}
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
                className={cardProps?.className}
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
