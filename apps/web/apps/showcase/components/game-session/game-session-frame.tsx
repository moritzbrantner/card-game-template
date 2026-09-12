'use client';

import {
  CardActionProvider,
  CardControls,
  type CardActionDescriptor,
  type CardActionTarget,
  type CardControlActionKind,
} from '@moritzbrantner/card-games';
import { cn } from '@moritzbrantner/ui';

import type {
  GameSessionAction,
  GameSessionBadge,
  GameSessionFrameProps,
  GameSessionParticipant,
} from './types';

function badgeClassName(tone: GameSessionBadge['tone']) {
  switch (tone) {
    case 'success':
      return 'border-emerald-300/70 bg-emerald-50 text-emerald-800 dark:border-emerald-300/30 dark:bg-emerald-300/10 dark:text-emerald-100';
    case 'warning':
      return 'border-amber-300/70 bg-amber-50 text-amber-800 dark:border-amber-300/30 dark:bg-amber-300/10 dark:text-amber-100';
    case 'danger':
      return 'border-red-300/70 bg-red-50 text-red-800 dark:border-red-300/30 dark:bg-red-300/10 dark:text-red-100';
    case 'neutral':
    default:
      return 'border-zinc-300 bg-zinc-50 text-zinc-700 dark:border-white/15 dark:bg-white/8 dark:text-white/78';
  }
}

function participantBadges(participant: GameSessionParticipant) {
  return [
    participant.isViewer ? 'You' : null,
    participant.isActor ? 'Actor' : null,
    participant.isActive ? 'Turn' : null,
  ].filter((label): label is string => label !== null);
}

type ParsedActionId = {
  kind: string;
  payload: Record<string, unknown> | null;
};

function parseActionId(id: string): ParsedActionId {
  const separatorIndex = id.indexOf(':');

  if (separatorIndex < 0) {
    return { kind: id, payload: null };
  }

  const kind = id.slice(0, separatorIndex);
  const serializedPayload = id.slice(separatorIndex + 1);

  try {
    const parsed = JSON.parse(serializedPayload) as unknown;

    return {
      kind,
      payload:
        typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
          ? (parsed as Record<string, unknown>)
          : null,
    };
  } catch {
    return { kind, payload: null };
  }
}

function controlKind(kind: string): CardControlActionKind {
  if (kind === 'draw-card') {
    return 'draw';
  }

  if (kind === 'discard-card') {
    return 'discard';
  }

  if (kind === 'hit-phase' || kind === 'lay-phase' || kind === 'play-card') {
    return 'move';
  }

  return 'other';
}

function actionTarget(parsed: ParsedActionId): CardActionTarget | undefined {
  if (parsed.kind !== 'draw-card') {
    return undefined;
  }

  return parsed.payload?.source === 'discard' ? 'discard-pile' : 'draw-pile';
}

function toCardActionDescriptor(
  action: GameSessionAction,
  pending: boolean,
): CardActionDescriptor {
  const parsed = parseActionId(action.id);
  const cardId =
    typeof parsed.payload?.cardId === 'string'
      ? parsed.payload.cardId
      : undefined;
  const target = actionTarget(parsed);

  return {
    ...(cardId ? { cardId } : {}),
    disabled: pending || action.pending || action.disabled,
    id: action.id,
    kind: controlKind(parsed.kind),
    label: action.pending ? `${action.label}...` : action.label,
    onActivate: action.onSelect,
    ...(target ? { target } : {}),
  };
}

function isContextualCardAction(action: GameSessionAction) {
  const parsed = parseActionId(action.id);

  if (parsed.kind === 'discard-card' || parsed.kind === 'hit-phase') {
    return true;
  }

  return (
    parsed.kind === 'play-card' && typeof parsed.payload?.sayUno === 'boolean'
  );
}

function participantInitial(displayName: string) {
  const initial = displayName.trim().charAt(0).toUpperCase();
  return initial || '?';
}

