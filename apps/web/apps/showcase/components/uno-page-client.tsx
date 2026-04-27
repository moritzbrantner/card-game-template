'use client';

import {
  startTransition,
  type DragEvent,
  type KeyboardEvent,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from 'react';

import { CardTable } from '@moritzbrantner/card-games';
import { buttonVariants } from '@moritzbrantner/ui';
import { defaultGameCatalog } from '@repo/game-catalog';

import {
  HiddenUnoCardStack,
  UnoColorBadge,
  UnoCardVisual,
  UnoHandPreview,
} from '@/components/uno-card-visuals';
import type {
  ListUnoMatchesResult,
  PersistedUnoMatchSnapshotDto,
} from '@/src/domain/game-matches/contracts';
import type {
  GameRoomDto,
  GameRoomRealtimeDto,
} from '@/src/domain/game-rooms/contracts';
import { readProblemDetail } from '@/src/http/problem-client';

type UnoPageLabels = {
  activeMatchDescription: string;
  activeMatchTitle: string;
  activeMatchesTitle: string;
  analysisTitle: string;
  botAmountHint: string;
  botAmountLabel: string;
  copyInviteAction: string;
  copyInviteStatus: string;
  completedMatchStatus: string;
  createAction: string;
  createHint: string;
  createTitle: string;
  description: string;
  emptyOpenLobbies: string;
  emptyRecentMatches: string;
  exitGame: string;
  exitedGameStatus: string;
  finishGame: string;
  hostBadge: string;
  inviteDescription: string;
  inviteLinkLabel: string;
  inviteTitle: string;
  joinAction: string;
  joinedLobbyStatus: string;
  leaveLobby: string;
  leftLobbyStatus: string;
  lobbyReadyTitle: string;
  nameLabel: string;
  noActiveMatch: string;
  openLobbiesTitle: string;
  pastGamesCta: string;
  readyAction: string;
  readyToStart: string;
  recentMatchesTitle: string;
  reloadAction: string;
  reviewReplayAction: string;
  reservedBotsLabel: string;
  resumeAction: string;
  roomSizeLabel: string;
  shareInviteHint: string;
  startGame: string;
  startedGameStatus: string;
  title: string;
  waitingForPlayers: string;
  legalActionsTitle: string;
};

type UnoMatchPlayerView =
  PersistedUnoMatchSnapshotDto['view']['players'][number];
type UnoLegalAction =
  PersistedUnoMatchSnapshotDto['view']['legalActions'][number];
type UnoDirectPlayAction = UnoLegalAction & {
  move: UnoLegalAction['move'] & {
    payload: {
      cardId: string;
      chosenColor?: string;
      sayUno?: boolean;
      targetPlayerId?: string;
    };
  };
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

async function loadRoomList() {
  const response = await fetch('/api/games/rooms', {
    method: 'GET',
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Unable to load rooms.');
  }

  return readJson<readonly GameRoomDto[]>(response);
}

async function loadRoom(roomId: string) {
  const response = await fetch(`/api/games/rooms/${roomId}`, {
    method: 'GET',
    cache: 'no-store',
  });

  if (!response.ok) {
    throw await readProblemDetail(response, 'Unable to load room.');
  }

  return readJson<GameRoomDto>(response);
}

async function loadRoomEvents(roomId: string, sinceUpdatedAt?: string | null) {
  const params = new URLSearchParams();

  if (sinceUpdatedAt) {
    params.set('sinceUpdatedAt', sinceUpdatedAt);
  }

  const response = await fetch(
    `/api/games/rooms/${roomId}/events${params.size > 0 ? `?${params.toString()}` : ''}`,
    {
      method: 'GET',
      cache: 'no-store',
    },
  );

  if (!response.ok) {
    throw await readProblemDetail(response, 'Unable to load lobby updates.');
  }

  return readJson<GameRoomRealtimeDto>(response);
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

function buildMatchWebSocketUrl(matchId: string) {
  const url = new URL(`/ws/games/uno/matches/${matchId}`, window.location.href);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return url.toString();
}

function winnerLabel(match: ListUnoMatchesResult['recent'][number]) {
  const winnerId = match.result?.winnerIds[0];
  return (
    match.participants.find((participant) => participant.playerId === winnerId)
      ?.displayName ?? 'No winner yet'
  );
}

function buildInviteUrl(roomId: string) {
  const url = new URL(window.location.href);
  url.searchParams.set('invite', roomId);
  return url.toString();
}

function buildReplayHref(pastGamesHref: string, matchId: string) {
  return `${pastGamesHref}/${matchId}`;
}

function replaceRoomUrl(roomId: string | null) {
  const url = new URL(window.location.href);

  if (roomId) {
    url.searchParams.set('invite', roomId);
  } else {
    url.searchParams.delete('invite');
  }

  window.history.replaceState({}, '', url);
}

function getOpenRooms(rooms: readonly GameRoomDto[]) {
  return rooms.filter((room) => room.status === 'open');
}

function isUnoPlayCardAction(
  action: UnoLegalAction,
): action is UnoDirectPlayAction {
  return (
    action.move.kind === 'play-card' &&
    typeof action.move.payload === 'object' &&
    action.move.payload !== null &&
    'cardId' in action.move.payload
  );
}

function chooseDirectPlayAction(input: {
  actionCandidates: readonly UnoLegalAction[];
  activeColor: PersistedUnoMatchSnapshotDto['view']['activeColor'];
  cardId: string;
  players: readonly UnoMatchPlayerView[];
  viewerPlayer: UnoMatchPlayerView | null;
}) {
  const playActions = input.actionCandidates.filter(
    (action) =>
      isUnoPlayCardAction(action) &&
      action.move.payload.cardId === input.cardId,
  );

  if (playActions.length === 0) {
    return null;
  }

  const remainingColorCounts = new Map<string, number>();
  const targetHandCounts = new Map(
    input.players.map((player) => [player.playerId, player.handCount] as const),
  );

  for (const card of input.viewerPlayer?.visibleCards ?? []) {
    if (card.id === input.cardId || card.color === 'wild') {
      continue;
    }

    remainingColorCounts.set(
      card.color,
      (remainingColorCounts.get(card.color) ?? 0) + 1,
    );
  }

  let bestAction: (typeof playActions)[number] | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const action of playActions) {
    let score = 0;

    if (action.move.payload.sayUno) {
      score += 1000;
    }

    if (action.move.payload.chosenColor) {
      score +=
        (remainingColorCounts.get(action.move.payload.chosenColor) ?? 0) * 100;

      if (action.move.payload.chosenColor === input.activeColor) {
        score += 1;
      }
    }

    if (action.move.payload.targetPlayerId) {
      score -= targetHandCounts.get(action.move.payload.targetPlayerId) ?? 99;
    }

    if (score > bestScore) {
      bestScore = score;
      bestAction = action;
    }
  }

  return bestAction;
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
  const [rooms, setRooms] = useState<readonly GameRoomDto[]>([]);
  const [currentRoom, setCurrentRoom] = useState<GameRoomDto | null>(null);
  const [currentMatch, setCurrentMatch] =
    useState<PersistedUnoMatchSnapshotDto | null>(null);
  const [draftName, setDraftName] = useState('');
  const [roomSize, setRoomSize] = useState('4');
  const [botCount, setBotCount] = useState('1');
  const [inviteRoomId, setInviteRoomId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  const [isDiscardDropActive, setIsDiscardDropActive] = useState(false);
  const [state, setState] = useState<{ announcement?: string; error?: string }>(
    {},
  );
  const catalogEntry = defaultGameCatalog.get('uno-style');
  const activeMatchId =
    currentMatch?.status === 'active' ? currentMatch.matchId : null;
  const activeMatchStatus = currentMatch?.status ?? null;
  const currentMatchRef = useRef<PersistedUnoMatchSnapshotDto | null>(null);
  const currentMatchPlayers = currentMatch?.view.players ?? [];
  const viewerPlayer =
    currentMatchPlayers.find((player) => player.isViewer) ??
    currentMatchPlayers[0] ??
    null;
  const opponentPlayers = viewerPlayer
    ? currentMatchPlayers.filter(
        (player) => player.playerId !== viewerPlayer.playerId,
      )
    : currentMatchPlayers;
  const directPlayableActions =
    currentMatch?.view.legalActions.filter(isUnoPlayCardAction) ?? [];
  const directPlayableCardIds = new Set(
    directPlayableActions.map((action) => action.move.payload.cardId),
  );

  useEffect(() => {
    currentMatchRef.current = currentMatch;
  }, [currentMatch]);

  async function refresh(matchId?: string, roomId?: string) {
    const targetRoomId =
      roomId ??
      currentRoom?.roomId ??
      new URL(window.location.href).searchParams.get('invite');
    const [nextMatches, nextRooms, targetedRoom] = await Promise.all([
      loadMatchList(),
      loadRoomList(),
      targetRoomId
        ? loadRoom(targetRoomId).catch(() => null)
        : Promise.resolve(null),
    ]);

    setMatches(nextMatches);
    setRooms(nextRooms);

    const openRooms = getOpenRooms(nextRooms);
    const nextCurrentRoom =
      (targetedRoom?.status === 'open' ? targetedRoom : null) ??
      (roomId ? openRooms.find((room) => room.roomId === roomId) : null) ??
      (currentRoom
        ? openRooms.find((room) => room.roomId === currentRoom.roomId)
        : null) ??
      openRooms[0] ??
      null;
    setCurrentRoom(nextCurrentRoom);

    if (targetedRoom && targetedRoom.status !== 'closed') {
      replaceRoomUrl(targetedRoom.roomId);
    } else if (!nextCurrentRoom && !matchId) {
      replaceRoomUrl(null);
    }

    const activeRoomMatchId =
      targetedRoom?.activeMatchId ??
      nextRooms.find((room) => room.status === 'active' && room.activeMatchId)
        ?.activeMatchId ??
      null;
    const targetMatchId =
      matchId ??
      targetedRoom?.activeMatchId ??
      currentMatchRef.current?.matchId ??
      nextMatches.active[0]?.matchId ??
      activeRoomMatchId;

    if (!targetMatchId) {
      setCurrentMatch(null);
      return;
    }

    const snapshot = await loadMatchSnapshot(targetMatchId);
    setCurrentMatch(snapshot);
  }

  const refreshFromEffects = useEffectEvent(
    async (matchId?: string, roomId?: string) => {
      await refresh(matchId, roomId);
    },
  );

  const handleLiveUpdate = useEffectEvent(
    async (snapshot: PersistedUnoMatchSnapshotDto) => {
      setState((current) => ({
        ...(current.error ? { ...current, error: undefined } : current),
        ...(snapshot.status === 'completed'
          ? { announcement: labels.completedMatchStatus }
          : {}),
      }));
      setCurrentMatch(snapshot);

      if (snapshot.status !== 'active') {
        try {
          await refresh(snapshot.matchId);
        } catch (error) {
          setState({
            error:
              error instanceof Error
                ? error.message
                : 'Unable to reload matches.',
          });
        }
      }
    },
  );

  useEffect(() => {
    setInviteRoomId(new URL(window.location.href).searchParams.get('invite'));

    startTransition(() => {
      void refreshFromEffects().catch((error) => {
        setState({
          error:
            error instanceof Error ? error.message : 'Unable to load matches.',
        });
      });
    });
  }, []);

  useEffect(() => {
    if (
      !currentRoom ||
      currentRoom.status !== 'open' ||
      !currentRoom.updatedAt ||
      typeof window === 'undefined'
    ) {
      return;
    }

    let cancelled = false;
    const intervalId = window.setInterval(() => {
      void (async () => {
        try {
          const realtime = await loadRoomEvents(
            currentRoom.roomId,
            currentRoom.updatedAt,
          );

          if (!realtime.hasChanges || cancelled) {
            return;
          }

          setRooms((existing) =>
            existing.map((room) =>
              room.roomId === realtime.room.roomId ? realtime.room : room,
            ),
          );
          setCurrentRoom(
            realtime.room.status === 'open' ? realtime.room : null,
          );

          if (realtime.room.activeMatchId) {
            const snapshot = await loadMatchSnapshot(
              realtime.room.activeMatchId,
            );
            if (!cancelled) {
              setCurrentMatch(snapshot);
            }
          }
        } catch (error) {
          if (!cancelled) {
            setState({
              error:
                error instanceof Error
                  ? error.message
                  : 'Unable to load lobby updates.',
            });
          }
        }
      })();
    }, 1000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [currentRoom]);

  useEffect(() => {
    if (
      !activeMatchId ||
      activeMatchStatus !== 'active' ||
      typeof window.WebSocket !== 'function'
    ) {
      return;
    }

    let cancelled = false;
    let reconnectTimeoutId: number | null = null;
    let socket: WebSocket | null = null;

    const connect = () => {
      if (cancelled) {
        return;
      }

      socket = new window.WebSocket(buildMatchWebSocketUrl(activeMatchId));

      const handleMessage = (event: MessageEvent<string>) => {
        try {
          const message = JSON.parse(event.data) as {
            snapshot?: PersistedUnoMatchSnapshotDto;
            type?: string;
          };

          if (message.type === 'uno.match.snapshot' && message.snapshot) {
            void handleLiveUpdate(message.snapshot);
          }
        } catch (error) {
          setState({
            error:
              error instanceof Error
                ? error.message
                : 'Unable to read match updates.',
          });
        }
      };

      const handleClose = () => {
        if (cancelled) {
          return;
        }

        const latestMatch = currentMatchRef.current;

        if (
          latestMatch?.matchId === activeMatchId &&
          latestMatch.status === 'active'
        ) {
          reconnectTimeoutId = window.setTimeout(connect, 1000);
        }
      };

      socket.addEventListener('message', handleMessage);
      socket.addEventListener('close', handleClose);
    };

    connect();

    return () => {
      cancelled = true;

      if (reconnectTimeoutId !== null) {
        window.clearTimeout(reconnectTimeoutId);
      }

      socket?.close();
    };
  }, [activeMatchId, activeMatchStatus]);

  async function handleCreateLobby() {
    setPending(true);
    setState({});

    const response = await fetch('/api/games/rooms', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        gameId: 'uno-style',
        displayName: draftName.trim() || undefined,
        maxPlayers: Number(roomSize),
        botCount: Number(botCount),
      }),
    });

    if (!response.ok) {
      const problem = await readProblemDetail(
        response,
        'Unable to create a lobby.',
      );
      setState({ error: problem.message });
      setPending(false);
      return;
    }

    const room = await readJson<GameRoomDto>(response);
    setRooms((existing) => [
      room,
      ...existing.filter((existingRoom) => existingRoom.roomId !== room.roomId),
    ]);
    setCurrentRoom(room);
    setCurrentMatch(null);
    setState({ announcement: labels.joinedLobbyStatus });
    replaceRoomUrl(room.roomId);
    setPending(false);
  }

  async function handleJoinInvite() {
    if (!inviteRoomId) {
      return;
    }

    setPending(true);
    setState({});

    const response = await fetch(`/api/games/rooms/${inviteRoomId}/join`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        displayName: draftName.trim() || undefined,
      }),
    });

    if (!response.ok) {
      const problem = await readProblemDetail(
        response,
        'Unable to join lobby.',
      );
      setState({ error: problem.message });
      setPending(false);
      return;
    }

    const room = await readJson<GameRoomDto>(response);
    setInviteRoomId(null);
    setRooms((existing) => [
      room,
      ...existing.filter((existingRoom) => existingRoom.roomId !== room.roomId),
    ]);
    setCurrentRoom(room);
    setState({ announcement: labels.joinedLobbyStatus });
    replaceRoomUrl(room.roomId);
    setPending(false);
  }

  async function handleToggleReady() {
    if (!currentRoom) {
      return;
    }

    const viewerSeat = currentRoom.seats.find(
      (seat) => seat.playerId === currentRoom.viewerPlayerId,
    );

    if (!viewerSeat) {
      return;
    }

    setPending(true);
    setState({});

    const response = await fetch(
      `/api/games/rooms/${currentRoom.roomId}/ready`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          ready: !viewerSeat.ready,
        }),
      },
    );

    if (!response.ok) {
      const problem = await readProblemDetail(
        response,
        'Unable to update ready state.',
      );
      setState({ error: problem.message });
      setPending(false);
      return;
    }

    const room = await readJson<GameRoomDto>(response);
    setRooms((existing) =>
      existing.map((existingRoom) =>
        existingRoom.roomId === room.roomId ? room : existingRoom,
      ),
    );
    setCurrentRoom(room);
    setPending(false);
  }

  async function handleStartRoom() {
    if (!currentRoom) {
      return;
    }

    setPending(true);
    setState({});

    const response = await fetch(
      `/api/games/rooms/${currentRoom.roomId}/start`,
      {
        method: 'POST',
      },
    );

    if (!response.ok) {
      const problem = await readProblemDetail(
        response,
        'Unable to start lobby.',
      );
      setState({ error: problem.message });
      setPending(false);
      return;
    }

    const room = await readJson<GameRoomDto>(response);
    setRooms((existing) =>
      existing.map((existingRoom) =>
        existingRoom.roomId === room.roomId ? room : existingRoom,
      ),
    );
    setCurrentRoom(null);
    setState({ announcement: labels.startedGameStatus });
    replaceRoomUrl(room.roomId);

    if (room.activeMatchId) {
      const snapshot = await loadMatchSnapshot(room.activeMatchId);
      setCurrentMatch(snapshot);
      await refresh(snapshot.matchId);
    } else {
      await refresh(undefined, room.roomId);
    }

    setPending(false);
  }

  async function handleCopyInviteLink() {
    if (!currentRoom || typeof navigator === 'undefined') {
      return;
    }

    const inviteUrl = buildInviteUrl(currentRoom.roomId);

    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(inviteUrl);
      setState({ announcement: labels.copyInviteStatus });
      return;
    }

    setState({ announcement: inviteUrl });
  }

  async function handleResume(matchId: string) {
    setPending(true);
    setState({});

    try {
      const snapshot = await loadMatchSnapshot(matchId);
      setCurrentMatch(snapshot);
      setCurrentRoom(null);
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

    if (snapshot.status !== 'active') {
      if (snapshot.status === 'completed') {
        setState({ announcement: labels.completedMatchStatus });
      }
      await refresh(snapshot.matchId);
    }

    setPending(false);
  }

  function resolveDirectPlay(cardId: string) {
    if (!currentMatch || pending || currentMatch.status !== 'active') {
      return null;
    }

    return chooseDirectPlayAction({
      actionCandidates: currentMatch.view.legalActions,
      activeColor: currentMatch.view.activeColor,
      cardId,
      players: currentMatch.view.players,
      viewerPlayer,
    });
  }

  async function handleDirectCardPlay(cardId: string) {
    const action = resolveDirectPlay(cardId);

    if (!action) {
      return;
    }

    await handleSubmitMove(action.move);
  }

  function handleCardDragStart(
    event: DragEvent<HTMLDivElement>,
    cardId: string,
  ) {
    if (!resolveDirectPlay(cardId)) {
      event.preventDefault();
      return;
    }

    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', cardId);
    setDraggedCardId(cardId);
    setIsDiscardDropActive(false);
  }

  function handleCardDragEnd() {
    setDraggedCardId(null);
    setIsDiscardDropActive(false);
  }

  function handleDiscardDragOver(event: DragEvent<HTMLDivElement>) {
    if (!draggedCardId || !resolveDirectPlay(draggedCardId)) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setIsDiscardDropActive(true);
  }

  function handleDiscardDragLeave() {
    setIsDiscardDropActive(false);
  }

  async function handleDiscardDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const cardId = event.dataTransfer.getData('text/plain') || draggedCardId;

    setIsDiscardDropActive(false);
    setDraggedCardId(null);

    if (!cardId) {
      return;
    }

    await handleDirectCardPlay(cardId);
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
    replaceRoomUrl(null);
    await refresh();
    setPending(false);
  }

  const openRooms = getOpenRooms(rooms);
  const inviteLink = currentRoom ? buildInviteUrl(currentRoom.roomId) : '';
  const viewerSeat = currentRoom?.seats.find(
    (seat) => seat.playerId === currentRoom.viewerPlayerId,
  );
  const hasFocusedSession = currentRoom !== null || currentMatch !== null;
  const currentReplayHref = currentMatch
    ? buildReplayHref(pastGamesHref, currentMatch.matchId)
    : null;

  return (
    <section className="space-y-6">
      {!hasFocusedSession ? (
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
      ) : null}

      <div
        className={
          hasFocusedSession
            ? 'grid gap-4'
            : 'grid gap-4 xl:grid-cols-[0.9fr_1.1fr]'
        }
      >
        {!hasFocusedSession ? (
          <article className="rounded-[1.75rem] border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            {inviteRoomId && !currentRoom ? (
              <div className="space-y-6">
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold text-zinc-950 dark:text-zinc-50">
                    {labels.inviteTitle}
                  </h2>
                  <p className="text-sm text-zinc-600 dark:text-zinc-300">
                    {labels.inviteDescription}
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

                <button
                  type="button"
                  className={buttonVariants({ variant: 'default' })}
                  disabled={pending}
                  onClick={() => {
                    void handleJoinInvite();
                  }}
                >
                  {labels.joinAction}
                </button>
              </div>
            ) : (
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

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">
                    {labels.roomSizeLabel}
                    <select
                      className="mt-2 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-base text-zinc-950 outline-none transition focus:border-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
                      value={roomSize}
                      onChange={(event) => {
                        const nextRoomSize = event.target.value;
                        setRoomSize(nextRoomSize);
                        setBotCount((current) =>
                          String(
                            Math.min(
                              Number(current),
                              Math.max(Number(nextRoomSize) - 1, 0),
                            ),
                          ),
                        );
                      }}
                    >
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="4">4</option>
                    </select>
                  </label>

                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">
                    {labels.botAmountLabel}
                    <select
                      className="mt-2 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-base text-zinc-950 outline-none transition focus:border-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
                      value={botCount}
                      onChange={(event) => {
                        setBotCount(event.target.value);
                      }}
                    >
                      {Array.from(
                        { length: Math.max(Number(roomSize), 2) },
                        (_, index) => index,
                      )
                        .filter((value) => value < Number(roomSize))
                        .map((value) => (
                          <option key={value} value={String(value)}>
                            {value}
                          </option>
                        ))}
                    </select>
                  </label>
                </div>

                <p className="text-sm text-zinc-600 dark:text-zinc-300">
                  {labels.botAmountHint}
                </p>

                <button
                  type="button"
                  className={buttonVariants({ variant: 'default' })}
                  disabled={pending}
                  onClick={() => {
                    void handleCreateLobby();
                  }}
                >
                  {labels.createAction}
                </button>
              </div>
            )}

            <div className="mt-8 space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                {labels.openLobbiesTitle}
              </h3>
              {openRooms.length > 0 ? (
                openRooms.map((room) => (
                  <div
                    key={room.roomId}
                    className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium text-zinc-950 dark:text-zinc-50">
                          {room.roomName}
                        </p>
                        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                          {room.seats
                            .map((seat) => seat.displayName)
                            .filter(Boolean)
                            .join(', ')}
                        </p>
                        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                          {labels.reservedBotsLabel}: {room.botCount}
                        </p>
                      </div>
                      <button
                        type="button"
                        className={buttonVariants({ variant: 'outline' })}
                        disabled={pending}
                        onClick={() => {
                          replaceRoomUrl(room.roomId);
                          setCurrentRoom(room);
                          setCurrentMatch(null);
                        }}
                      >
                        {labels.resumeAction}
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-zinc-600 dark:text-zinc-300">
                  {labels.emptyOpenLobbies}
                </p>
              )}
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
        ) : null}

        <article
          className={`rounded-[1.75rem] border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950 ${
            hasFocusedSession ? 'p-4 sm:p-6 xl:p-8' : 'p-6'
          }`}
        >
          {hasFocusedSession ? (
            <div className="mb-6 flex flex-wrap gap-3">
              <a
                href={pastGamesHref}
                className={buttonVariants({ variant: 'outline' })}
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
          ) : null}

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

              <CardTable
                eyebrow={labels.activeMatchTitle}
                subtitle={
                  currentMatch.view.matchResultBanner ??
                  `${currentMatch.view.drawPileCount} cards remain in the draw pile.`
                }
                title={currentMatch.view.status}
                className={hasFocusedSession ? 'min-h-[44rem]' : undefined}
                tone={
                  currentMatch.view.activeColor === 'green'
                    ? 'emerald'
                    : currentMatch.view.activeColor === 'blue'
                      ? 'midnight'
                      : 'crimson'
                }
              >
                <div className="flex min-h-[36rem] flex-col justify-between gap-6">
                  <div
                    className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
                    data-testid="uno-opponents"
                  >
                    {opponentPlayers.map((player: UnoMatchPlayerView) => {
                      const hiddenCount = Math.max(
                        player.handCount - player.visibleCards.length,
                        0,
                      );

                      return (
                        <div
                          key={player.playerId}
                          className="rounded-[1.4rem] border border-white/12 bg-white/8 p-4 backdrop-blur-sm"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-2">
                              <p className="truncate font-medium text-white">
                                {player.displayName}
                              </p>
                              {player.isActive ? (
                                <span className="rounded-full border border-emerald-300/40 bg-emerald-400/15 px-2 py-0.5 text-xs font-medium text-emerald-100">
                                  Active
                                </span>
                              ) : null}
                            </div>
                            <span className="text-sm text-white/72">
                              {player.handCount} cards
                            </span>
                          </div>

                          <UnoHandPreview
                            className="mt-4"
                            hiddenCount={hiddenCount}
                            label={player.displayName}
                            visibleCards={player.visibleCards}
                          />
                        </div>
                      );
                    })}
                  </div>

                  <div
                    className="mx-auto grid w-full max-w-5xl gap-4"
                    data-testid="uno-center-piles"
                  >
                    <div className="rounded-[1.4rem] border border-white/12 bg-white/8 p-4 backdrop-blur-sm">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/65">
                            Active color
                          </p>
                          <div className="mt-3">
                            <UnoColorBadge
                              color={currentMatch.view.activeColor}
                            />
                          </div>
                        </div>
                        {currentMatch.view.pendingDrawAmount > 0 ? (
                          <span className="rounded-full border border-white/15 px-3 py-1 text-xs font-medium text-white/72">
                            Pending draw: {currentMatch.view.pendingDrawAmount}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="rounded-[1.4rem] border border-white/12 bg-white/8 p-4 backdrop-blur-sm">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/65">
                          Draw pile
                        </p>
                        <div className="mt-4 flex justify-center">
                          <HiddenUnoCardStack
                            cardCount={currentMatch.view.drawPileCount}
                            label="Draw pile"
                          />
                        </div>
                      </div>

                      <div className="rounded-[1.4rem] border border-white/12 bg-white/8 p-4 backdrop-blur-sm">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/65">
                              Discard pile
                            </p>
                            <p className="mt-2 text-sm text-white/72">
                              Top card sets the current color and legal plays.
                              Drop a card here to play it.
                            </p>
                          </div>
                          <span className="rounded-full border border-white/15 px-3 py-1 text-xs font-medium text-white/72">
                            {currentMatch.view.discardTop?.label ??
                              'No discard'}
                          </span>
                        </div>
                        <div
                          aria-label="Discard pile drop target"
                          className={`mt-4 flex justify-center rounded-[1.2rem] border border-dashed px-4 py-5 transition ${
                            isDiscardDropActive
                              ? 'border-emerald-300/60 bg-emerald-400/10'
                              : 'border-white/10'
                          }`}
                          data-testid="uno-discard-drop-zone"
                          onDragLeave={handleDiscardDragLeave}
                          onDragOver={handleDiscardDragOver}
                          onDrop={(event) => {
                            void handleDiscardDrop(event);
                          }}
                        >
                          {currentMatch.view.discardTop ? (
                            <UnoCardVisual
                              card={currentMatch.view.discardTop}
                              selected
                            />
                          ) : (
                            <p className="text-sm text-white/72">
                              No discard card available.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {viewerPlayer ? (
                    <div
                      className="rounded-[1.4rem] border border-sky-300/30 bg-sky-400/10 p-4 backdrop-blur-sm"
                      data-testid="uno-viewer-seat"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <p className="truncate font-medium text-white">
                            {viewerPlayer.displayName}
                          </p>
                          <span className="rounded-full border border-sky-300/40 bg-sky-400/15 px-2 py-0.5 text-xs font-medium text-sky-100">
                            You
                          </span>
                          {viewerPlayer.isActive ? (
                            <span className="rounded-full border border-emerald-300/40 bg-emerald-400/15 px-2 py-0.5 text-xs font-medium text-emerald-100">
                              Active
                            </span>
                          ) : null}
                        </div>
                        <span className="text-sm text-white/72">
                          {viewerPlayer.handCount} cards
                        </span>
                      </div>

                      <UnoHandPreview
                        className="mt-4"
                        getCardProps={(card) => {
                          const isPlayable =
                            !pending &&
                            currentMatch.status === 'active' &&
                            directPlayableCardIds.has(card.id);

                          return {
                            'aria-disabled': !isPlayable,
                            className: isPlayable
                              ? draggedCardId === card.id
                                ? 'cursor-grabbing opacity-70'
                                : 'cursor-grab'
                              : 'opacity-80',
                            draggable: isPlayable,
                            interactive: isPlayable,
                            onClick: isPlayable
                              ? () => {
                                  void handleDirectCardPlay(card.id);
                                }
                              : undefined,
                            onDragEnd: isPlayable
                              ? () => {
                                  handleCardDragEnd();
                                }
                              : undefined,
                            onDragStart: isPlayable
                              ? (event: DragEvent<HTMLDivElement>) => {
                                  handleCardDragStart(event, card.id);
                                }
                              : undefined,
                            onKeyDown: isPlayable
                              ? (event: KeyboardEvent<HTMLDivElement>) => {
                                  if (
                                    event.key === 'Enter' ||
                                    event.key === ' '
                                  ) {
                                    event.preventDefault();
                                    void handleDirectCardPlay(card.id);
                                  }
                                }
                              : undefined,
                            role: isPlayable ? 'button' : 'img',
                            tabIndex: isPlayable ? 0 : -1,
                          };
                        }}
                        hiddenCount={Math.max(
                          viewerPlayer.handCount -
                            viewerPlayer.visibleCards.length,
                          0,
                        )}
                        label={viewerPlayer.displayName}
                        size="md"
                        visibleCards={viewerPlayer.visibleCards}
                      />
                    </div>
                  ) : null}
                </div>
              </CardTable>

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
              ) : currentReplayHref ? (
                <a
                  href={currentReplayHref}
                  className={buttonVariants({ variant: 'default' })}
                >
                  {labels.reviewReplayAction}
                </a>
              ) : null}
            </div>
          ) : currentRoom ? (
            <div className="space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
                    {labels.lobbyReadyTitle}
                  </h2>
                  <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                    {currentRoom.roomName}
                  </p>
                </div>
                <span className="rounded-full border border-zinc-300 px-4 py-2 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
                  {currentRoom.status}
                </span>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">
                  {labels.inviteLinkLabel}
                  <input
                    readOnly
                    value={inviteLink}
                    className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-950 outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                  />
                </label>
                <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">
                  {labels.shareInviteHint}
                </p>
                <button
                  type="button"
                  className={`${buttonVariants({ variant: 'outline' })} mt-4`}
                  disabled={pending}
                  onClick={() => {
                    void handleCopyInviteLink();
                  }}
                >
                  {labels.copyInviteAction}
                </button>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                    {labels.reservedBotsLabel}: {currentRoom.botCount}
                  </p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-300">
                    {labels.roomSizeLabel}: {currentRoom.maxPlayers}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {currentRoom.seats.map((seat) => (
                  <div
                    key={seat.seat}
                    className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-zinc-950 dark:text-zinc-50">
                        {seat.displayName ?? `Seat ${seat.seat}`}
                      </p>
                      {seat.playerId === currentRoom.hostPlayerId ? (
                        <span className="rounded-full border border-zinc-300 px-3 py-1 text-xs text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
                          {labels.hostBadge}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                      {seat.ready ? 'Ready' : 'Waiting'}
                    </p>
                  </div>
                ))}
              </div>

              {currentRoom.canStart ? (
                <p className="text-sm text-emerald-600 dark:text-emerald-400">
                  {labels.readyToStart}
                </p>
              ) : null}

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  className={buttonVariants({ variant: 'outline' })}
                  disabled={pending || !viewerSeat}
                  onClick={() => {
                    void handleToggleReady();
                  }}
                >
                  {labels.readyAction}
                </button>
                {currentRoom.viewerIsHost ? (
                  <button
                    type="button"
                    className={buttonVariants({ variant: 'default' })}
                    disabled={pending || !currentRoom.canStart}
                    onClick={() => {
                      void handleStartRoom();
                    }}
                  >
                    {labels.startGame}
                  </button>
                ) : null}
              </div>
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

          {hasFocusedSession && state.error ? (
            <p className="mt-6 text-sm text-red-600 dark:text-red-400">
              {state.error}
            </p>
          ) : null}
          {hasFocusedSession && state.announcement ? (
            <p className="mt-3 text-sm text-emerald-600 dark:text-emerald-400">
              {state.announcement}
            </p>
          ) : null}
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
