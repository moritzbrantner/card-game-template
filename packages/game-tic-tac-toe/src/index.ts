import type {
  GameDefinition,
  GameMove,
  MatchResult,
  MatchState,
  PlayerId,
} from '@repo/game-contracts';
import { areMovesEquivalent, type GameAdapter } from '@repo/game-engine';
import type {
  LocalGameSessionBot,
  LocalGameSessionProjectViewInput,
  SessionParticipant,
} from '@repo/game-session';

export type TicTacToeMark = 'X' | 'O';
export type TicTacToeCell = TicTacToeMark | null;

export type TicTacToeSetup = {
  startingPlayerId?: PlayerId;
};

export type TicTacToeState = {
  board: readonly TicTacToeCell[];
  lastEvent: string;
  marksByPlayer: Record<PlayerId, TicTacToeMark>;
  winnerPlayerId: PlayerId | null;
  winningLine: readonly number[] | null;
};

export type TicTacToeMove = GameMove<{
  cellIndex: number;
}> & {
  kind: 'place-mark';
};

export type TicTacToePlayerView = {
  board: readonly TicTacToeCell[];
  cells: ReadonlyArray<{
    index: number;
    value: TicTacToeCell;
    move: TicTacToeMove | null;
  }>;
  legalActions: ReadonlyArray<{
    id: string;
    label: string;
    move: TicTacToeMove;
  }>;
  matchResultBanner: string | null;
  players: ReadonlyArray<{
    controller: SessionParticipant['controller'];
    displayName: string;
    isActive: boolean;
    isViewer: boolean;
    mark: TicTacToeMark;
    playerId: PlayerId;
  }>;
  status: string;
  viewerPlayerId: PlayerId | null;
  winningLine: readonly number[] | null;
};

export type TicTacToeExamplePresetId = 'classic-duel' | 'bot-duel';
export type TicTacToeExamplePreset = {
  hotseat: boolean;
  id: TicTacToeExamplePresetId;
  label: string;
  seats: readonly SessionParticipant[];
};

export type TicTacToeCatalogMetadata = {
  presets: readonly TicTacToeExamplePreset[];
  route: '/tic-tac-toe';
  supportsBots: true;
};

export type TicTacToeCatalogEntry = {
  definition: GameDefinition;
  metadata: TicTacToeCatalogMetadata;
};

export const ticTacToeDefinition: GameDefinition = {
  gameId: 'tic-tac-toe',
  name: 'Tic-Tac-Toe',
  minPlayers: 2,
  maxPlayers: 2,
  supportsLocal: true,
  supportsOnline: true,
  tags: ['board-game', 'grid', 'turn-based'],
};

const WINNING_LINES: readonly (readonly number[])[] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export const ticTacToeExamplePresets: readonly TicTacToeExamplePreset[] = [
  {
    hotseat: true,
    id: 'classic-duel',
    label: 'Classic duel',
    seats: [
      { playerId: 'p1', displayName: 'Alice', seat: 1, controller: 'human' },
      { playerId: 'p2', displayName: 'Bob', seat: 2, controller: 'human' },
    ],
  },
  {
    hotseat: false,
    id: 'bot-duel',
    label: 'Bot duel',
    seats: [
      { playerId: 'p1', displayName: 'Alice', seat: 1, controller: 'human' },
      { playerId: 'p2', displayName: 'Bot', seat: 2, controller: 'bot' },
    ],
  },
] as const;

export const ticTacToeCatalogEntry: TicTacToeCatalogEntry = {
  definition: ticTacToeDefinition,
  metadata: {
    presets: ticTacToeExamplePresets,
    route: '/tic-tac-toe',
    supportsBots: true,
  },
};

function emptyBoard(): readonly TicTacToeCell[] {
  return Array.from({ length: 9 }, () => null);
}

function resolveWinningLine(board: readonly TicTacToeCell[]) {
  return (
    WINNING_LINES.find((line) => {
      const first = line[0]!;
      const second = line[1]!;
      const third = line[2]!;
      const value = board[first];
      return value && value === board[second] && value === board[third];
    }) ?? null
  );
}

