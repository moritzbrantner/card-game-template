'use client';

import { type ComponentPropsWithoutRef } from 'react';

import {
  CardStack,
  PlayingCard,
  type CardSuit,
  type PlayingCardEffect,
  type PlayingCardSize,
  type PlayingCardTone,
} from '@moritzbrantner/card-games';
import type { TcgCard, TcgUnit } from '@repo/game-tcg';

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

function getRealm(card: TcgCard) {
  const source = card.catalogId ?? card.id;
  return source.split('-')[0] ?? 'arcane';
}

function getRealmLabel(card: TcgCard) {
  const realm = getRealm(card);
  return realm.charAt(0).toUpperCase() + realm.slice(1);
}

function getCardSuit(card: TcgCard): CardSuit {
  switch (getRealm(card)) {
    case 'ember':
    case 'sun':
      return 'hearts';
    case 'tide':
    case 'frost':
      return 'spades';
    case 'grove':
    case 'thorn':
      return 'clubs';
    case 'storm':
    case 'moon':
    case 'void':
      return 'joker';
    case 'iron':
      return 'diamonds';
    default:
      return 'joker';
  }
}

function getCardTone(card: TcgCard): PlayingCardTone {
  switch (getRealm(card)) {
    case 'ember':
    case 'sun':
      return 'rose';
    case 'tide':
    case 'storm':
    case 'frost':
    case 'moon':
    case 'void':
      return 'midnight';
    case 'grove':
    case 'thorn':
      return 'emerald';
    default:
      return 'classic';
  }
}

function getCardEffect(card: TcgCard): PlayingCardEffect {
  return card.kind === 'spell' ? 'foil' : 'glass';
}

function getEffectLabel(card: TcgCard) {
  if (card.kind === 'creature') {
    return 'Creature';
  }

  return card.effect === 'heal-2' ? 'Heal 2' : 'Deal 2';
}

function getPrimaryMark(card: TcgCard) {
  if (card.kind === 'spell') {
    return card.effect === 'heal-2' ? '+2' : '-2';
  }

  return `${card.attack ?? 0}/${card.health ?? 0}`;
}

export function TcgCardVisual({
  card,
  className,
  interactive = false,
  size = 'sm',
  selected = false,
  ...cardProps
}: {
  card: TcgCard;
  className?: string;
  interactive?: boolean;
  selected?: boolean;
  size?: PlayingCardSize;
} & Omit<
  ComponentPropsWithoutRef<typeof PlayingCard>,
  | 'aria-label'
  | 'artwork'
  | 'badge'
  | 'children'
  | 'className'
  | 'description'
  | 'effect'
  | 'footer'
  | 'headline'
  | 'interactive'
  | 'rank'
  | 'selected'
  | 'size'
  | 'subtitle'
  | 'suit'
  | 'tone'
>) {
  return (
    <PlayingCard
      {...cardProps}
      aria-label={card.label}
      artwork={
        <div className="grid place-items-center gap-3 text-center">
          <span className="text-[clamp(2rem,6vw,3.75rem)] font-black leading-none">
            {getPrimaryMark(card)}
          </span>
          <span className="rounded-full bg-black/10 px-3 py-1 text-[0.72rem] font-semibold uppercase opacity-70">
            {getEffectLabel(card)}
          </span>
        </div>
      }
      badge={getRealmLabel(card)}
      className={joinClasses('shrink-0', className)}
      description={card.label}
      effect={getCardEffect(card)}
      footer={
        <div className="grid grid-cols-3 gap-2 text-center text-[0.72rem] font-bold uppercase">
          <span className="rounded-full bg-black/10 px-2 py-1">
            {card.cost} mana
          </span>
          {card.kind === 'creature' ? (
            <>
              <span className="rounded-full bg-black/10 px-2 py-1">
                {card.attack ?? 0} ATK
              </span>
              <span className="rounded-full bg-black/10 px-2 py-1">
                {card.health ?? 0} HP
              </span>
            </>
          ) : (
            <span className="col-span-2 rounded-full bg-black/10 px-2 py-1">
              {getEffectLabel(card)}
            </span>
          )}
        </div>
      }
      headline={card.label}
      interactive={interactive}
      rank={String(card.cost)}
      selected={selected}
      size={size}
      subtitle={card.kind}
      suit={getCardSuit(card)}
      tone={getCardTone(card)}
    />
  );
}

export function TcgUnitVisual({
  unit,
  size = 'sm',
}: {
  unit: TcgUnit;
  size?: PlayingCardSize;
}) {
  const remainingHealth = Math.max((unit.card.health ?? 0) - unit.damage, 0);

  return (
    <div className="space-y-2">
      <TcgCardVisual card={unit.card} size={size} />
      <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase text-white/80">
        <span className="rounded-full bg-white/10 px-3 py-1">
          {unit.card.attack ?? 0} ATK
        </span>
        <span className="rounded-full bg-white/10 px-3 py-1">
          {remainingHealth}/{unit.card.health ?? 0} HP
        </span>
      </div>
    </div>
  );
}

export function TcgHiddenHand({
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
        <p className="text-sm font-medium text-inherit">No hidden cards</p>
      </div>
    );
  }

  const previewCount = Math.max(1, Math.min(cardCount, 4));

  return (
    <div
      className="flex flex-wrap items-center gap-3"
      aria-label={`${label}: ${cardCount} hidden cards`}
    >
      <CardStack className="shrink-0" offsetX={10} offsetY={7} rotateStep={2}>
        {Array.from({ length: previewCount }, (_, index) => (
          <PlayingCard
            key={`${label}:${index}`}
            aria-label={`${label} hidden card ${index + 1}`}
            back={
              <div className="grid place-items-center gap-2 text-center">
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase text-white/90">
                  Arcane
                </span>
                <span className="text-xs font-semibold uppercase text-white/70">
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
      <p className="text-sm font-medium text-inherit">
        {cardCount} hidden cards
      </p>
    </div>
  );
}
