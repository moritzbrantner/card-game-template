'use client';

import { startTransition, useEffect, useState } from 'react';

import { buttonVariants } from '@moritzbrantner/ui';
import { defaultGameCatalog } from '@repo/game-catalog';

import type {
  ListUnoMatchesResult,
  PersistedUnoMatchRealtimeDto,
  PersistedUnoMatchSnapshotDto,
} from '@/src/domain/game-matches/contracts';
import { readProblemDetail } from '@/src/http/problem-client';

type UnoPageLabels = {
  activeMatchDescription: string;
  activeMatchTitle: string;
  createAction: string;
  createHint: string;
  createTitle: string;
  description: string;
  emptyOpenLobbies: string;
  exitGame: string;
  exitedGameStatus: string;
  finishGame: string;
  hostBadge: string;
  joinAction: string;
  joinedLobbyStatus: string;
  leaveLobby: string;
  leftLobbyStatus: string;
  lobbyReadyTitle: string;
  nameLabel: string;
  openLobbiesTitle: string;
  pastGamesCta: string;
  readyToStart: string;
  startGame: string;
  startedGameStatus: string;
  title: string;
  waitingForPlayers: string;
  presetLabel: string;
  resumeAction: string;
  reloadAction: string;
  emptyRecentMatches: string;
  recentMatchesTitle: string;
  activeMatchesTitle: string;
  noActiveMatch: string;
  legalActionsTitle: string;
  analysisTitle: string;
};

async function readJson<T>(response: Response) {
  return response.json() as Promise<T>;
}

