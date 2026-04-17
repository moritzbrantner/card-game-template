'use client';

import { startTransition, useEffect, useState } from 'react';

import { buttonVariants } from '@moritzbrantner/ui';
import { defaultGameCatalog } from '@repo/game-catalog';

import {
  createUnoDemoId,
  readUnoDraftName,
  readUnoDemoStore,
  readUnoViewerSession,
  subscribeToUnoDemoStore,
  updateUnoDemoStore,
  type UnoViewerSession,
  writeUnoDraftName,
  writeUnoViewerSession,
} from '@/src/domain/uno-lobby/browser-store';
import {
  canStartUnoLobby,
  createEmptyUnoDemoStore,
  createUnoLobby,
  findUnoLobbyByPlayer,
  finishUnoMatch,
  getUnoSeatFillLabel,
  isUnoLobbyHost,
  joinUnoLobby,
  leaveUnoLobby,
  startUnoLobbyGame,
  type UnoArchivedMatchRecord,
} from '@/src/domain/uno-lobby/store';

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
};

function createTimestamp() {
  return new Date().toISOString();
}

function createViewer(displayName: string) {
  const normalizedName = displayName.trim();

  if (!normalizedName) {
    return null;
  }

  const existingViewer = readUnoViewerSession();

  if (existingViewer && existingViewer.displayName === normalizedName) {
    return existingViewer;
  }

  const nextViewer = {
    playerId: `viewer-${createUnoDemoId()}`,
    displayName: normalizedName,
  };

  writeUnoViewerSession(nextViewer);
  return nextViewer;
}

function renderArchiveSummary(match: UnoArchivedMatchRecord) {
  if (match.result?.winnerIds.length) {
    const winner = match.players.find((player) => player.playerId === match.result?.winnerIds[0]);
    return `${winner?.displayName ?? 'A player'} won the last demo match.`;
  }

  return match.note;
}

