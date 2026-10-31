import type { GameDefinition } from '@repo/game-contracts';

import type {
  Phase10CatalogEntry,
  Phase10ExamplePreset,
  Phase10ExamplePresetId,
} from './types.ts';

export const PHASE_10_GAME_VERSION = '0.1.0';
export const PHASE_10_RULESET_VERSION = 'phase-10-phase-1-v1';

export const phase10Definition: GameDefinition = {
  gameId: 'phase-10',
  name: 'Phase 10',
  minPlayers: 2,
  maxPlayers: 4,
  supportsLocal: true,
  supportsOnline: false,
  tags: ['card-game', 'rummy', 'local'],
};

export const phase10ExamplePresets: readonly Phase10ExamplePreset[] = [
  {
    id: 'hotseat-duo',
    label: 'Hotseat duo',
    hotseat: true,
    seats: [
      {
        playerId: 'p1',
        displayName: 'Player One',
        seat: 1,
        controller: 'human',
      },
      {
        playerId: 'p2',
        displayName: 'Player Two',
        seat: 2,
        controller: 'human',
      },
    ],
  },
  {
    id: 'mixed-table',
    label: 'Mixed table',
    hotseat: true,
    seats: [
      {
        playerId: 'p1',
        displayName: 'Player One',
        seat: 1,
        controller: 'human',
      },
      { playerId: 'p2', displayName: 'Run Bot', seat: 2, controller: 'bot' },
      {
        playerId: 'p3',
        displayName: 'Player Two',
        seat: 3,
        controller: 'human',
      },
      { playerId: 'p4', displayName: 'Set Bot', seat: 4, controller: 'bot' },
    ],
  },
  {
    id: 'bot-duel',
    label: 'Bot duel',
    hotseat: false,
    seats: [
      {
        playerId: 'p1',
        displayName: 'Player One',
        seat: 1,
        controller: 'human',
      },
      { playerId: 'p2', displayName: 'Phase Bot', seat: 2, controller: 'bot' },
    ],
  },
] as const;

export function getPhase10ExamplePreset(
  presetId: Phase10ExamplePresetId,
): Phase10ExamplePreset {
  return (
    phase10ExamplePresets.find((preset) => preset.id === presetId) ??
    phase10ExamplePresets[0]!
  );
}

export const phase10CatalogEntry: Phase10CatalogEntry = {
  definition: phase10Definition,
  metadata: {
    presets: phase10ExamplePresets,
    route: '/phase-10',
    supportsBots: true,
  },
};
