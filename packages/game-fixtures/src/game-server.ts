import {
  createGameServerExternalSimulationEndpoint,
  decodeGameServerExternalSimulationResponse,
  encodeGameServerExternalSimulationRequest,
  gameServerCanonicalJsonBytes,
  gameServerSnapshotHash,
  toGameServerHex,
  toGameServerU64Hex,
  type GameServerExternalSimulationRequest,
} from '@repo/game-server-bridge';
import { createServerGameSession } from '@repo/game-session';
import type {
  UnoEvent,
  UnoMove,
  UnoSetup,
  UnoState,
} from '@repo/game-uno';

import { engineFixtureCases } from './cases.ts';
import type { EngineFixtureCase } from './harness.ts';

const FIXTURE_ID = 'uno/replay-summary';
const MATCH_ID = 'game-server/uno-replay-v1';
const TICK_HZ = 1;

type UnoFixture = EngineFixtureCase<
  UnoSetup,
  UnoState,
  UnoMove,
  UnoEvent
>;

type TranscriptEntry = {
  operation: GameServerExternalSimulationRequest['operation'];
  requestHex: string;
  responseHex: string;
};

function getUnoReplayFixture(): UnoFixture {
  const fixture = engineFixtureCases.find(
    (candidate) => candidate.id === FIXTURE_ID,
  );

  if (!fixture || fixture.gameId !== 'uno-style') {
    throw new Error('UNO replay fixture is unavailable');
  }

  return fixture as UnoFixture;
}

function createFixtureClock(): () => string {
  let second = 0;

  return () => {
    const currentSecond = second;
    second += 1;
    return new Date(
      Date.UTC(2026, 3, 21, 12, 0, currentSecond),
    ).toISOString();
  };
}

function numericPlayerId(gamePlayerId: string): number {
  switch (gamePlayerId) {
    case 'p1':
      return 1;
    case 'p2':
      return 2;
    default:
      throw new Error('Fixture player is not mapped to game-server: ' + gamePlayerId);
  }
}

function gamePlayerId(serverPlayerId: number): 'p1' | 'p2' {
  switch (serverPlayerId) {
    case 1:
      return 'p1';
    case 2:
      return 'p2';
    default:
      throw new Error(
        'game-server player is not mapped to the UNO fixture: ' +
          serverPlayerId,
      );
  }
}

function createFixtureRuntime() {
  const fixture = getUnoReplayFixture();
  const session = createServerGameSession({
    adapter: fixture.adapter,
    matchId: MATCH_ID,
    now: createFixtureClock(),
    participants: fixture.players,
    setup: fixture.setup,
  });
  const joinedPlayers = new Set<number>();
  let tick = 0n;

  const endpoint = createGameServerExternalSimulationEndpoint({
    describe() {
      return {
        tickHz: TICK_HZ,
        maxPlayers: fixture.players.length,
        currentTick: tick,
        snapshotScope: 'shared',
      };
    },
    addPlayer(playerId) {
      const expectedPlayerId = numericPlayerId(gamePlayerId(playerId));

      if (expectedPlayerId !== playerId) {
        throw new Error('Player mapping is not reversible');
      }
      if (joinedPlayers.has(playerId)) {
        throw new Error('Player is already joined');
      }

      joinedPlayers.add(playerId);
    },
    removePlayer(playerId) {
      return joinedPlayers.delete(playerId);
    },
    applyCommand(input) {
      if (!joinedPlayers.has(input.playerId)) {
        throw new Error('Command addressed a player that has not joined');
      }

      const expectedSequence = session.getReplay().acceptedMoves.length + 1;
      if (input.sequence !== expectedSequence) {
        throw new Error(
          'Expected command sequence ' +
            expectedSequence +
            ', received ' +
            input.sequence,
        );
      }

      const decoded = JSON.parse(new TextDecoder().decode(input.payload));
      const move = fixture.adapter.validateMove
        ? fixture.adapter.validateMove(decoded)
        : (decoded as UnoMove);
      const expectedGamePlayerId = gamePlayerId(input.playerId);

      if (move.playerId !== expectedGamePlayerId) {
        throw new Error(
          'Command player ' +
            move.playerId +
            ' does not match game-server player ' +
            input.playerId,
        );
      }

      session.submitMove(move);
    },
    advanceTick(targetTick) {
      if (targetTick === tick) {
        return tick;
      }
      if (targetTick !== tick + 1n) {
        throw new Error(
          'Target tick ' +
            targetTick +
            ' cannot follow current tick ' +
            tick,
        );
      }

      tick = targetTick;
      return tick;
    },
    snapshot() {
      return {
        tick,
        payload: gameServerCanonicalJsonBytes(session.getReplay()),
      };
    },
    snapshotFor() {
      throw new Error('UNO convergence fixture uses shared snapshots');
    },
  });

  return { endpoint, fixture, session };
}

