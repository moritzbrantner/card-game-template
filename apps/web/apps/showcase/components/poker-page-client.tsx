'use client';

import {
  startTransition,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from 'react';

import { PlayingCard, type CardSuit } from '@moritzbrantner/card-games';
import { buttonVariants } from '@moritzbrantner/ui';
import {
  pokerExamplePresets,
  type PokerCard,
  type PokerExamplePresetId,
} from '@repo/game-poker';

import type {
  ListPokerMatchesResult,
  PersistedPokerMatchSnapshotDto,
} from '@/src/domain/game-matches/contracts';
import { readProblemDetail } from '@/src/http/problem-client';
import { GameSessionFrame } from './game-session';

type PokerPageLabels = {
  activeMatchDescription: string;
  activeMatchTitle: string;
  activeMatchesTitle: string;
  analysisTitle: string;
  communityCardsLabel: string;
  createAction: string;
  createHint: string;
  createTitle: string;
  createdMatchStatus: string;
  description: string;
  emptyBoard: string;
  emptyRecentMatches: string;
  holeCardsHidden: string;
  lastWinnerLabel: string;
  legalActionsTitle: string;
  nameLabel: string;
  noActiveMatch: string;
  phaseLabel: string;
  playersTitle: string;
  potLabel: string;
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
  const response = await fetch('/api/games/poker/matches', {
    method: 'GET',
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Unable to load poker matches.');
  }

  return readJson<ListPokerMatchesResult>(response);
}

async function loadMatchSnapshot(matchId: string) {
  const response = await fetch(`/api/games/poker/matches/${matchId}`, {
    method: 'GET',
    cache: 'no-store',
  });

  if (!response.ok) {
    throw await readProblemDetail(response, 'Unable to load poker match.');
  }

  return readJson<PersistedPokerMatchSnapshotDto>(response);
}

function winnerLabel(match: ListPokerMatchesResult['recent'][number]) {
  const winnerId = match.result?.winnerIds[0];
  return (
    match.participants.find((participant) => participant.playerId === winnerId)
      ?.displayName ?? 'No winner yet'
  );
}

function renderCard(card: PokerCard, index: number) {
  return (
    <PlayingCard
      key={`${card.id}-${index}`}
      rank={card.rank}
      suit={card.suit as CardSuit}
      size="sm"
      tone="classic"
      effect="glass"
    />
  );
}

function renderHiddenCards(count = 2) {
  return Array.from({ length: count }, (_, index) => (
    <PlayingCard
      key={`hidden-${index}`}
      rank="?"
      face="back"
      size="sm"
      tone="midnight"
      effect="foil"
    />
  ));
}

export function PokerPageClient({ labels }: { labels: PokerPageLabels }) {
  const [matches, setMatches] = useState<ListPokerMatchesResult>({
    active: [],
    recent: [],
  });
  const [currentMatch, setCurrentMatch] =
    useState<PersistedPokerMatchSnapshotDto | null>(null);
  const [draftName, setDraftName] = useState('');
  const [presetId, setPresetId] = useState<PokerExamplePresetId>('heads-up');
  const [pending, setPending] = useState(false);
  const [state, setState] = useState<{ announcement?: string; error?: string }>(
    {},
  );
  const currentMatchRef = useRef<PersistedPokerMatchSnapshotDto | null>(null);

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
              : 'Unable to load poker matches.',
        });
      });
    });
  }, []);

  async function handleCreateMatch() {
    setPending(true);
    setState({});

    const response = await fetch('/api/games/poker/matches', {
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
        'Unable to create poker match.',
      );
      setState({ error: problem.message });
      setPending(false);
      return;
    }

    const snapshot = await readJson<PersistedPokerMatchSnapshotDto>(response);
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
            : 'Unable to resume poker match.',
      });
    } finally {
      setPending(false);
    }
  }

  async function handleSubmitMove(
    move: PersistedPokerMatchSnapshotDto['view']['legalActions'][number]['move'],
  ) {
    if (!currentMatch) {
      return;
    }

    setPending(true);
    setState({});

    const response = await fetch(
      `/api/games/poker/matches/${currentMatch.matchId}/moves`,
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
        'Unable to submit poker move.',
      );
      setState({ error: problem.message });
      setPending(false);
      return;
    }

    const snapshot = await readJson<PersistedPokerMatchSnapshotDto>(response);
    setCurrentMatch(snapshot);
    if (snapshot.status !== 'active') {
      await refresh(snapshot.matchId);
    }
    setPending(false);
  }

  return (
    <section className="space-y-6">
      <div className="rounded-[2rem] border border-zinc-200 bg-zinc-50 p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-zinc-500 dark:text-zinc-400">
            Texas Hold&apos;em
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
                      : 'Unable to reload poker matches.',
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
                  setPresetId(event.target.value as PokerExamplePresetId);
                }}
              >
                {pokerExamplePresets.map((preset) => (
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
                detail: (
                  <>
                    {player.controller}
                    {player.hasFolded ? ' - Folded' : ''}
                    {' - '}
                    {player.stack} chips
                  </>
                ),
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
                {
                  id: 'phase',
                  label: labels.phaseLabel,
                  value: currentMatch.view.phase,
                },
                {
                  id: 'pot',
                  label: labels.potLabel,
                  value: currentMatch.view.pot,
                  detail: `${currentMatch.view.pot} chips in the pot.`,
                },
              ]}
              subtitle={labels.activeMatchDescription}
              table={
                <div className="grid gap-4 xl:grid-cols-[0.78fr_1.22fr]">
                  <div className="rounded-[1.4rem] border border-white/12 bg-white/8 p-4 backdrop-blur-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/65">
                      {labels.communityCardsLabel}
                    </p>
                    {currentMatch.view.communityCards.length > 0 ? (
                      <div className="mt-4 flex flex-wrap gap-3">
                        {currentMatch.view.communityCards.map(renderCard)}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-white/72">
                        {labels.emptyBoard}
                      </p>
                    )}
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    {currentMatch.view.players.map((player) => (
                      <div
                        key={player.playerId}
                        className="rounded-[1.4rem] border border-white/12 bg-white/8 p-4 backdrop-blur-sm"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-medium text-white">
                              {player.displayName}
                            </p>
                            <p className="mt-1 text-sm text-white/72">
                              {player.controller}
                              {player.hasFolded ? ' - Folded' : ''}
                              {player.isActive ? ' - Active' : ''}
                              {player.isViewer ? ' - You' : ''}
                            </p>
                          </div>
                          <span className="text-sm text-white/72">
                            {player.stack}
                          </span>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-3">
                          {player.visibleCards.length > 0
                            ? player.visibleCards.map(renderCard)
                            : renderHiddenCards()}
                        </div>
                        {player.visibleCards.length === 0 ? (
                          <p className="mt-3 text-sm text-white/72">
                            {labels.holeCardsHidden}
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
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
                      {labels.potLabel}: {currentMatch.view.pot}
                    </p>
                    <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-200">
                      {currentMatch.view.players
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
