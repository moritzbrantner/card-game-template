'use client';

import { startTransition, useEffect, useState } from 'react';

import { buttonVariants } from '@moritzbrantner/ui';

import {
  readUnoDemoStore,
  subscribeToUnoDemoStore,
} from '@/src/domain/uno-lobby/browser-store';
import {
  createEmptyUnoDemoStore,
} from '@/src/domain/uno-lobby/store';

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

export function PastGamesPageClient({
  labels,
  lobbiesHref,
}: {
  labels: PastGamesPageLabels;
  lobbiesHref: string;
}) {
  const [store, setStore] = useState(() => createEmptyUnoDemoStore());

  useEffect(() => {
    setStore(readUnoDemoStore());

    return subscribeToUnoDemoStore(() => {
      startTransition(() => {
        setStore(readUnoDemoStore());
      });
    });
  }, []);

  return (
    <section className="space-y-6">
      <div className="rounded-[2rem] border border-zinc-200 bg-zinc-50 p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="space-y-4">
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">{labels.title}</h1>
          <p className="max-w-3xl text-base leading-7 text-zinc-700 dark:text-zinc-300">{labels.description}</p>
        </div>

        <div className="mt-6">
          <a href={lobbiesHref} className={buttonVariants({ variant: 'default' })}>
            {labels.backToLobbies}
          </a>
        </div>
      </div>

      {store.archivedMatches.length > 0 ? (
        <div className="grid gap-4">
          {store.archivedMatches.map((match) => {
            const winner = match.result?.winnerIds[0]
              ? match.players.find((player) => player.playerId === match.result?.winnerIds[0])?.displayName ?? null
              : null;

            return (
              <article
                key={match.archiveId}
                className="rounded-[1.75rem] border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">{match.roomName}</h2>
                    <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                      {match.status === 'completed' ? labels.statusCompleted : labels.statusAbandoned}
                    </p>
                  </div>
                  <span className="rounded-full border border-zinc-300 px-4 py-2 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
                    {new Date(match.endedAt).toLocaleString()}
                  </span>
                </div>

                <dl className="mt-6 grid gap-4 md:grid-cols-3">
                  <div className="rounded-2xl bg-zinc-50 px-4 py-3 dark:bg-zinc-900">
                    <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                      {labels.playersLabel}
                    </dt>
                    <dd className="mt-2 text-sm text-zinc-700 dark:text-zinc-200">
                      {match.players.map((player) => player.displayName).join(', ')}
                    </dd>
                  </div>
                  <div className="rounded-2xl bg-zinc-50 px-4 py-3 dark:bg-zinc-900">
                    <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                      {labels.noteLabel}
                    </dt>
                    <dd className="mt-2 text-sm text-zinc-700 dark:text-zinc-200">{match.note}</dd>
                  </div>
                  <div className="rounded-2xl bg-zinc-50 px-4 py-3 dark:bg-zinc-900">
                    <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                      {labels.winnerLabel}
                    </dt>
                    <dd className="mt-2 text-sm text-zinc-700 dark:text-zinc-200">{winner ?? 'No winner recorded'}</dd>
                  </div>
                </dl>
              </article>
            );
          })}
        </div>
      ) : (
        <article className="rounded-[1.75rem] border border-dashed border-zinc-300 bg-white p-8 shadow-sm dark:border-zinc-700 dark:bg-zinc-950">
          <h2 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">{labels.emptyTitle}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-300">{labels.emptyDescription}</p>
        </article>
      )}
    </section>
  );
}