function isBoardFull(board: readonly TicTacToeCell[]) {
  return board.every((cell) => cell !== null);
}

function markForPlayer(
  state: MatchState<TicTacToeState>,
  playerId: PlayerId,
): TicTacToeMark {
  const mark = state.state.marksByPlayer[playerId];

  if (!mark) {
    throw new Error(`Unknown tic-tac-toe player ${playerId}`);
  }

  return mark;
}

export function getTicTacToeExamplePreset(id: TicTacToeExamplePresetId) {
  const preset = ticTacToeExamplePresets.find(
    (candidate) => candidate.id === id,
  );

  if (!preset) {
    throw new Error(`Unknown tic-tac-toe preset ${id}`);
  }

  return preset;
}

export function createTicTacToeAdapter(): GameAdapter<
  TicTacToeSetup,
  TicTacToeState,
  TicTacToeMove
> {
  return {
    definition: ticTacToeDefinition,
    metadata: {
      gameVersion: '1.0.0',
      rulesetVersion: 'classic-3x3-v1',
    },
    validateSetup(setup: unknown): TicTacToeSetup {
      if (setup === undefined || setup === null) {
        return {};
      }

      if (typeof setup !== 'object' || Array.isArray(setup)) {
        throw new TypeError('Tic-tac-toe setup must be an object.');
      }

      const value = setup as Record<string, unknown>;
      const startingPlayerId = value.startingPlayerId;

      if (
        startingPlayerId !== undefined &&
        typeof startingPlayerId !== 'string'
      ) {
        throw new TypeError('Tic-tac-toe startingPlayerId must be a string.');
      }

      return startingPlayerId ? { startingPlayerId } : {};
    },
    validateMove(move: unknown): TicTacToeMove {
      if (typeof move !== 'object' || move === null || Array.isArray(move)) {
        throw new TypeError('Tic-tac-toe move must be an object.');
      }

      const value = move as Record<string, unknown>;
      const payload = value.payload as Record<string, unknown> | undefined;

      if (!payload || typeof payload.cellIndex !== 'number') {
        throw new TypeError('Tic-tac-toe move requires a numeric cellIndex.');
      }

      return move as TicTacToeMove;
    },
    validateState(state) {
      if (state.players.length !== 2) {
        throw new Error('Tic-tac-toe requires exactly two players.');
      }

      if (state.state.board.length !== 9) {
        throw new Error('Tic-tac-toe board must contain nine cells.');
      }
    },
    createInitialState({
      executionMode,
      matchId,
      players,
      setup,
    }): MatchState<TicTacToeState> {
      const orderedPlayers = [...players].sort(
        (left, right) => left.seat - right.seat,
      );
      const [firstPlayer, secondPlayer] = orderedPlayers;

      if (!firstPlayer || !secondPlayer) {
        throw new Error('Tic-tac-toe requires two seated players.');
      }

      const activePlayerId =
        setup.startingPlayerId &&
        orderedPlayers.some(
          (player) => player.playerId === setup.startingPlayerId,
        )
          ? setup.startingPlayerId
          : firstPlayer.playerId;

      return {
        matchId,
        gameId: ticTacToeDefinition.gameId,
        players: orderedPlayers,
        activePlayerId,
        turn: 1,
        executionMode,
        state: {
          board: emptyBoard(),
          lastEvent: 'Match started',
          marksByPlayer: {
            [firstPlayer.playerId]: 'X',
            [secondPlayer.playerId]: 'O',
          },
          winnerPlayerId: null,
          winningLine: null,
        },
      };
    },
    listLegalMoves(state) {
      if (this.isMatchComplete(state)) {
        return [];
      }

      return state.state.board.flatMap((cell, cellIndex) =>
        cell === null
          ? [
              {
                playerId: state.activePlayerId,
                kind: 'place-mark' as const,
                createdAt: '2026-04-24T12:00:00.000Z',
                payload: { cellIndex },
              },
            ]
          : [],
      );
    },
    isLegalMove(state, move) {
      return this.listLegalMoves(state).some((candidate) =>
        areMovesEquivalent(candidate, move),
      );
    },
    applyMove(state, move) {
      const nextBoard = [...state.state.board];
      const mark = markForPlayer(state, move.playerId);

      nextBoard[move.payload.cellIndex] = mark;
      const winningLine = resolveWinningLine(nextBoard);
      const winnerPlayerId = winningLine ? move.playerId : null;
      const nextPlayerId =
        state.players.find((player) => player.playerId !== move.playerId)
          ?.playerId ?? move.playerId;

      return {
        ...state,
        activePlayerId:
          winnerPlayerId || isBoardFull(nextBoard)
            ? move.playerId
            : nextPlayerId,
        turn: state.turn + 1,
        state: {
          ...state.state,
          board: nextBoard,
          lastEvent: `${move.playerId} placed ${mark} at ${move.payload.cellIndex}`,
          winnerPlayerId,
          winningLine,
        },
      };
    },
    isMatchComplete(state) {
      return (
        Boolean(state.state.winnerPlayerId) || isBoardFull(state.state.board)
      );
    },
    getResult(state): MatchResult | null {
      if (!this.isMatchComplete(state)) {
        return null;
      }

      const winnerId = state.state.winnerPlayerId;
      const winnerIds = winnerId ? [winnerId] : [];
      const opponentId =
        state.players.find((player) => player.playerId !== winnerId)
          ?.playerId ?? winnerId;

      return {
        matchId: state.matchId,
        gameId: state.gameId,
        winnerIds,
        rankings: winnerIds.length
          ? [
              { playerId: winnerId!, position: 1 },
              {
                playerId: opponentId!,
                position: 2,
              },
            ]
          : state.players.map((player) => ({
              playerId: player.playerId,
              position: 1,
            })),
        finishedAt: '2026-04-24T12:00:09.000Z',
        executionMode: state.executionMode,
      };
    },
  };
}