async function loadMatchList() {
  const response = await fetch('/api/games/uno/matches', {
    method: 'GET',
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Unable to load matches.');
  }

  return readJson<ListUnoMatchesResult>(response);
}

async function loadMatchSnapshot(matchId: string) {
  const response = await fetch(`/api/games/uno/matches/${matchId}`, {
    method: 'GET',
    cache: 'no-store',
  });

  if (!response.ok) {
    throw await readProblemDetail(response, 'Unable to load match.');
  }

  return readJson<PersistedUnoMatchSnapshotDto>(response);
}

async function loadMatchUpdates(match: PersistedUnoMatchSnapshotDto) {
  const params = new URLSearchParams({
    afterSequence: String(match.lastSequence),
    sinceUpdatedAt: match.updatedAt,
  });
  const response = await fetch(
    `/api/games/uno/matches/${match.matchId}/events?${params.toString()}`,
    {
      method: 'GET',
      cache: 'no-store',
    },
  );

  if (!response.ok) {
    throw await readProblemDetail(response, 'Unable to load match updates.');
  }

  return readJson<PersistedUnoMatchRealtimeDto>(response);
}

function winnerLabel(match: ListUnoMatchesResult['recent'][number]) {
  const winnerId = match.result?.winnerIds[0];
  return (
    match.participants.find((participant) => participant.playerId === winnerId)
      ?.displayName ?? 'No winner yet'
  );
}

export function UnoPageClient({
  labels,
  pastGamesHref,
}: {
  labels: UnoPageLabels;
  pastGamesHref: string;
}) {
  const [matches, setMatches] = useState<ListUnoMatchesResult>({
    active: [],
    recent: [],
  });
  const [currentMatch, setCurrentMatch] =
    useState<PersistedUnoMatchSnapshotDto | null>(null);
  const [draftName, setDraftName] = useState('');
  const [presetId, setPresetId] = useState<
    'hotseat-duo' | 'mixed-table' | 'bot-duel'
  >('bot-duel');
  const [pending, setPending] = useState(false);
  const [state, setState] = useState<{ announcement?: string; error?: string }>(
    {},
  );
  const catalogEntry = defaultGameCatalog.get('uno-style');

  async function refresh(matchId?: string) {
    const nextMatches = await loadMatchList();
    setMatches(nextMatches);

    const targetMatchId =
      matchId ??
      currentMatch?.matchId ??
      nextMatches.active[0]?.matchId ??
      null;

    if (!targetMatchId) {
      setCurrentMatch(null);
      return;
    }

    const snapshot = await loadMatchSnapshot(targetMatchId);
    setCurrentMatch(snapshot);
  }

  useEffect(() => {
    async function bootstrap() {
      const nextMatches = await loadMatchList();
      setMatches(nextMatches);

      const targetMatchId = nextMatches.active[0]?.matchId ?? null;
      if (!targetMatchId) {
        setCurrentMatch(null);
        return;
      }

      const snapshot = await loadMatchSnapshot(targetMatchId);
      setCurrentMatch(snapshot);
    }

    startTransition(() => {
      void bootstrap().catch((error) => {
        setState({
          error:
            error instanceof Error ? error.message : 'Unable to load matches.',
        });
      });
    });
  }, []);

  useEffect(() => {
    if (!currentMatch) {
      return;
    }

    let cancelled = false;
    const poll = async () => {
      try {
        const updates = await loadMatchUpdates(currentMatch);

        if (cancelled || !updates.hasChanges) {
          return;
        }

        setCurrentMatch(updates.snapshot);
        if (updates.snapshot.status !== currentMatch.status) {
          const nextMatches = await loadMatchList();
          if (!cancelled) {
            setMatches(nextMatches);
          }
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            error:
              error instanceof Error
                ? error.message
                : 'Unable to load match updates.',
          });
        }
      }
    };
    const intervalId = window.setInterval(() => {
      void poll();
    }, 2500);

    void poll();

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [currentMatch]);

  async function handleCreateMatch() {
    setPending(true);
    setState({});

    const response = await fetch('/api/games/uno/matches', {
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
        'Unable to create a match.',
      );
      setState({ error: problem.message });
      setPending(false);
      return;
    }

    const snapshot = await readJson<PersistedUnoMatchSnapshotDto>(response);
    setCurrentMatch(snapshot);
    setState({ announcement: labels.joinedLobbyStatus });
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
          error instanceof Error ? error.message : 'Unable to resume match.',
      });
    } finally {
      setPending(false);
    }
  }

  async function handleSubmitMove(
    move: PersistedUnoMatchSnapshotDto['view']['legalActions'][number]['move'],
  ) {
    if (!currentMatch) {
      return;
    }

    setPending(true);
    setState({});

    const response = await fetch(
      `/api/games/uno/matches/${currentMatch.matchId}/moves`,
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
        'Unable to submit move.',
      );
      setState({ error: problem.message });
      setPending(false);
      return;
    }

    const snapshot = await readJson<PersistedUnoMatchSnapshotDto>(response);
    setCurrentMatch(snapshot);
    await refresh(snapshot.matchId);
    setPending(false);
  }

  async function handleAbandon() {
    if (!currentMatch) {
      return;
    }

    setPending(true);
    setState({});

    const response = await fetch(
      `/api/games/uno/matches/${currentMatch.matchId}/abandon`,
      {
        method: 'POST',
      },
    );

    if (!response.ok) {
      const problem = await readProblemDetail(
        response,
        'Unable to abandon match.',
      );
      setState({ error: problem.message });
      setPending(false);
      return;
    }

    const snapshot = await readJson<PersistedUnoMatchSnapshotDto>(response);
    setCurrentMatch(snapshot);
    setState({ announcement: labels.exitedGameStatus });
    await refresh();
    setPending(false);
  }

  return (
    <section className="space-y-6">
      <div className="rounded-[2rem] border border-zinc-200 bg-zinc-50 p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-zinc-500 dark:text-zinc-400">
            {catalogEntry?.definition.name ?? 'UNO-style'}
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            {labels.title}
          </h1>
          <p className="max-w-3xl text-base leading-7 text-zinc-700 dark:text-zinc-300">
            {labels.description}
          </p>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href={pastGamesHref}
            className={buttonVariants({ variant: 'default' })}
          >
            {labels.pastGamesCta}
          </a>
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
                      : 'Unable to reload matches.',
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
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-zinc-950 dark:text-zinc-50">
              {labels.createTitle}
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              {labels.createHint}
            </p>
          </div>

          <label className="mt-6 block text-sm font-medium text-zinc-700 dark:text-zinc-200">
            {labels.nameLabel}
            <input
              className="mt-2 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-base text-zinc-950 outline-none transition focus:border-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
              value={draftName}
              onChange={(event) => {
                setDraftName(event.target.value);
              }}
            />
          </label>

          <label className="mt-4 block text-sm font-medium text-zinc-700 dark:text-zinc-200">
            {labels.presetLabel}
            <select
              className="mt-2 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-base text-zinc-950 outline-none transition focus:border-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
              value={presetId}
              onChange={(event) => {
                setPresetId(event.target.value as typeof presetId);
              }}
            >
              <option value="bot-duel">Bot duel</option>
              <option value="hotseat-duo">Duel preset</option>
              <option value="mixed-table">Full table</option>
            </select>
          </label>

          <button
            type="button"
            className={`${buttonVariants({ variant: 'default' })} mt-6`}
            disabled={pending}
            onClick={() => {
              void handleCreateMatch();
            }}
          >
            {labels.createAction}
          </button>

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
            <div className="space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
                    {labels.activeMatchTitle}
                  </h2>
                  <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                    {labels.activeMatchDescription}
                  </p>
                </div>
                <span className="rounded-full border border-zinc-300 px-4 py-2 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
                  {currentMatch.status}
                </span>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                  {currentMatch.view.status}
                </p>
                {currentMatch.view.matchResultBanner ? (
                  <p className="mt-2 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                    {currentMatch.view.matchResultBanner}
                  </p>
                ) : null}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {currentMatch.view.players.map((player) => (
                  <div
                    key={player.playerId}
                    className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-zinc-950 dark:text-zinc-50">
                        {player.displayName}
                      </p>
                      <span className="text-sm text-zinc-600 dark:text-zinc-300">
                        {player.handCount} cards
                      </span>
                    </div>
                    {player.visibleCards.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {player.visibleCards.map((card) => (
                          <span
                            key={card.id}
                            className="rounded-full border border-zinc-300 px-3 py-1 text-xs text-zinc-700 dark:border-zinc-700 dark:text-zinc-200"
                          >
                            {card.label}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                  {labels.legalActionsTitle}
                </h3>
                {currentMatch.view.legalActions.length > 0 ? (
                  <div
                    className="flex flex-wrap gap-3"
                    role="group"
                    aria-label={labels.legalActionsTitle}
                  >
                    {currentMatch.view.legalActions.map((action) => (
                      <button
                        key={action.id}
                        type="button"
                        className={buttonVariants({ variant: 'default' })}
                        disabled={pending || currentMatch.status !== 'active'}
                        onClick={() => {
                          void handleSubmitMove(action.move);
                        }}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-zinc-600 dark:text-zinc-300">
                    {labels.waitingForPlayers}
                  </p>
                )}
              </div>

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
                    {labels.recentMatchesTitle}
                  </h3>
                  {matches.recent[0] ? (
                    <p className="mt-3 text-sm text-zinc-700 dark:text-zinc-200">
                      Last winner: {winnerLabel(matches.recent[0])}
                    </p>
                  ) : (
                    <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">
                      {labels.emptyRecentMatches}
                    </p>
                  )}
                </div>
              </div>

              {currentMatch.status === 'active' ? (
                <button
                  type="button"
                  className={buttonVariants({ variant: 'destructive' })}
                  disabled={pending}
                  onClick={() => {
                    void handleAbandon();
                  }}
                >
                  {labels.exitGame}
                </button>
              ) : null}
            </div>
          ) : (
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
                {labels.lobbyReadyTitle}
              </h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-300">
                {labels.noActiveMatch}
              </p>
            </div>
          )}
        </article>
      </div>

      <article className="rounded-[1.75rem] border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
          {labels.recentMatchesTitle}
        </h2>
        <div className="mt-6 grid gap-4">
          {matches.recent.length > 0 ? (
            matches.recent.map((match) => (
              <a
                key={match.matchId}
                href={`${pastGamesHref}/${match.matchId}`}
                className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 transition hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-zinc-950 dark:text-zinc-50">
                      {match.participants
                        .map((participant) => participant.displayName)
                        .join(', ')}
                    </p>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                      {winnerLabel(match)}
                    </p>
                  </div>
                  <span className="text-sm text-zinc-600 dark:text-zinc-300">
                    {new Date(match.updatedAt).toLocaleString()}
                  </span>
                </div>
              </a>
            ))
          ) : (
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              {labels.emptyRecentMatches}
            </p>
          )}
        </div>
      </article>
    </section>
  );
}
