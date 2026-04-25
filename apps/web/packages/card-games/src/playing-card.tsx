'use client';

import {
  useRef,
  type CSSProperties,
  type HTMLAttributes,
  type PointerEvent,
  type ReactNode,
} from 'react';

import { cx } from './lib/cx';
import { formatCardLabel, getSuitSymbol, type CardSuit } from './suit';

type PlayingCardStyle = CSSProperties &
  Record<string, string | number | undefined>;

export type PlayingCardSize = 'sm' | 'md' | 'lg';
export type PlayingCardTone = 'classic' | 'midnight' | 'emerald' | 'rose';
export type PlayingCardEffect = 'standard' | 'foil' | 'glass';
export type PlayingCardFace = 'front' | 'back';

export interface PlayingCardProps extends HTMLAttributes<HTMLDivElement> {
  rank: string;
  suit?: CardSuit;
  face?: PlayingCardFace;
  size?: PlayingCardSize;
  tone?: PlayingCardTone;
  effect?: PlayingCardEffect;
  interactive?: boolean;
  selected?: boolean;
  headline?: ReactNode;
  subtitle?: ReactNode;
  description?: ReactNode;
  artwork?: ReactNode;
  badge?: ReactNode;
  footer?: ReactNode;
  back?: ReactNode;
}

type SuitPalette = {
  accent: string;
  suitColor: string;
};

const DEFAULT_SUIT_PALETTE: SuitPalette = {
  accent: 'oklch(0.76 0.18 85)',
  suitColor: 'oklch(0.28 0.02 260)',
};

const SUIT_PALETTE: Record<CardSuit, SuitPalette> = {
  clubs: {
    suitColor: 'oklch(0.32 0.12 160)',
    accent: 'oklch(0.72 0.19 155)',
  },
  diamonds: {
    suitColor: 'oklch(0.58 0.22 22)',
    accent: 'oklch(0.75 0.18 35)',
  },
  hearts: {
    suitColor: 'oklch(0.58 0.22 22)',
    accent: 'oklch(0.75 0.18 35)',
  },
  joker: {
    suitColor: 'oklch(0.52 0.19 310)',
    accent: 'oklch(0.78 0.19 90)',
  },
  spades: {
    suitColor: 'oklch(0.24 0.03 260)',
    accent: 'oklch(0.72 0.16 250)',
  },
};

const TONE_SURFACES: Record<
  PlayingCardTone,
  { surface: string; border: string; text: string }
> = {
  classic: {
    surface:
      'linear-gradient(180deg, rgba(255, 255, 255, 0.94), rgba(244, 246, 253, 0.96))',
    border: 'color-mix(in srgb, white 85%, oklch(0.82 0.02 250) 15%)',
    text: '#10141f',
  },
  emerald: {
    surface:
      'linear-gradient(180deg, rgba(231, 247, 238, 0.98), rgba(213, 241, 226, 0.98))',
    border: 'color-mix(in srgb, white 85%, oklch(0.82 0.02 250) 15%)',
    text: '#10141f',
  },
  midnight: {
    surface:
      'linear-gradient(180deg, rgba(18, 24, 42, 0.96), rgba(7, 12, 22, 0.98))',
    border: 'color-mix(in srgb, white 16%, transparent)',
    text: 'rgba(244, 247, 255, 0.96)',
  },
  rose: {
    surface:
      'linear-gradient(180deg, rgba(253, 241, 244, 0.98), rgba(249, 228, 232, 0.98))',
    border: 'color-mix(in srgb, white 85%, oklch(0.82 0.02 250) 15%)',
    text: '#10141f',
  },
};

function getFrameBackground(tone: PlayingCardTone) {
  if (tone === 'midnight') {
    return [
      'linear-gradient(180deg, rgba(255, 255, 255, 0.08), transparent 20%)',
      'radial-gradient(circle at top, color-mix(in srgb, var(--mb-card-accent) 16%, transparent), transparent 44%)',
    ].join(', ');
  }

  return [
    'linear-gradient(180deg, rgba(255, 255, 255, 0.4), transparent 22%)',
    'radial-gradient(circle at top, color-mix(in srgb, var(--mb-card-accent) 14%, transparent), transparent 42%)',
  ].join(', ');
}

