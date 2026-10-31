import type { GameDefinition, GameMove, PlayerId } from '@repo/game-contracts';
import type { SessionParticipant } from '@repo/game-session';

export type Phase10Color = 'red' | 'yellow' | 'green' | 'blue';
export type Phase10CardKind = 'number' | 'wild' | 'skip';

export type Phase10Card = {
  color: Phase10Color | 'wild' | 'skip';
  id: string;
  kind: Phase10CardKind;
  label: string;
  value?: number;
};

export type Phase10Rules = {
  allowHitting: boolean;
  allowSkipping: boolean;
  handSize: number;
  setCount: number;
  setSize: number;
};

export type Phase10PhaseRequirement =
  | {
      size: number;
      type: 'set';
    }
  | {
      size: number;
      type: 'color';
    }
  | {
      size: number;
      type: 'run';
    };

export type Phase10PhaseDefinition = {
  id: string;
  label: string;
  requirements?: readonly Phase10PhaseRequirement[];
  setCount?: number;
  setSize?: number;
};

export type Phase10Setup = {
  phases?: readonly Phase10PhaseDefinition[];
  rules?: Partial<Phase10Rules>;
  seed?: number | string;
};

export type Phase10LaidGroup = {
  cards: readonly Phase10Card[];
  cardIds: readonly string[];
  color?: Phase10Color | null;
  label: string;
  runEnd?: number | null;
  runStart?: number | null;
  type: Phase10PhaseRequirement['type'];
  value?: number | null;
};

export type Phase10PlayerPhaseState = {
  label: string;
  laidGroups: readonly Phase10LaidGroup[] | null;
  phaseIndex: number;
  phaseNumber: number;
};

export type Phase10State = {
  discardPile: readonly Phase10Card[];
  drawPile: readonly Phase10Card[];
  drawnCardThisTurn: boolean;
  hands: Record<PlayerId, readonly Phase10Card[]>;
  lastEvent: string;
  phaseDefinitions: readonly Phase10PhaseDefinition[];
  phases: Record<PlayerId, Phase10PlayerPhaseState>;
  round: number;
  rules: Phase10Rules;
  seed: number | string;
  skippedPlayerIds: readonly PlayerId[];
  winnerPlayerId: PlayerId | null;
};

export type Phase10DrawCardMove = GameMove<{
  source: 'discard' | 'draw';
}> & {
  kind: 'draw-card';
};

export type Phase10LayPhaseMove = GameMove<{
  groups: readonly (readonly string[])[];
}> & {
  kind: 'lay-phase';
};

export type Phase10HitPhaseMove = GameMove<{
  cardId: string;
  groupIndex: number;
  targetPlayerId: PlayerId;
}> & {
  kind: 'hit-phase';
};

export type Phase10DiscardCardMove = GameMove<{
  cardId: string;
  targetPlayerId?: PlayerId;
}> & {
  kind: 'discard-card';
};

export type Phase10Move =
  | Phase10DrawCardMove
  | Phase10LayPhaseMove
  | Phase10HitPhaseMove
  | Phase10DiscardCardMove;

export type Phase10PlayerView = {
  activePlayerId: PlayerId;
  discardTop: Phase10Card | null;
  drawPileCount: number;
  legalActions: ReadonlyArray<{
    id: string;
    label: string;
    move: Phase10Move;
  }>;
  matchResultBanner: string | null;
  phaseOrder: readonly string[];
  phaseLabel: string;
  players: ReadonlyArray<{
    controller: SessionParticipant['controller'];
    displayName: string;
    handCount: number;
    isActive: boolean;
    isViewer: boolean;
    laidGroups: readonly Phase10LaidGroup[];
    phaseComplete: boolean;
    phaseLabel: string;
    phaseNumber: number;
    playerId: PlayerId;
    skipped: boolean;
    visibleCards: readonly Phase10Card[];
  }>;
  round: number;
  status: string;
  viewerPlayerId: PlayerId | null;
};

export type Phase10ExamplePresetId = 'hotseat-duo' | 'mixed-table' | 'bot-duel';

export type Phase10ExamplePreset = {
  hotseat: boolean;
  id: Phase10ExamplePresetId;
  label: string;
  seats: readonly SessionParticipant[];
};

export type Phase10CatalogMetadata = {
  presets: readonly Phase10ExamplePreset[];
  route: '/phase-10';
  supportsBots: true;
};

export type Phase10CatalogEntry = {
  definition: GameDefinition;
  metadata: Phase10CatalogMetadata;
};
