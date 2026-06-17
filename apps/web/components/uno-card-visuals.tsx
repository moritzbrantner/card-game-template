'use client';

import { type ComponentPropsWithoutRef } from 'react';

import {
  CardStack,
  PlayerHand,
  PlayingCard,
  type CardSuit,
  type PlayingCardEffect,
  type PlayingCardSize,
  type PlayingCardTone,
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

function getCardTone(color: UnoCard['color']): PlayingCardTone {
  switch (color) {
    case 'red':
      return 'rose';
    case 'yellow':
      return 'classic';
    case 'green':
      return 'emerald';
    case 'blue':
      return 'midnight';
    case 'wild':
      return 'classic';
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

function getCardBadge(card: UnoCard) {
  if (card.color === 'wild') {
    return 'Wild';
  }

  return capitalize(card.color);
}

function getCardEffect(card: UnoCard): PlayingCardEffect {
  if (card.kind === 'wild-draw-four' || card.kind === 'wild') {
    return 'foil';
  }

  if (card.kind === 'reverse') {
    return 'glass';
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

const compactUnoCardClassName = [
  '!w-[clamp(6.75rem,12vw,8rem)]',
  '!rounded-[1.1rem]',
  '[&_.mb-playing-card__frame]:inset-2',
  '[&_.mb-playing-card__frame]:rounded-[0.9rem]',
  '[&_.mb-playing-card__frame]:p-2',
  '[&_.mb-playing-card__corner]:left-2',
  '[&_.mb-playing-card__corner]:top-2',
  '[&_.mb-playing-card__rank]:text-[0.82rem]',
  '[&_.mb-playing-card__symbol]:text-[0.72rem]',
  '[&_.mb-playing-card__badge]:right-2',
  '[&_.mb-playing-card__badge]:top-2',
  '[&_.mb-playing-card__badge]:max-w-[calc(100%-3.4rem)]',
  '[&_.mb-playing-card__badge]:px-2',
  '[&_.mb-playing-card__badge]:py-0.5',
  '[&_.mb-playing-card__badge]:text-[0.55rem]',
  '[&_.mb-playing-card__badge]:tracking-[0.06em]',
  '[&_.mb-playing-card__body]:gap-1',
  '[&_.mb-playing-card__artwork]:h-full',
  '[&_.mb-playing-card__artwork]:min-h-0',
  '[&_.mb-playing-card__artwork]:rounded-[0.7rem]',
  '[&_.mb-playing-card__artwork]:p-2',
  '[&_.mb-playing-card__back]:h-full',
  '[&_.mb-playing-card__back]:min-h-0',
  '[&_.mb-playing-card__back]:rounded-[0.7rem]',
  '[&_.mb-playing-card__back]:p-2',
  '[&_.mb-playing-card__back-inner]:gap-1',
  '[&_.mb-playing-card__back-inner]:rounded-[0.55rem]',
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
  return (
    <PlayingCard
      {...cardProps}
      aria-label={card.label}
      artwork={
        <div
          className={joinClasses(
            'grid place-items-center text-center',
            variant === 'compact' ? 'gap-1' : 'gap-3',
          )}
        >
          <span
            className={joinClasses(
              'font-black leading-none',
              variant === 'compact'
                ? 'text-[clamp(2.25rem,5vw,3.25rem)]'
                : 'text-[clamp(2.25rem,7vw,4.25rem)]',
            )}
          >
            {getCardSymbol(card)}
          </span>
          <span
            className={joinClasses(
              'rounded-full bg-black/10 font-semibold uppercase opacity-70',
              variant === 'compact'
                ? 'px-2 py-0.5 text-[0.55rem] tracking-[0.1em]'
                : 'px-3 py-1 text-[0.72rem] tracking-[0.18em]',
            )}
          >
            {card.kind === 'number' ? 'Number' : card.kind.replaceAll('-', ' ')}
          </span>
        </div>
      }
      badge={variant === 'compact' ? undefined : getCardBadge(card)}
      className={joinClasses(
        'shrink-0',
        variant === 'compact' ? compactUnoCardClassName : undefined,
        className,
      )}
      description={variant === 'compact' ? undefined : card.label}
      effect={getCardEffect(card)}
      interactive={interactive}
      rank={getCardRank(card)}
      selected={selected}
      size={size}
      suit={getCardSuit(card.color)}
      tone={getCardTone(card.color)}
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
      <CardStack className="shrink-0" offsetX={12} offsetY={8} rotateStep={2.2}>
        {Array.from({ length: previewCount }, (_, index) => (
          <PlayingCard
            key={`${label}:${index}`}
            aria-label={`${label} hidden card ${index + 1}`}
            back={
              <div
                className={joinClasses(
                  'grid place-items-center text-center',
                  compact ? 'gap-1' : 'gap-2',
                )}
              >
                <span
                  className={joinClasses(
                    'rounded-full bg-white/10 font-bold uppercase text-white/90',
                    compact
                      ? 'px-2 py-0.5 text-[0.58rem] tracking-[0.12em]'
                      : 'px-3 py-1 text-xs tracking-[0.18em]',
                  )}
                >
                  UNO
                </span>
                <span
                  className={joinClasses(
                    'font-semibold uppercase text-white/70',
                    compact
                      ? 'text-[0.55rem] tracking-[0.14em]'
                      : 'text-xs tracking-[0.2em]',
                  )}
                >
                  Hidden
                </span>
              </div>
            }
            face="back"
            className={joinClasses(
              compact ? compactUnoCardClassName : undefined,
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
        <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-60">
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