export function projectTicTacToePlayerView(
  input: LocalGameSessionProjectViewInput<TicTacToeState, TicTacToeMove>,
): TicTacToePlayerView {
  return {
    board: input.state.state.board,
    cells: input.state.state.board.map((value, index) => ({
      index,
      value,
      move:
        input.selectedActorPlayerId && value === null
          ? (input.legalMoves.find(
              (move) => move.payload.cellIndex === index,
            ) ?? null)
          : null,
    })),
    legalActions: input.legalMoves.map((move) => ({
      id: `${move.kind}:${move.payload.cellIndex}`,
      label: `Place at ${move.payload.cellIndex + 1}`,
      move,
    })),
    matchResultBanner: input.matchResult
      ? input.matchResult.winnerIds.length > 0
        ? `${input.matchResult.winnerIds[0]} wins`
        : 'Draw'
      : null,
    players: input.participants.map((participant) => ({
      controller: participant.controller,
      displayName: participant.displayName,
      isActive: input.state.activePlayerId === participant.playerId,
      isViewer: input.viewerPlayerId === participant.playerId,
      mark: input.state.state.marksByPlayer[participant.playerId] ?? 'X',
      playerId: participant.playerId,
    })),
    status: input.matchResult
      ? input.matchResult.winnerIds.length > 0
        ? 'Match complete'
        : 'Board filled'
      : input.selectedActorPlayerId
        ? `${input.selectedActorPlayerId} to move`
        : 'Waiting',
    viewerPlayerId: input.viewerPlayerId,
    winningLine: input.state.state.winningLine,
  };
}

export function createTicTacToeBots(
  participants: readonly SessionParticipant[],
): Partial<
  Record<PlayerId, LocalGameSessionBot<TicTacToeState, TicTacToeMove>>
> {
  return Object.fromEntries(
    participants
      .filter((participant) => participant.controller === 'bot')
      .map((participant) => [
        participant.playerId,
        {
          chooseMove({ legalMoves }) {
            return legalMoves[0] ?? null;
          },
        } satisfies LocalGameSessionBot<TicTacToeState, TicTacToeMove>,
      ]),
  );
}
