'use client';

import {
  startTransition,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from 'react';

import { PlayerHand } from '@moritzbrantner/card-games';
import { buttonVariants } from '@moritzbrantner/ui';
import { tcgExamplePresets, type TcgExamplePresetId } from '@repo/game-tcg';

import {
  TcgCardVisual,
  TcgHiddenHand,
  TcgUnitVisual,
} from '@/components/tcg-card-visuals';
import type {
  ListTcgMatchesResult,
  PersistedTcgMatchSnapshotDto,
} from '@/src/domain/game-matches/contracts';
import { readProblemDetail } from '@/src/http/problem-client';
import { GameSessionFrame } from './game-session';

type TcgPageLabels = {
  activeMatchDescription: string;
  activeMatchTitle: string;
  activeMatchesTitle: string;
  analysisTitle: string;
  battlefieldLabel: string;
  createAction: string;
  createHint: string;
  createTitle: string;
  createdMatchStatus: string;
  deckLabel: string;
  description: string;
  emptyBattlefield: string;
  emptyRecentMatches: string;
  handLabel: string;
  lastWinnerLabel: string;
  legalActionsTitle: string;
  lifeLabel: string;
  manaLabel: string;
  nameLabel: string;
  noActiveMatch: string;
  playersTitle: string;
  presetLabel: string;
  recentMatchesTitle: string;
  reloadAction: string;
  resumeAction: string;
  statusLabel: string;
  subtitle: string;
  title: string;
  waitingForPlayers: string;
};

async function readJson<T>(response: Response) {
  return response.json() as Promise<T>;
}

async function loadMatchList() {
  const response = await fetch('/api/games/tcg/matches', {
    method: 'GET',
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Unable to load Arcane Duel matches.');
  }

  return readJson<ListTcgMatchesResult>(response);
}

async function loadMatchSnapshot(matchId: string) {
  const response = await fetch(`/api/games/tcg/matches/${matchId}`, {
    method: 'GET',
    cache: 'no-store',
  });

  if (!response.ok) {
    throw await readProblemDetail(
      response,
      'Unable to load Arcane Duel match.',
    );
  }

  return readJson<PersistedTcgMatchSnapshotDto>(response);
}

function winnerLabel(match: ListTcgMatchesResult['recent'][number]) {
  const winnerId = match.result?.winnerIds[0];
  return (
    match.participants.find((participant) => participant.playerId === winnerId)
      ?.displayName ?? 'No winner yet'
  );
}

export function TcgPageClient({ labels }: { labels: TcgPageLabels }) {
  const [matches, setMatches] = useState<ListTcgMatchesResult>({
    active: [],
    recent: [],
  });
  const [currentMatch, setCurrentMatch] =
    useState<PersistedTcgMatchSnapshotDto | null>(null);
  const [draftName, setDraftName] = useState('');
  const [presetId, setPresetId] = useState<TcgExamplePresetId>('bot-rival');
  const [pending, setPending] = useState(false);
  const [state, setState] = useState<{ announcement?: string; error?: string }>(
    {},
  );
  const currentMatchRef = useRef<PersistedTcgMatchSnapshotDto | null>(null);

  useEffect(() => {
    currentMatchRef.current = currentMatch;
  }, [currentMatch]);

  async function refresh(matchId?: string) {
    const nextMatches = await loadMatchList();
    setMatches(nextMatches);

    const targetMatchId =
      matchId ??
      currentMatchRef.current?.matchId ??
      nextMatches.active[0]?.matchId;

    if (!targetMatchId) {
      setCurrentMatch(null);
      return;
    }

    const snapshot = await loadMatchSnapshot(targetMatchId);
    setCurrentMatch(snapshot);
  }

  const refreshFromEffects = useEffectEvent(async (matchId?: string) => {
    await refresh(matchId);
  });

  useEffect(() => {
    startTransition(() => {
      void refreshFromEffects().catch((error) => {
        setState({
          error:
            error instanceof Error
              ? error.message
              : 'Unable to load Arcane Duel matches.',
        });
      });
    });
  }, []);

  async function handleCreateMatch() {
    setPending(true);
    setState({});

    const response = await fetch('/api/games/tcg/matches', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        presetId,
        displayName: draftName.trim() || undefined,
      }),
    });

    if (!response.ok) {
      const problem = await readProblemDetail(
        response,
        'Unable to create Arcane Duel match.',
      );
      setState({ error: problem.message });
      setPending(false);
      return;
    }

    const snapshot = await readJson<PersistedTcgMatchSnapshotDto>(response);
    setCurrentMatch(snapshot);
    setState({ announcement: labels.createdMatchStatus });
    await refresh(snapshot.matchId);
    setPending(false);
  }

  async function handleResume(matchId: string) {
    setPending(true);
    setState({});

    try {
      const snapshot = await loadMatchSnapshot(matchId);
      setCurrentMatch(snapshot);
    } catch (error) {
      setState({
        error:
          error instanceof Error
            ? error.message
            : 'Unable to resume Arcane Duel match.',
      });
    } finally {
      setPending(false);
    }
  }

  async function handleSubmitMove(
    move: PersistedTcgMatchSnapshotDto['view']['legalActions'][number]['move'],
  ) {
    if (!currentMatch) {
      return;
    }

    setPending(true);
    setState({});

    const response = await fetch(
      `/api/games/tcg/matches/${currentMatch.matchId}/moves`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({ move }),
      },
    );

    if (!response.ok) {
      const problem = await readProblemDetail(
        response,
        'Unable to submit Arcane Duel move.',
      );
      setState({ error: problem.message });
      setPending(false);
      return;
    }

    const snapshot = await readJson<PersistedTcgMatchSnapshotDto>(response);
    setCurrentMatch(snapshot);
    if (snapshot.status !== 'active') {
      await refresh(snapshot.matchId);
    }
    setPending(false);
  }

  const viewer = currentMatch?.view.players.find((player) => player.isViewer);

  return (
    <section className="space-y-6">
      <div className="rounded-[2rem] border border-zinc-200 bg-zinc-50 p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-zinc-500 dark:text-zinc-400">
            Arcane Duel
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            {labels.title}
          </h1>
          <p className="max-w-3xl text-base leading-7 text-zinc-700 dark:text-zinc-300">
            {labels.description}
          </p>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            className={buttonVariants({ variant: 'outline' })}
            disabled={pending}
            onClick={() => {
              void refresh().catch((error) => {
                setState({
                  error:
                    error instanceof Error
                      ? error.message
                      : 'Unable to reload Arcane Duel matches.',
                });
              });
            }}
          >
            {labels.reloadAction}
          </button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <article className="rounded-[1.75rem] border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-zinc-950 dark:text-zinc-50">
                {labels.createTitle}
              </h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-300">
                {labels.createHint}
              </p>
            </div>

            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">
              {labels.nameLabel}
              <input
                className="mt-2 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-base text-zinc-950 outline-none transition focus:border-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
                value={draftName}
                onChange={(event) => {
                  setDraftName(event.target.value);
                }}
              />
            </label>

            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">
              {labels.presetLabel}
              <select
                className="mt-2 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-base text-zinc-950 outline-none transition focus:border-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
                value={presetId}
                onChange={(event) => {
                  setPresetId(event.target.value as TcgExamplePresetId);
                }}
              >
                {tcgExamplePresets.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              className={buttonVariants({ variant: 'default' })}
              disabled={pending}
              onClick={() => {
                void handleCreateMatch();
              }}
            >
              {labels.createAction}
            </button>
          </div>

          <div className="mt-8 space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
              {labels.activeMatchesTitle}
            </h3>
            {matches.active.length > 0 ? (
              matches.active.map((match) => (
                <div
                  key={match.matchId}
                  className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-zinc-950 dark:text-zinc-50">
                        {match.participants
                          .map((participant) => participant.displayName)
                          .join(', ')}
                      </p>
                      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                        {new Date(match.updatedAt).toLocaleString()}
                      </p>
                    </div>
                    <button
                      type="button"
                      className={buttonVariants({ variant: 'outline' })}
                      disabled={pending}
                      onClick={() => {
                        void handleResume(match.matchId);
                      }}
                    >
                      {labels.resumeAction}
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-zinc-600 dark:text-zinc-300">
                {labels.noActiveMatch}
              </p>
            )}
          </div>

          <div className="mt-8 space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
              {labels.recentMatchesTitle}
            </h3>
            {matches.recent.length > 0 ? (
              matches.recent.slice(0, 3).map((match) => (
                <div
                  key={match.matchId}
                  className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <p className="font-medium text-zinc-950 dark:text-zinc-50">
                    {match.participants
                      .map((participant) => participant.displayName)
                      .join(', ')}
                  </p>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                    {labels.lastWinnerLabel}: {winnerLabel(match)}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-zinc-600 dark:text-zinc-300">
                {labels.emptyRecentMatches}
              </p>
            )}
          </div>

          {state.error ? (
            <p className="mt-6 text-sm text-red-600 dark:text-red-400">
              {state.error}
            </p>
          ) : null}
          {state.announcement ? (
            <p className="mt-3 text-sm text-emerald-600 dark:text-emerald-400">
              {state.announcement}
            </p>
          ) : null}
        </article>

        <article className="rounded-[1.75rem] border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          {currentMatch ? (
            <GameSessionFrame
              actions={currentMatch.view.legalActions.map((action) => ({
                disabled: currentMatch.status !== 'active',
                id: action.id,
                label: action.label,
                onSelect: () => {
                  void handleSubmitMove(action.move);
                },
              }))}
              actionsLabel={labels.legalActionsTitle}
              badges={[
                {
                  id: 'status',
                  label: currentMatch.status,
                  tone:
                    currentMatch.status === 'active' ? 'success' : 'neutral',
                },
              ]}
              emptyActionsLabel={labels.waitingForPlayers}
              error={state.error}
              eyebrow={labels.title}
              participants={currentMatch.view.players.map((player) => ({
                detail: `${player.controller} - ${player.life} life - ${player.mana}/${player.maxMana} mana`,
                displayName: player.displayName,
                id: player.playerId,
                isActive: player.isActive,
                isViewer: player.isViewer,
              }))}
              pending={pending}
              result={currentMatch.view.matchResultBanner}
              statusItems={[
                {
                  id: 'status',
                  label: labels.statusLabel,
                  value: currentMatch.view.status,
                },
                ...(viewer
                  ? [
                      {
                        detail: `${labels.manaLabel}: ${viewer.mana}/${viewer.maxMana}`,
                        id: 'viewer',
                        label: labels.playersTitle,
                        value: `${viewer.displayName}: ${viewer.life} ${labels.lifeLabel.toLowerCase()}`,
                      },
                    ]
                  : []),
              ]}
              subtitle={labels.activeMatchDescription}
              table={
                <div className="grid gap-3 lg:grid-cols-2">
                  {currentMatch.view.players.map((player) => (
                    <section
                      key={player.playerId}
                      className="rounded-[1.4rem] border border-white/12 bg-white/8 p-4 backdrop-blur-sm"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <h3 className="truncate font-semibold text-white">
                            {player.displayName}
                          </h3>
                          <p className="mt-1 text-sm text-white/72">
                            {player.controller}
                            {player.isActive ? ' - Active' : ''}
                            {player.isViewer ? ' - You' : ''}
                          </p>
                        </div>
                        <div className="flex flex-wrap justify-end gap-2 text-xs font-semibold uppercase text-white/80">
                          <span className="rounded-full bg-white/10 px-3 py-1">
                            {labels.lifeLabel}: {player.life}
                          </span>
                          <span className="rounded-full bg-white/10 px-3 py-1">
                            {labels.manaLabel}: {player.mana}/{player.maxMana}
                          </span>
                          <span className="rounded-full bg-white/10 px-3 py-1">
                            {labels.deckLabel}: {player.deckCount}
                          </span>
                        </div>
                      </div>

                      <div className="mt-5 space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/65">
                          {labels.battlefieldLabel}
                        </p>
                        {player.battlefield.length > 0 ? (
                          <div className="flex flex-wrap gap-4">
                            {player.battlefield.map((unit) => (
                              <TcgUnitVisual key={unit.id} unit={unit} />
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-white/72">
                            {labels.emptyBattlefield}
                          </p>
                        )}
                      </div>

                      <div className="mt-5 space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/65">
                          {labels.handLabel}
                        </p>
                        {player.visibleHand.length > 0 ? (
                          <PlayerHand aria-label={`${player.displayName} hand`}>
                            {player.visibleHand.map((card) => (
                              <TcgCardVisual key={card.id} card={card} />
                            ))}
                          </PlayerHand>
                        ) : (
                          <TcgHiddenHand
                            cardCount={player.handCount}
                            label={`${player.displayName} hand`}
                          />
                        )}
                      </div>
                    </section>
                  ))}
                </div>
              }
              title={labels.activeMatchTitle}
              footer={
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                      {labels.analysisTitle}
                    </h3>
                    <p className="mt-3 text-sm text-zinc-700 dark:text-zinc-200">
                      {currentMatch.analysis?.generic.acceptedMoveCount ?? 0}{' '}
                      accepted moves
                    </p>
                    <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-200">
                      {currentMatch.analysis?.generic.turnsCompleted ?? 0} turns
                      completed
                    </p>
                  </div>

                  <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                      {labels.playersTitle}
                    </h3>
                    <p className="mt-3 text-sm text-zinc-700 dark:text-zinc-200">
                      {viewer
                        ? `${viewer.displayName}: ${viewer.life} life, ${viewer.mana}/${viewer.maxMana} mana`
                        : currentMatch.view.players
                            .map((player) => player.displayName)
                            .join(', ')}
                    </p>
                  </div>
                </div>
              }
            />
          ) : (
            <article className="rounded-[1.75rem] border border-dashed border-zinc-300 bg-white p-8 shadow-sm dark:border-zinc-700 dark:bg-zinc-950">
              <h2 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
                {labels.activeMatchTitle}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                {labels.noActiveMatch}
              </p>
            </article>
          )}
        </article>
      </div>
    </section>
  );
}
