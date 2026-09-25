import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createGameServerExternalSimulationEndpoint,
  decodeGameServerExternalSimulationResponse,
  encodeGameServerExternalSimulationRequest,
  fromGameServerHex,
  gameServerSnapshotHash,
  toGameServerHex,
  toGameServerU64Hex,
} from '../src/index.ts';

test('external simulation request bytes match the Rust v1 wire fixtures', () => {
  assert.equal(
    toGameServerHex(
      encodeGameServerExternalSimulationRequest({
        operation: 'apply-command',
        playerId: 1,
        sequence: 2,
        payload: Uint8Array.of(0xaa),
      }),
    ),
    '010400000001000000020001aa',
  );
  assert.equal(
    toGameServerHex(
      encodeGameServerExternalSimulationRequest({
        operation: 'advance-tick',
        targetTick: 7n,
      }),
    ),
    '01050000000000000007',
  );
});

test('snapshot hash matches the Rust FNV-1a fixture', () => {
  const response = decodeGameServerExternalSimulationResponse(
    fromGameServerHex('0106000000000000000735594afc4eab92da0001bb'),
  );

  assert.equal(response.operation, 'snapshot');
  assert.equal(response.response.kind, 'snapshot');

  if (response.response.kind !== 'snapshot') {
    throw new Error('Expected snapshot response');
  }

  assert.equal(response.response.snapshot.tick, 7n);
  assert.equal(
    toGameServerU64Hex(response.response.snapshot.stateHash),
    '35594afc4eab92da',
  );
  assert.equal(
    response.response.snapshot.stateHash,
    gameServerSnapshotHash(7n, Uint8Array.of(0xbb)),
  );
});

test('advance requests are idempotent at the endpoint boundary', () => {
  let tick = 0n;
  const endpoint = createGameServerExternalSimulationEndpoint({
    describe: () => ({
      tickHz: 20,
      maxPlayers: 2,
      currentTick: tick,
      snapshotScope: 'shared',
    }),
    addPlayer() {},
    removePlayer() {
      return true;
    },
    applyCommand() {},
    advanceTick(targetTick) {
      if (targetTick === tick) {
        return tick;
      }
      if (targetTick !== tick + 1n) {
        throw new Error('Unexpected target tick');
      }
      tick = targetTick;
      return tick;
    },
    snapshot: () => ({ tick, payload: new Uint8Array() }),
    snapshotFor: () => ({ tick, payload: new Uint8Array() }),
  });

  const request = encodeGameServerExternalSimulationRequest({
    operation: 'advance-tick',
    targetTick: 1n,
  });
  const first = endpoint.exchange(request);
  const retry = endpoint.exchange(request);

  assert.deepEqual(retry, first);
  assert.equal(tick, 1n);
});