export function GameSessionFrame({
  actions,
  actionsLabel,
  announcement,
  aside,
  badges = [],
  emptyActionsLabel,
  error,
  eyebrow,
  footer,
  participants = [],
  pending = false,
  result,
  statusItems = [],
  subtitle,
  table,
  title,
}: GameSessionFrameProps) {
  const actionRegistry = actions.map((action) =>
    toCardActionDescriptor(action, pending),
  );
  const surfaceActions = actions.filter(
    (action) => !isContextualCardAction(action),
  );

  return (
    <CardActionProvider actions={actionRegistry}>
      <section className="space-y-5">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-3xl">
            {eyebrow ? (
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
                {eyebrow}
              </p>
            ) : null}
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.025em] text-zinc-950 dark:text-zinc-50 sm:text-3xl">
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                {subtitle}
              </p>
            ) : null}
          </div>
          {badges.length > 0 ? (
            <div className="flex flex-wrap justify-end gap-2">
              {badges.map((badge) => (
                <span
                  key={badge.id}
                  className={cn(
                    'rounded-full border px-3 py-1 text-xs font-medium backdrop-blur-sm',
                    badgeClassName(badge.tone),
                  )}
                >
                  {badge.label}
                </span>
              ))}
            </div>
          ) : null}
        </header>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-100">
            {error}
          </div>
        ) : null}
        {announcement ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-100">
            {announcement}
          </div>
        ) : null}

        <div className="relative isolate overflow-hidden rounded-[2rem] border border-zinc-800/80 bg-zinc-950 text-white shadow-[0_32px_80px_-48px_rgba(0,0,0,0.9)] sm:rounded-[2.5rem]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_42%,rgba(48,99,76,0.48),rgba(24,52,42,0.34)_32%,rgba(9,9,11,0.98)_72%)]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-3 -z-10 rounded-[1.4rem] border border-white/7 sm:inset-4 sm:rounded-[2rem]"
          />

          <div className="relative p-4 sm:p-6 lg:p-8">
            {participants.length > 0 ? (
              <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
                {participants.map((participant) => (
                  <div
                    key={participant.id}
                    className={cn(
                      'flex min-w-0 items-center gap-3 rounded-full px-2 py-1.5 transition',
                      participant.isActive
                        ? 'bg-white/10 ring-1 ring-white/18'
                        : 'text-white/72',
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        'grid size-8 shrink-0 place-items-center rounded-full border text-xs font-semibold',
                        participant.isActive
                          ? 'border-white/30 bg-white text-zinc-950'
                          : 'border-white/14 bg-black/20 text-white/72',
                      )}
                    >
                      {participantInitial(participant.displayName)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-white">
                        {participant.displayName}
                      </span>
                      {participant.detail ? (
                        <span className="block max-w-52 truncate text-xs text-white/55">
                          {participant.detail}
                        </span>
                      ) : null}
                    </span>
                    {participantBadges(participant).length > 0 ? (
                      <span className="flex shrink-0 gap-1">
                        {participantBadges(participant).map((label) => (
                          <span
                            key={label}
                            className="rounded-full border border-white/12 bg-black/20 px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-wide text-white/70"
                          >
                            {label}
                          </span>
                        ))}
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}

            {statusItems.length > 0 || result ? (
              <div className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-y border-white/10 py-3 text-sm">
                {statusItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex min-w-0 items-baseline gap-2"
                  >
                    <span className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-white/45">
                      {item.label}
                    </span>
                    <span className="font-medium text-white/90">
                      {item.value}
                    </span>
                    {item.detail ? (
                      <span className="hidden text-xs text-white/45 md:inline">
                        {item.detail}
                      </span>
                    ) : null}
                  </div>
                ))}
                {result ? (
                  <div className="font-medium text-emerald-100">{result}</div>
                ) : null}
              </div>
            ) : null}

            <div className="mx-auto min-h-64 max-w-6xl py-7 sm:py-9">
              {table}
            </div>

            {aside ? (
              <div className="mx-auto max-w-6xl border-t border-white/10 pt-5">
                {aside}
              </div>
            ) : null}

            <div className="mx-auto mt-6 max-w-6xl border-t border-white/10 pt-5">
              {surfaceActions.length > 0 ? (
                <CardControls
                  actions={surfaceActions.map((action) => {
                    const descriptor = toCardActionDescriptor(action, pending);

                    return {
                      disabled: descriptor.disabled,
                      id: descriptor.id,
                      kind: descriptor.kind,
                      label: descriptor.label,
                      onActivate: descriptor.onActivate,
                    };
                  })}
                  className="border-white/10 bg-black/16 text-white dark:border-white/10 dark:bg-black/16"
                  label={actionsLabel}
                />
              ) : (
                <p className="text-center text-sm text-white/55">
                  {emptyActionsLabel}
                </p>
              )}
            </div>
          </div>
        </div>

        {footer ? <div>{footer}</div> : null}
      </section>
    </CardActionProvider>
  );
}
