'use client';

import { startTransition, useEffect, useState } from 'react';

import { buttonVariants } from '@moritzbrantner/ui';

import type { ListUnoMatchesResult } from '@/src/domain/game-matches/contracts';

type PastGamesPageLabels = {
  backToLobbies: string;
  description: string;
  emptyDescription: string;
  emptyTitle: string;
  noteLabel: string;
  playersLabel: string;
  statusAbandoned: string;
  statusCompleted: string;
  title: string;
  winnerLabel: string;
};

async function loadMatches() {
  const response = await fetch('/api/games/uno/matches', {
    method: 'GET',
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Unable to load past games.');
  }

  return response.json() as Promise<ListUnoMatchesResult>;
}

export function PastGamesPageClient({
  labels,
  lobbiesHref,
}: {
  labels: PastGamesPageLabels;
  lobbiesHref: string;
}) {
  const [matches, setMatches] = useState<ListUnoMatchesResult>({
    active: [],
    recent: [],
  });

  useEffect(() => {
    startTransition(() => {
      void loadMatches().then(setMatches);
    });
  }, []);

  return (
    <section className="space-y-6">
      <div className="rounded-[2rem] border border-zinc-200 bg-zinc-50 p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="space-y-4">
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            {labels.title}
          </h1>
          <p className="max-w-3xl text-base leading-7 text-zinc-700 dark:text-zinc-300">
            {labels.description}
          </p>
        </div>

        <div className="mt-6">
          <a
            href={lobbiesHref}
            className={buttonVariants({ variant: 'default' })}
          >
            {labels.backToLobbies}
          </a>
        </div>
      </div>

      {matches.recent.length > 0 ? (
        <div className="grid gap-4">
          {matches.recent.map((match) => {
            const winner = match.result?.winnerIds[0]
              ? (match.participants.find(
                  (player) => player.playerId === match.result?.winnerIds[0],
                )?.displayName ?? null)
              : null;

            return (
              <a
                key={match.matchId}
                href={`${lobbiesHref.replace('/uno', '/past-games')}/${match.matchId}`}
                className="rounded-[1.75rem] border border-zinc-200 bg-white p-6 shadow-sm transition hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
                      {match.participants
                        .map((player) => player.displayName)
                        .join(', ')}
                    </h2>
                    <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                      {match.status === 'completed'
                        ? labels.statusCompleted
                        : labels.statusAbandoned}
                    </p>
                  </div>
                  <span className="rounded-full border border-zinc-300 px-4 py-2 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
                    {new Date(match.updatedAt).toLocaleString()}
                  </span>
                </div>

                <dl className="mt-6 grid gap-4 md:grid-cols-3">
                  <div className="rounded-2xl bg-zinc-50 px-4 py-3 dark:bg-zinc-900">
                    <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                      {labels.playersLabel}
                    </dt>
                    <dd className="mt-2 text-sm text-zinc-700 dark:text-zinc-200">
                      {match.participants
                        .map((player) => player.displayName)
                        .join(', ')}
                    </dd>
                  </div>
                  <div className="rounded-2xl bg-zinc-50 px-4 py-3 dark:bg-zinc-900">
                    <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                      {labels.noteLabel}
                    </dt>
                    <dd className="mt-2 text-sm text-zinc-700 dark:text-zinc-200">
                      {match.analysis?.generic.acceptedMoveCount ?? 0} accepted
                      moves
                    </dd>
                  </div>
                  <div className="rounded-2xl bg-zinc-50 px-4 py-3 dark:bg-zinc-900">
                    <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                      {labels.winnerLabel}
                    </dt>
                    <dd className="mt-2 text-sm text-zinc-700 dark:text-zinc-200">
                      {winner ?? 'No winner recorded'}
                    </dd>
                  </div>
                </dl>
              </a>
            );
          })}
        </div>
      ) : (
        <article className="rounded-[1.75rem] border border-dashed border-zinc-300 bg-white p-8 shadow-sm dark:border-zinc-700 dark:bg-zinc-950">
          <h2 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
            {labels.emptyTitle}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-300">
            {labels.emptyDescription}
          </p>
        </article>
      )}
    </section>
  );
}
