import type { MatchResult, MatchState, PlayerId } from '@repo/game-contracts';
import { areMovesEquivalent, type GameAdapter } from '@repo/game-engine';

import {
  PHASE_10_GAME_VERSION,
  PHASE_10_RULESET_VERSION,
  phase10Definition,
} from './catalog.ts';
import { findPhaseGroups } from './groups.ts';
import {
  activePhase,
  dealRound,
  phaseDefinitionForPlayer,
  playerOrder,
  rankedPlayers,
  recycleDrawPile,
} from './match-state.ts';
import {
  applyDiscardMove,
  applyDrawMove,
  applyHitMove,
  applyLayMove,
  createDiscardMoves,
  createHitMoves,
  createLayMove,
} from './moves.ts';
import { parsePhase10Move, parsePhase10Setup } from './parsing.ts';
import {
  createPhaseDefinitions,
  defaultPhase10Rules,
} from './phase-definitions.ts';
import type {
  Phase10Move,
  Phase10PlayerPhaseState,
  Phase10Setup,
  Phase10State,
} from './types.ts';

export function createPhase10Adapter(): GameAdapter<
  Phase10Setup,
  Phase10State,
  Phase10Move
> {
  return {
    definition: phase10Definition,
    metadata: {
      gameVersion: PHASE_10_GAME_VERSION,
      rulesetVersion: PHASE_10_RULESET_VERSION,
    },
    validateSetup: parsePhase10Setup,
    validateMove: parsePhase10Move,
    createInitialState({
      executionMode,
      matchId,
      players,
      setup,
    }): MatchState<Phase10State> {
      if (players.length < 2 || players.length > 4) {
        throw new Error('Phase 10 supports between 2 and 4 players.');
      }

      const orderedPlayers = playerOrder(players);
      const rules = {
        ...defaultPhase10Rules,
        ...setup.rules,
      };
      const seed = setup.seed ?? 'phase-10';
      const phaseDefinitions = createPhaseDefinitions(rules, setup.phases);
      const deal = dealRound(orderedPlayers, rules.handSize, `${seed}:round:1`);
      const phases: Record<PlayerId, Phase10PlayerPhaseState> = {};
      const firstPhase = phaseDefinitions[0]!;

      for (const player of orderedPlayers) {
        phases[player.playerId] = {
          label: firstPhase.label,
          laidGroups: null,
          phaseIndex: 0,
          phaseNumber: 1,
        };
      }

      return {
        matchId,
        gameId: phase10Definition.gameId,
        players: orderedPlayers,
        activePlayerId: orderedPlayers[0]!.playerId,
        turn: 1,
        executionMode,
        state: {
          discardPile: deal.discardPile,
          drawPile: deal.drawPile,
          drawnCardThisTurn: false,
          hands: deal.hands,
          lastEvent: `${firstPhase.label} started`,
          phaseDefinitions,
          phases,
          round: 1,
          rules,
          seed,
          skippedPlayerIds: [],
          winnerPlayerId: null,
        },
      };
    },
    listLegalMoves(state): readonly Phase10Move[] {
      if (state.state.winnerPlayerId) {
        return [];
      }

      const activePlayerId = state.activePlayerId;
      const hand = state.state.hands[activePlayerId] ?? [];
      const phase = activePhase(state, activePlayerId);
      const phaseDefinition = phaseDefinitionForPlayer(state, activePlayerId);

      if (!state.state.drawnCardThisTurn) {
        const legalMoves: Phase10Move[] = [];
        const recyclableState = recycleDrawPile(state.state);

        if (recyclableState.drawPile.length > 0) {
          legalMoves.push({
            playerId: activePlayerId,
            kind: 'draw-card',
            createdAt: '2026-04-26T12:00:00.000Z',
            payload: {
              source: 'draw',
            },
          });
        }

        if (state.state.discardPile.length > 0) {
          legalMoves.push({
            playerId: activePlayerId,
            kind: 'draw-card',
            createdAt: '2026-04-26T12:00:00.000Z',
            payload: {
              source: 'discard',
            },
          });
        }

        return legalMoves;
      }

      const legalMoves: Phase10Move[] = [];

      if (!phase.laidGroups) {
        const groups = findPhaseGroups(hand, phaseDefinition);

        if (groups) {
          legalMoves.push(createLayMove(activePlayerId, groups));
        }
      }

      legalMoves.push(...createHitMoves(state, activePlayerId));
      legalMoves.push(...createDiscardMoves(state, activePlayerId));
      return legalMoves;
    },
    isLegalMove(state, move): boolean {
      return this.listLegalMoves(state).some((candidate) =>
        areMovesEquivalent(candidate, move),
      );
    },
    applyMove(state, move): MatchState<Phase10State> {
      if (move.kind === 'draw-card') {
        return applyDrawMove(state, move);
      }

      if (!state.state.drawnCardThisTurn) {
        throw new Error(
          'Players must draw before laying, hitting, or discarding.',
        );
      }

      if (move.kind === 'lay-phase') {
        return applyLayMove(state, move);
      }

      if (move.kind === 'hit-phase') {
        return applyHitMove(state, move);
      }

      return applyDiscardMove(state, move);
    },
    isMatchComplete(state) {
      return Boolean(state.state.winnerPlayerId);
    },
    getResult(state): MatchResult | null {
      if (!state.state.winnerPlayerId) {
        return null;
      }

      return {
        matchId: state.matchId,
        gameId: state.gameId,
        winnerIds: [state.state.winnerPlayerId],
        rankings: rankedPlayers(state),
        finishedAt: '2026-04-26T12:00:59.000Z',
        executionMode: state.executionMode,
      };
    },
  };
}