function exchange(
  endpoint: ReturnType<typeof createGameServerExternalSimulationEndpoint>,
  transcript: TranscriptEntry[],
  request: GameServerExternalSimulationRequest,
): Uint8Array {
  const requestBytes = encodeGameServerExternalSimulationRequest(request);
  const responseBytes = endpoint.exchange(requestBytes);

  transcript.push({
    operation: request.operation,
    requestHex: toGameServerHex(requestBytes),
    responseHex: toGameServerHex(responseBytes),
  });

  const decoded = decodeGameServerExternalSimulationResponse(responseBytes);
  if (decoded.operation !== request.operation) {
    throw new Error(
      'Response operation ' +
        decoded.operation +
        ' does not match request ' +
        request.operation,
    );
  }
  if (decoded.response.kind === 'rejected') {
    throw new Error(
      request.operation + ' was rejected: ' + decoded.response.message,
    );
  }

  return responseBytes;
}

export function createUnoGameServerConvergenceFixture(): string {
  const { endpoint, fixture, session } = createFixtureRuntime();
  const transcript: TranscriptEntry[] = [];

  exchange(endpoint, transcript, { operation: 'describe' });

  for (const player of fixture.players) {
    exchange(endpoint, transcript, {
      operation: 'add-player',
      playerId: numericPlayerId(player.playerId),
    });
  }

  const step = fixture.steps[0];
  if (!step || fixture.steps.length !== 1) {
    throw new Error('UNO replay fixture must contain exactly one move');
  }

  const before = session.getSnapshot();
  const move = step.chooseMove({
    state: before.match,
    legalMoves: before.legalMoves,
  });
  const commandPayload = gameServerCanonicalJsonBytes(move);
  const commandPlayerId = numericPlayerId(move.playerId);

  exchange(endpoint, transcript, {
    operation: 'apply-command',
    playerId: commandPlayerId,
    sequence: 1,
    payload: commandPayload,
  });
  exchange(endpoint, transcript, {
    operation: 'advance-tick',
    targetTick: 1n,
  });

  const checkpointResponse = exchange(endpoint, transcript, {
    operation: 'snapshot',
  });
  const finalResponse = exchange(endpoint, transcript, {
    operation: 'snapshot',
  });

  const checkpoint = decodeGameServerExternalSimulationResponse(
    checkpointResponse,
  ).response;
  const finalSnapshot =
    decodeGameServerExternalSimulationResponse(finalResponse).response;

  if (
    checkpoint.kind !== 'snapshot' ||
    finalSnapshot.kind !== 'snapshot'
  ) {
    throw new Error('Expected snapshot responses from the fixture endpoint');
  }

  const replay = session.getReplay();
  const localPayload = gameServerCanonicalJsonBytes(replay);
  const localFingerprint = gameServerSnapshotHash(1n, localPayload);

  if (
    checkpoint.snapshot.stateHash !== localFingerprint ||
    finalSnapshot.snapshot.stateHash !== localFingerprint
  ) {
    throw new Error(
      'External snapshot fingerprint diverged from the local replay fingerprint',
    );
  }

  const lines = [
    'schema=1',
    'source_repository=moritzbrantner/card-game-template',
    'source_fixture=' + FIXTURE_ID,
    'source_contract=game-server/external-simulation-v1',
    'protocol_version=1',
    'match_id=' + MATCH_ID,
    'tick_hz=' + TICK_HZ,
    ...fixture.players.map(
      (player) =>
        'player=' +
        numericPlayerId(player.playerId) +
        ':' +
        player.playerId,
    ),
    'command=' +
      commandPlayerId +
      ':1:' +
      toGameServerHex(commandPayload),
    'expected_final_tick=1',
    'expected_replay_fingerprint=' +
      toGameServerU64Hex(localFingerprint),
    'expected_accepted_move_count=' + replay.acceptedMoves.length,
    'expected_winner=' + (replay.result?.winnerIds[0] ?? ''),
    ...transcript.map(
      (entry) =>
        'exchange=' +
        entry.operation +
        ':' +
        entry.requestHex +
        ':' +
        entry.responseHex,
    ),
  ];

  return lines.join('\n') + '\n';
}