function getArtworkBackground(tone: PlayingCardTone) {
  if (tone === 'midnight') {
    return [
      'radial-gradient(circle at top, color-mix(in srgb, var(--mb-card-accent) 28%, transparent), transparent 44%)',
      'linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02))',
    ].join(', ');
  }

  return [
    'radial-gradient(circle at top, color-mix(in srgb, var(--mb-card-accent) 24%, transparent), transparent 44%)',
    'linear-gradient(180deg, color-mix(in srgb, white 92%, transparent), color-mix(in srgb, white 68%, transparent))',
  ].join(', ');
}

function getBackBackground(tone: PlayingCardTone) {
  if (tone === 'midnight') {
    return [
      'radial-gradient(circle at center, color-mix(in srgb, var(--mb-card-accent) 20%, transparent), transparent 46%)',
      'repeating-linear-gradient(45deg, transparent 0 0.6rem, color-mix(in srgb, var(--mb-card-accent) 8%, transparent) 0.6rem 1.2rem)',
      'linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.02))',
    ].join(', ');
  }

  return [
    'radial-gradient(circle at center, color-mix(in srgb, var(--mb-card-accent) 24%, transparent), transparent 46%)',
    'repeating-linear-gradient(45deg, transparent 0 0.6rem, color-mix(in srgb, var(--mb-card-accent) 10%, transparent) 0.6rem 1.2rem)',
    'linear-gradient(180deg, color-mix(in srgb, white 96%, transparent), color-mix(in srgb, white 80%, transparent))',
  ].join(', ');
}

function getFoilOverlay() {
  return [
    'linear-gradient(120deg, transparent 18%, rgba(255, 255, 255, 0.22) 36%, rgba(138, 187, 255, 0.18) 44%, rgba(255, 182, 193, 0.14) 54%, transparent 72%)',
    'linear-gradient(180deg, rgba(255, 255, 255, 0.18), transparent 28%, transparent 74%, rgba(255, 255, 255, 0.1))',
  ].join(', ');
}

function getGlassOverlay() {
  return [
    'linear-gradient(180deg, rgba(255, 255, 255, 0.28), transparent 24%, transparent 80%, rgba(255, 255, 255, 0.14))',
    'radial-gradient(circle at top, rgba(255, 255, 255, 0.28), transparent 35%)',
  ].join(', ');
}

function updateTilt(
  element: HTMLDivElement,
  event: PointerEvent<HTMLDivElement>,
) {
  const rect = element.getBoundingClientRect();

  if (!rect.width || !rect.height) return;

  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const rotateY = (x / rect.width - 0.5) * 18;
  const rotateX = (0.5 - y / rect.height) * 18;

  element.style.setProperty('--mb-card-rotate-x', `${rotateX.toFixed(2)}deg`);
  element.style.setProperty('--mb-card-rotate-y', `${rotateY.toFixed(2)}deg`);
}

function resetTilt(element: HTMLDivElement) {
  element.style.setProperty('--mb-card-rotate-x', '0deg');
  element.style.setProperty('--mb-card-rotate-y', '0deg');
}

