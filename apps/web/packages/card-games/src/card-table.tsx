'use client';

import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';

import { cx } from './lib/cx';

export type CardTableTone = 'emerald' | 'midnight' | 'crimson';

export interface CardTableProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'title'
> {
  eyebrow?: ReactNode;
  title?: ReactNode;
  subtitle?: ReactNode;
  tone?: CardTableTone;
}

type CardTableStyle = CSSProperties &
  Record<string, string | number | undefined>;

const TABLE_TONES: Record<CardTableTone, { accent: string; base: string }> = {
  crimson: {
    base: 'oklch(0.33 0.13 20)',
    accent: 'oklch(0.76 0.18 25)',
  },
  emerald: {
    base: 'oklch(0.35 0.11 165)',
    accent: 'oklch(0.78 0.19 150)',
  },
  midnight: {
    base: 'oklch(0.26 0.04 255)',
    accent: 'oklch(0.74 0.19 260)',
  },
};

export function CardTable({
  eyebrow,
  title,
  subtitle,
  tone = 'emerald',
  className,
  children,
  style,
  ...divProps
}: CardTableProps) {
  const palette = TABLE_TONES[tone];

  return (
    <div
      {...divProps}
      className={cx(
        'mb-card-table relative isolate overflow-hidden rounded-[1.5rem] border border-white/16 p-4 text-white shadow-[inset_0_1px_0_color-mix(in_srgb,white_18%,transparent),0_26px_80px_color-mix(in_srgb,black_48%,transparent)] sm:rounded-[2rem] sm:p-[clamp(1.25rem,2vw,2rem)]',
        className,
      )}
      data-tone={tone}
      style={
        {
          ...style,
          background: [
            'radial-gradient(circle at top left, color-mix(in srgb, var(--mb-table-accent) 35%, transparent) 0%, transparent 34%)',
            'radial-gradient(circle at bottom right, color-mix(in srgb, black 45%, transparent) 0%, transparent 42%)',
            'linear-gradient(145deg, var(--mb-table-base), color-mix(in srgb, var(--mb-table-base) 68%, black))',
          ].join(', '),
          '--mb-table-accent': palette.accent,
          '--mb-table-base': palette.base,
        } as CardTableStyle
      }
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full opacity-60 blur-xl"
        style={{
          background:
            'color-mix(in srgb, var(--mb-table-accent) 42%, transparent)',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-16 -left-12 h-44 w-44 rounded-full bg-white/15 opacity-60 blur-xl"
      />

      {eyebrow || title || subtitle ? (
        <header className="mb-card-table__header relative z-10 mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            {eyebrow ? (
              <p className="mb-card-table__eyebrow mb-1 text-[0.72rem] font-bold uppercase tracking-[0.24em] text-white/72">
                {eyebrow}
              </p>
            ) : null}
            {title ? (
              <h2 className="mb-card-table__title text-[clamp(1.6rem,3vw,2.4rem)] leading-[1.05]">
                {title}
              </h2>
            ) : null}
            {subtitle ? (
              <p className="mb-card-table__subtitle mt-2 max-w-[44rem] leading-[1.55] text-white/78">
                {subtitle}
              </p>
            ) : null}
          </div>
        </header>
      ) : null}

      <div className="mb-card-table__content relative z-10">{children}</div>
    </div>
  );
}
