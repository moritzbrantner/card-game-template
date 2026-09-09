'use client';

import {
  CardActionProvider,
  CardControls,
  CardDropZone,
  CardTable,
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
      return 'border-emerald-300/60 bg-emerald-50 text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-100';
    case 'warning':
      return 'border-amber-300/70 bg-amber-50 text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-100';
    case 'danger':
      return 'border-red-300/70 bg-red-50 text-red-800 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-100';
    case 'neutral':
    default:
      return 'border-zinc-300 bg-zinc-50 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200';
  }
}

function participantBadges(participant: GameSessionParticipant) {
  return [
    participant.isViewer ? 'You' : null,
    participant.isActor ? 'Actor' : null,
    participant.isActive ? 'Active' : null,
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
  if (parsed.kind === 'discard-card') {
    return 'discard-pile';
  }

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
  const hasDiscardDropTarget = actionRegistry.some(
    (action) =>
      action.cardId &&
      action.target === 'discard-pile' &&
      !action.disabled,
  );

  return (
    <CardActionProvider actions={actionRegistry}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            {eyebrow ? (
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
                {eyebrow}
              </p>
            ) : null}
            <h2 className="mt-2 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600 dark:text-zinc-300">
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
                    'rounded-full border px-3 py-1 text-sm font-medium',
                    badgeClassName(badge.tone),
                  )}
                >
                  {badge.label}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-100">
            {error}
          </div>
        ) : null}
        {announcement ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-100">
            {announcement}
          </div>
        ) : null}

        <CardTable
          eyebrow="Game session"
          subtitle={result ?? subtitle}
          title="Play surface"
          tone="midnight"
        >
          <div className="space-y-5">
            {statusItems.length > 0 || participants.length > 0 ? (
              <div className="grid gap-3 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                {statusItems.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {statusItems.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-lg border border-white/12 bg-white/8 p-4 backdrop-blur-sm"
                      >
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/65">
                          {item.label}
                        </p>
                        <div className="mt-3 text-sm font-medium text-white">
                          {item.value}
                        </div>
                        {item.detail ? (
                          <div className="mt-2 text-sm leading-6 text-white/72">
                            {item.detail}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : null}

                {participants.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {participants.map((participant) => (
                      <div
                        key={participant.id}
                        className="rounded-lg border border-white/12 bg-white/8 p-4 backdrop-blur-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-medium text-white">
                              {participant.displayName}
                            </p>
                            {participant.detail ? (
                              <div className="mt-1 text-sm leading-6 text-white/72">
                                {participant.detail}
                              </div>
                            ) : null}
                          </div>
                          <div className="flex shrink-0 flex-wrap justify-end gap-1">
                            {participantBadges(participant).map((label) => (
                              <span
                                key={label}
                                className="rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-xs font-medium text-white/80"
                              >
                                {label}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="min-w-0">{table}</div>

            {hasDiscardDropTarget ? (
              <CardDropZone
                activeClassName="border-emerald-300/70 bg-emerald-400/14 shadow-[0_0_0_2px_rgba(110,231,183,0.16)]"
                aria-label={`${actionsLabel} discard pile drop target`}
                className="rounded-2xl border border-dashed border-white/18 bg-white/6 px-4 py-3 transition-[border-color,background-color,box-shadow]"
                target="discard-pile"
              >
                <p className="text-sm font-semibold text-white">Discard pile</p>
                <p className="mt-1 text-sm text-white/68">
                  Drag a legal hand card here to discard it.
                </p>
              </CardDropZone>
            ) : null}

            {aside ? <div className="min-w-0">{aside}</div> : null}

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
                className="border-white/12 bg-black/20 text-white dark:border-white/12 dark:bg-black/20"
                label={actionsLabel}
              />
            ) : (
              <p className="text-sm text-white/72">{emptyActionsLabel}</p>
            )}
          </div>
        </CardTable>

        {footer ? <div>{footer}</div> : null}
      </div>
    </CardActionProvider>
  );
}
