import type { GameId, GameMove } from '@repo/game-contracts';
import type { GameAdapter } from '@repo/game-engine';
import { createPokerAdapter } from '@repo/game-poker';
import { createTcgAdapter } from '@repo/game-tcg';
import { createUnoAdapter } from '@repo/game-uno';

export type RegisteredGameAdapter = GameAdapter<unknown, unknown, GameMove>;

const registeredGameAdapterFactories = {
  'arcane-duel': () => createTcgAdapter() as unknown as RegisteredGameAdapter,
  'texas-holdem': () =>
    createPokerAdapter() as unknown as RegisteredGameAdapter,
  'uno-style': () => createUnoAdapter() as unknown as RegisteredGameAdapter,
} as const;

export function createRegisteredGameAdapter(
  gameId: GameId,
): RegisteredGameAdapter | null {
  const factory =
    registeredGameAdapterFactories[
      gameId as keyof typeof registeredGameAdapterFactories
    ];

  return factory?.() ?? null;
}

export function listRegisteredGameIds(): readonly GameId[] {
  return Object.keys(registeredGameAdapterFactories);
}