export function UnoPageClient({
  labels,
  pastGamesHref,
}: {
  labels: UnoPageLabels;
  pastGamesHref: string;
}) {
  const [store, setStore] = useState(() => createEmptyUnoDemoStore());
  const [draftName, setDraftName] = useState('');
  const [announcement, setAnnouncement] = useState<string | null>(null);
  const [viewer, setViewer] = useState<UnoViewerSession | null>(null);

  useEffect(() => {
    setStore(readUnoDemoStore());
    setDraftName(readUnoDraftName());
    setViewer(readUnoViewerSession());

    return subscribeToUnoDemoStore(() => {
      startTransition(() => {
        setStore(readUnoDemoStore());
      });
    });
  }, []);

  const currentLobby = viewer ? findUnoLobbyByPlayer(store, viewer.playerId) : null;
  const catalogEntry = defaultGameCatalog.get('uno-style');
  const openLobbies = store.lobbies.filter((lobby) => lobby.status === 'open' && lobby.roomId !== currentLobby?.roomId);
  const latestArchive = store.archivedMatches[0] ?? null;

  function updateName(value: string) {
    setDraftName(value);
    writeUnoDraftName(value);
  }

  function ensureViewer() {
    const nextViewer = createViewer(draftName);

    if (!nextViewer) {
      setAnnouncement(labels.createHint);
      return null;
    }

    setViewer(nextViewer);
    return nextViewer;
  }

  return (
    <section className="space-y-6">
      <div className="rounded-[2rem] border border-zinc-200 bg-zinc-50 p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-zinc-500 dark:text-zinc-400">
            {catalogEntry?.definition.name ?? 'UNO-style'}
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">{labels.title}</h1>
          <p className="max-w-3xl text-base leading-7 text-zinc-700 dark:text-zinc-300">{labels.description}</p>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <a href={pastGamesHref} className={buttonVariants({ variant: 'default' })}>
            {labels.pastGamesCta}
          </a>
          {latestArchive ? (
            <span className="inline-flex items-center rounded-full border border-zinc-300 px-4 py-2 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
              {renderArchiveSummary(latestArchive)}
            </span>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <article className="rounded-[1.75rem] border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-zinc-950 dark:text-zinc-50">{labels.createTitle}</h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-300">{labels.createHint}</p>
          </div>

          <label className="mt-6 block text-sm font-medium text-zinc-700 dark:text-zinc-200">
            {labels.nameLabel}
            <input
              className="mt-2 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-base text-zinc-950 outline-none transition focus:border-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
              value={draftName}
              onChange={(event) => {
                updateName(event.target.value);
              }}
              disabled={!!currentLobby}
            />
          </label>

          <button
            type="button"
            className={`${buttonVariants({ variant: 'default' })} mt-6`}
            disabled={!!currentLobby}
            onClick={() => {
              const nextViewer = ensureViewer();

              if (!nextViewer) {
                return;
              }

              const roomId = createUnoDemoId();

              updateUnoDemoStore((currentStore) => {
                const createdLobby = createUnoLobby(currentStore, {
                  playerId: nextViewer.playerId,
                  displayName: nextViewer.displayName,
                  now: createTimestamp(),
                  idFactory: () => roomId,
                });

                return createdLobby.store;
              });

              setAnnouncement(labels.joinedLobbyStatus);
            }}
          >
            {labels.createAction}
          </button>
        </article>

        {currentLobby ? (
          <article className="rounded-[1.75rem] border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
                  {currentLobby.status === 'active' ? labels.activeMatchTitle : labels.lobbyReadyTitle}
                </h2>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                  {currentLobby.status === 'active' ? labels.activeMatchDescription : getUnoSeatFillLabel(currentLobby)}
                </p>
              </div>
              <div className="rounded-full border border-zinc-300 px-4 py-2 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
                {currentLobby.roomName}
              </div>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {currentLobby.players.map((player) => (
                <div
                  key={player.playerId}
                  className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <p className="font-medium text-zinc-950 dark:text-zinc-50">
                    {player.displayName}
                    {currentLobby.hostPlayerId === player.playerId ? ` (${labels.hostBadge})` : ''}
                  </p>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">Seat {player.seat + 1}</p>
                </div>
              ))}
            </div>

            {currentLobby.status === 'open' ? (
              <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-300">
                {canStartUnoLobby(currentLobby) ? labels.readyToStart : labels.waitingForPlayers}
              </p>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-3">
              {currentLobby.status === 'open' && isUnoLobbyHost(currentLobby, viewer?.playerId) ? (
                <button
                  type="button"
                  className={buttonVariants({ variant: 'default' })}
                  disabled={!canStartUnoLobby(currentLobby)}
                  onClick={() => {
                    updateUnoDemoStore((currentStore) =>
                      startUnoLobbyGame(currentStore, {
                        roomId: currentLobby.roomId,
                        now: createTimestamp(),
                        idFactory: createUnoDemoId,
                      }),
                    );
                    setAnnouncement(labels.startedGameStatus);
                  }}
                >
                  {labels.startGame}
                </button>
              ) : null}

              {currentLobby.status === 'active' && isUnoLobbyHost(currentLobby, viewer?.playerId) ? (
                <button
                  type="button"
                  className={buttonVariants({ variant: 'outline' })}
                  onClick={() => {
                    updateUnoDemoStore((currentStore) =>
                      finishUnoMatch(currentStore, {
                        roomId: currentLobby.roomId,
                        winnerIds: currentLobby.players.length > 0 ? [currentLobby.players[0]!.playerId] : [],
                        now: createTimestamp(),
                        idFactory: createUnoDemoId,
                      }),
                    );
                    setAnnouncement(labels.finishGame);
                  }}
                >
                  {labels.finishGame}
                </button>
              ) : null}

              <button
                type="button"
                className={buttonVariants({ variant: currentLobby.status === 'active' ? 'destructive' : 'outline' })}
                onClick={() => {
                  updateUnoDemoStore((currentStore) =>
                    leaveUnoLobby(currentStore, {
                      roomId: currentLobby.roomId,
                      playerId: viewer?.playerId ?? '',
                      now: createTimestamp(),
                      idFactory: createUnoDemoId,
                    }),
                  );
                  setAnnouncement(currentLobby.status === 'active' ? labels.exitedGameStatus : labels.leftLobbyStatus);
                }}
              >
                {currentLobby.status === 'active' ? labels.exitGame : labels.leaveLobby}
              </button>
            </div>
          </article>
        ) : (
          <article className="rounded-[1.75rem] border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">{labels.openLobbiesTitle}</h2>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                  {catalogEntry?.definition.minPlayers}-{catalogEntry?.definition.maxPlayers} players per table
                </p>
              </div>
            </div>

            {openLobbies.length > 0 ? (
              <div className="mt-6 grid gap-3">
                {openLobbies.map((lobby) => (
                  <div
                    key={lobby.roomId}
                    className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-4 dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">{lobby.roomName}</h3>
                        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{getUnoSeatFillLabel(lobby)}</p>
                      </div>
                      <button
                        type="button"
                        aria-label={`${labels.joinAction} ${lobby.roomName}`}
                        className={buttonVariants({ variant: 'default' })}
                        onClick={() => {
                          const nextViewer = ensureViewer();

                          if (!nextViewer) {
                            return;
                          }

                          updateUnoDemoStore((currentStore) =>
                            joinUnoLobby(currentStore, {
                              roomId: lobby.roomId,
                              playerId: nextViewer.playerId,
                              displayName: nextViewer.displayName,
                              now: createTimestamp(),
                            }),
                          );
                          setAnnouncement(labels.joinedLobbyStatus);
                        }}
                      >
                        {labels.joinAction}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-300">{labels.emptyOpenLobbies}</p>
            )}
          </article>
        )}
      </div>

      {announcement ? (
        <div className="rounded-[1.75rem] border border-emerald-300 bg-emerald-50 px-6 py-4 text-sm font-medium text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-100">
          {announcement}
        </div>
      ) : null}
    </section>
  );
}