export function PlayingCard({
  rank,
  suit,
  face = 'front',
  size = 'md',
  tone = 'classic',
  effect = 'standard',
  interactive = true,
  selected = false,
  headline,
  subtitle,
  description,
  artwork,
  badge,
  footer,
  back,
  className,
  children,
  style,
  role,
  onPointerLeave,
  onPointerMove,
  ...divProps
}: PlayingCardProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const symbol = suit ? getSuitSymbol(suit) : '✦';
  const label =
    divProps['aria-label'] ??
    (face === 'back' ? 'Card back' : formatCardLabel(rank, suit));
  const suitPalette =
    (suit ? SUIT_PALETTE[suit] : undefined) ?? DEFAULT_SUIT_PALETTE;
  const tonePalette = TONE_SURFACES[tone];

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    onPointerMove?.(event);

    if (!interactive || !rootRef.current) return;

    updateTilt(rootRef.current, event);
  };

  const handlePointerLeave = (event: PointerEvent<HTMLDivElement>) => {
    onPointerLeave?.(event);

    if (!rootRef.current) return;

    resetTilt(rootRef.current);
  };

  return (
    <div
      {...divProps}
      ref={rootRef}
      aria-label={label}
      className={cx(
        'mb-playing-card relative isolate aspect-[5/7] w-[var(--mb-card-width)] max-w-full min-w-0 select-none overflow-hidden whitespace-normal break-words rounded-[1.65rem] border [transform-style:preserve-3d] transition-[transform,box-shadow,border-color] duration-200 ease-out [transform:perspective(1100px)_translateY(var(--mb-card-lift))_rotateX(var(--mb-card-rotate-x))_rotateY(var(--mb-card-rotate-y))_scale(var(--mb-card-scale))]',
        interactive ? 'cursor-pointer hover:[--mb-card-scale:1.015]' : null,
        selected
          ? 'shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_24px_58px_rgba(16,20,31,0.24)]'
          : 'shadow-[inset_0_1px_0_rgba(255,255,255,0.82),0_18px_42px_rgba(16,20,31,0.18)]',
        effect === 'glass' ? 'backdrop-blur-[6px]' : null,
        className,
      )}
      data-effect={effect}
      data-face={face}
      data-interactive={interactive}
      data-selected={selected}
      data-size={size}
      data-suit={suit}
      data-tone={tone}
      onPointerLeave={handlePointerLeave}
      onPointerMove={handlePointerMove}
      role={role ?? 'img'}
      style={
        {
          ...style,
          background: tonePalette.surface,
          borderColor: tonePalette.border,
          color: tonePalette.text,
          '--mb-card-accent': suitPalette.accent,
          '--mb-card-lift': selected ? '-0.45rem' : '0px',
          '--mb-card-rotate-x': '0deg',
          '--mb-card-rotate-y': '0deg',
          '--mb-card-scale': selected ? 1.01 : 1,
          '--mb-card-suit-color': suitPalette.suitColor,
          '--mb-card-width':
            size === 'sm' ? '12rem' : size === 'lg' ? '20rem' : '17rem',
        } as PlayingCardStyle
      }
    >
      {effect !== 'standard' ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-20 opacity-[0.85] mix-blend-screen"
          style={{ background: getFoilOverlay() }}
        />
      ) : null}

      {effect === 'glass' ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-20"
          style={{ background: getGlassOverlay() }}
        />
      ) : null}

      <div
        className="mb-playing-card__frame absolute inset-[0.72rem] z-10 rounded-[1.2rem] border p-[0.85rem]"
        style={{
          background: getFrameBackground(tone),
          borderColor:
            'color-mix(in srgb, var(--mb-card-accent) 25%, transparent)',
        }}
      >
        <div
          className="mb-playing-card__corner absolute left-[0.85rem] top-[0.85rem] inline-flex w-fit flex-col items-center gap-[0.05rem] font-extrabold leading-none tracking-[0.02em] [transform:translateZ(32px)]"
          aria-hidden="true"
          style={{ color: 'var(--mb-card-suit-color)' }}
        >
          <span className="mb-playing-card__rank text-[1.15rem]">{rank}</span>
          <span className="mb-playing-card__symbol text-[1rem]">{symbol}</span>
        </div>

        {badge ? (
          <div
            className="mb-playing-card__badge absolute right-4 top-[1.05rem] max-w-[calc(100%-5rem)] rounded-full px-[0.7rem] py-[0.36rem] text-[0.72rem] font-bold uppercase tracking-[0.08em] [transform:translateZ(28px)]"
            style={{
              background:
                'color-mix(in srgb, var(--mb-card-accent) 18%, white)',
              color: 'color-mix(in srgb, var(--mb-card-suit-color) 70%, black)',
            }}
          >
            {badge}
          </div>
        ) : null}

        <div className="mb-playing-card__body grid h-full min-h-0 w-full min-w-0 place-items-center gap-[0.9rem]">
          {face === 'back' ? (
            <div
              className="mb-playing-card__back relative grid min-h-40 w-full place-items-center rounded-[1.1rem] border p-4 [transform:translateZ(48px)]"
              aria-hidden="true"
              style={{
                background: getBackBackground(tone),
                borderColor:
                  'color-mix(in srgb, var(--mb-card-accent) 26%, transparent)',
              }}
            >
              <div
                className="mb-playing-card__back-inner grid h-full w-full place-items-center gap-[0.6rem] rounded-[0.9rem] border"
                style={{
                  borderColor:
                    'color-mix(in srgb, var(--mb-card-accent) 18%, transparent)',
                }}
              >
                {back ?? (
                  <>
                    <span
                      className="mb-playing-card__back-mark inline-flex h-16 w-16 items-center justify-center rounded-full text-[2rem] leading-none"
                      style={{
                        background:
                          'color-mix(in srgb, var(--mb-card-accent) 12%, transparent)',
                        color: 'var(--mb-card-suit-color)',
                      }}
                    >
                      {symbol}
                    </span>
                    <span
                      className="mb-playing-card__back-label text-[0.78rem] font-extrabold uppercase tracking-[0.22em]"
                      style={{
                        color:
                          'color-mix(in srgb, currentColor 64%, transparent)',
                      }}
                    >
                      Platform deck
                    </span>
                  </>
                )}
              </div>
            </div>
          ) : (
            <>
              <div
                className="mb-playing-card__artwork relative grid min-h-40 w-full place-items-center rounded-[1.1rem] border p-4 [transform:translateZ(48px)]"
                aria-hidden="true"
                style={{
                  background: getArtworkBackground(tone),
                  borderColor:
                    'color-mix(in srgb, var(--mb-card-accent) 18%, transparent)',
                }}
              >
                {artwork ?? (
                  <div className="mb-playing-card__default-art grid place-items-center gap-[0.45rem] text-center">
                    <span
                      className="mb-playing-card__default-symbol text-[clamp(2.5rem,6vw,4rem)] leading-none"
                      style={{
                        color: 'var(--mb-card-suit-color)',
                        textShadow:
                          '0 10px 30px color-mix(in srgb, var(--mb-card-accent) 24%, transparent)',
                      }}
                    >
                      {symbol}
                    </span>
                    <span
                      className="mb-playing-card__default-caption text-[0.82rem] font-bold uppercase tracking-[0.16em]"
                      style={{
                        color:
                          'color-mix(in srgb, currentColor 56%, transparent)',
                      }}
                    >
                      {suit ? formatCardLabel(rank, suit) : rank}
                    </span>
                  </div>
                )}
              </div>

              {headline || subtitle || description || children ? (
                <div className="mb-playing-card__content grid w-full min-w-0 gap-[0.45rem] text-center [transform:translateZ(42px)]">
                  {headline ? (
                    <p className="mb-playing-card__headline text-[1.18rem] font-extrabold leading-[1.2]">
                      {headline}
                    </p>
                  ) : null}
                  {subtitle ? (
                    <p
                      className="mb-playing-card__subtitle text-[0.84rem] font-bold uppercase tracking-[0.14em]"
                      style={{
                        color:
                          'color-mix(in srgb, currentColor 58%, transparent)',
                      }}
                    >
                      {subtitle}
                    </p>
                  ) : null}
                  {description ? (
                    <p
                      className="mb-playing-card__description text-[0.92rem] leading-[1.45]"
                      style={{
                        color:
                          'color-mix(in srgb, currentColor 72%, transparent)',
                      }}
                    >
                      {description}
                    </p>
                  ) : null}
                  {children ? (
                    <div className="mb-playing-card__children [transform:translateZ(36px)]">
                      {children}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </>
          )}

          {footer && face === 'front' ? (
            <div className="mb-playing-card__footer w-full [transform:translateZ(36px)]">
              {footer}
            </div>
          ) : null}
        </div>

        <div
          className="mb-playing-card__corner mb-playing-card__corner--bottom absolute bottom-[0.85rem] right-[0.85rem] inline-flex w-fit flex-col items-center gap-[0.05rem] font-extrabold leading-none tracking-[0.02em] [transform:rotate(180deg)_translateZ(32px)]"
          aria-hidden="true"
          style={{ color: 'var(--mb-card-suit-color)' }}
        >
          <span className="mb-playing-card__rank text-[1.15rem]">{rank}</span>
          <span className="mb-playing-card__symbol text-[1rem]">{symbol}</span>
        </div>
      </div>
    </div>
  );
}
