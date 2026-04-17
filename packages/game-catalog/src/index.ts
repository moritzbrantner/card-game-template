import type { GameDefinition, GameId, MatchExecutionMode } from '../../game-contracts/src/index.ts';

export type GameCatalogEntry<TMetadata = Record<string, unknown>> = {
  definition: GameDefinition;
  metadata?: TMetadata;
};

export function createGameCatalog<TMetadata = Record<string, unknown>>(
  initialEntries: readonly GameCatalogEntry<TMetadata>[] = [],
) {
  const entries = new Map<GameId, GameCatalogEntry<TMetadata>>();

  for (const entry of initialEntries) {
    register(entry);
  }

  function register(entry: GameCatalogEntry<TMetadata>) {
    if (entries.has(entry.definition.gameId)) {
      throw new Error(`Duplicate game registration: ${entry.definition.gameId}`);
    }

    entries.set(entry.definition.gameId, entry);
    return entry;
  }

  return {
    register,
    get(gameId: GameId) {
      return entries.get(gameId) ?? null;
    },
    list() {
      return Array.from(entries.values()).sort((left, right) =>
        left.definition.name.localeCompare(right.definition.name),
      );
    },
    listPlayable(playerCount: number, executionMode: MatchExecutionMode) {
      return this.list().filter((entry) => {
        const supportsExecutionMode =
          executionMode === 'local' ? entry.definition.supportsLocal : entry.definition.supportsOnline;

        return (
          supportsExecutionMode &&
          playerCount >= entry.definition.minPlayers &&
          playerCount <= entry.definition.maxPlayers
        );
      });
    },
  };
}
