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
  ...cardProps
}: {
  card: UnoCard;
  size?: PlayingCardSize;
  selected?: boolean;
  className?: string;
  interactive?: boolean;
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
        <div className="grid place-items-center gap-3 text-center">
          <span className="text-[clamp(2.25rem,7vw,4.25rem)] font-black leading-none">
            {getCardSymbol(card)}
          </span>
          <span className="rounded-full bg-black/10 px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.18em] opacity-70">
            {card.kind === 'number' ? 'Number' : card.kind.replaceAll('-', ' ')}
          </span>
        </div>
      }
      badge={getCardBadge(card)}
      className={joinClasses('shrink-0', className)}
      description={card.label}
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
}: {
  cardCount: number;
  label: string;
  size?: PlayingCardSize;
}) {
  if (cardCount <= 0) {
    return (
      <div className="space-y-1" aria-label={`${label}: empty`}>
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
      className="flex flex-wrap items-center gap-3"
      aria-label={`${label}: ${cardCount} hidden cards`}
    >
      <CardStack className="shrink-0" offsetX={12} offsetY={8} rotateStep={2.2}>
        {Array.from({ length: previewCount }, (_, index) => (
          <PlayingCard
            key={`${label}:${index}`}
            aria-label={`${label} hidden card ${index + 1}`}
            back={
              <div className="grid place-items-center gap-2 text-center">
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-white/90">
                  UNO
                </span>
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
                  Hidden
                </span>
              </div>
            }
            face="back"
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
}: {
  visibleCards: readonly UnoCard[];
  hiddenCount: number;
  label: string;
  size?: PlayingCardSize;
  className?: string;
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
      {visibleCards.length > 0 ? (
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

      {hiddenCount > 0 ? (
        <HiddenUnoCardStack
          cardCount={hiddenCount}
          label={`${label} hidden hand`}
          size={size}
        />
      ) : null}
    </div>
  );
}
