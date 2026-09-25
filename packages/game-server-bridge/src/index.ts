export const GAME_SERVER_EXTERNAL_SIMULATION_PROTOCOL_VERSION = 1;
export const GAME_SERVER_MAX_COMMAND_PAYLOAD_BYTES = 1024;
export const GAME_SERVER_MAX_SNAPSHOT_PAYLOAD_BYTES = 0xffff;
export const GAME_SERVER_MAX_EXTERNAL_SIMULATION_ERROR_BYTES = 1024;

const REQUEST_HEADER_BYTES = 2;
const RESPONSE_HEADER_BYTES = 3;
const COMMAND_REQUEST_FIXED_BYTES = REQUEST_HEADER_BYTES + 4 + 4 + 2;
const SNAPSHOT_RESPONSE_FIXED_BYTES = RESPONSE_HEADER_BYTES + 8 + 8 + 2;
const STATUS_OK = 0;
const STATUS_ERROR = 1;
const FNV_OFFSET_BASIS = 0xcbf29ce484222325n;
const FNV_PRIME = 0x100000001b3n;
const U64_MASK = 0xffffffffffffffffn;

export type GameServerSnapshotScope = 'shared' | 'player-scoped';

export type GameServerExternalSimulationOperation =
  | 'describe'
  | 'add-player'
  | 'remove-player'
  | 'apply-command'
  | 'advance-tick'
  | 'snapshot'
  | 'snapshot-for';

export type GameServerExternalSimulationDescriptor = {
  tickHz: number;
  maxPlayers: number;
  currentTick: bigint;
  snapshotScope: GameServerSnapshotScope;
};

export type GameServerExternalSimulationRequest =
  | { operation: 'describe' }
  | { operation: 'add-player'; playerId: number }
  | { operation: 'remove-player'; playerId: number }
  | {
      operation: 'apply-command';
      playerId: number;
      sequence: number;
      payload: Uint8Array;
    }
  | { operation: 'advance-tick'; targetTick: bigint }
  | { operation: 'snapshot' }
  | { operation: 'snapshot-for'; playerId: number };

export type GameServerExternalSimulationSnapshot = {
  tick: bigint;
  stateHash: bigint;
  payload: Uint8Array;
};

export type GameServerExternalSimulationResponse =
  | { kind: 'descriptor'; descriptor: GameServerExternalSimulationDescriptor }
  | { kind: 'acknowledged' }
  | { kind: 'player-removed'; removed: boolean }
  | { kind: 'tick-advanced'; tick: bigint }
  | { kind: 'snapshot'; snapshot: GameServerExternalSimulationSnapshot }
  | { kind: 'rejected'; message: string };

export type GameServerExternalSimulationHandler = {
  describe(): GameServerExternalSimulationDescriptor;
  addPlayer(playerId: number): void;
  removePlayer(playerId: number): boolean;
  applyCommand(input: {
    playerId: number;
    sequence: number;
    payload: Uint8Array;
  }): void;
  advanceTick(targetTick: bigint): bigint;
  snapshot(): {
    tick: bigint;
    payload: Uint8Array;
  };
  snapshotFor(playerId: number): {
    tick: bigint;
    payload: Uint8Array;
  };
};

const OPERATION_CODES: Record<GameServerExternalSimulationOperation, number> = {
  describe: 1,
  'add-player': 2,
  'remove-player': 3,
  'apply-command': 4,
  'advance-tick': 5,
  snapshot: 6,
  'snapshot-for': 7,
};

function operationFromCode(code: number): GameServerExternalSimulationOperation {
  switch (code) {
    case 1:
      return 'describe';
    case 2:
      return 'add-player';
    case 3:
      return 'remove-player';
    case 4:
      return 'apply-command';
    case 5:
      return 'advance-tick';
    case 6:
      return 'snapshot';
    case 7:
      return 'snapshot-for';
    default:
      throw new Error('Unknown external simulation operation ' + code);
  }
}

function assertIntegerInRange(
  value: number,
  minimum: number,
  maximum: number,
  label: string,
): void {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new RangeError(
      label +
        ' must be an integer between ' +
        minimum +
        ' and ' +
        maximum,
    );
  }
}

function assertExactLength(
  bytes: Uint8Array,
  expected: number,
  label: string,
): void {
  if (bytes.length !== expected) {
    throw new Error(
      label +
        ' expected ' +
        expected +
        ' bytes, received ' +
        bytes.length,
    );
  }
}

function assertMinimumLength(
  bytes: Uint8Array,
  minimum: number,
  label: string,
): void {
  if (bytes.length < minimum) {
    throw new Error(
      label +
        ' expected at least ' +
        minimum +
        ' bytes, received ' +
        bytes.length,
    );
  }
}

function assertProtocolVersion(version: number): void {
  if (version !== GAME_SERVER_EXTERNAL_SIMULATION_PROTOCOL_VERSION) {
    throw new Error(
      'Unsupported external simulation protocol version ' + version,
    );
  }
}

function view(bytes: Uint8Array): DataView {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

function readU16(bytes: Uint8Array, offset: number): number {
  return view(bytes).getUint16(offset, false);
}

function readU32(bytes: Uint8Array, offset: number): number {
  return view(bytes).getUint32(offset, false);
}

function readU64(bytes: Uint8Array, offset: number): bigint {
  return view(bytes).getBigUint64(offset, false);
}

function appendU16(output: number[], value: number): void {
  assertIntegerInRange(value, 0, 0xffff, 'u16 value');
  output.push((value >>> 8) & 0xff, value & 0xff);
}

function appendU32(output: number[], value: number): void {
  assertIntegerInRange(value, 0, 0xffffffff, 'u32 value');
  output.push(
    (value >>> 24) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 8) & 0xff,
    value & 0xff,
  );
}

function appendU64(output: number[], value: bigint): void {
  if (value < 0n || value > U64_MASK) {
    throw new RangeError('u64 value is out of range');
  }

  for (let shift = 56n; shift >= 0n; shift -= 8n) {
    output.push(Number((value >> shift) & 0xffn));
  }
}

function operationCode(
  operation: GameServerExternalSimulationOperation,
): number {
  return OPERATION_CODES[operation];
}

export function encodeGameServerExternalSimulationRequest(
  request: GameServerExternalSimulationRequest,
): Uint8Array {
  const output = [
    GAME_SERVER_EXTERNAL_SIMULATION_PROTOCOL_VERSION,
    operationCode(request.operation),
  ];

  switch (request.operation) {
    case 'describe':
    case 'snapshot': {
      break;
    }
    case 'add-player':
    case 'remove-player':
    case 'snapshot-for': {
      appendU32(output, request.playerId);
      break;
    }
    case 'advance-tick': {
      appendU64(output, request.targetTick);
      break;
    }
    case 'apply-command': {
      if (request.sequence === 0) {
        throw new Error('Command sequence must be non-zero');
      }
      if (request.payload.length > GAME_SERVER_MAX_COMMAND_PAYLOAD_BYTES) {
        throw new Error(
          'Command payload exceeds ' +
            GAME_SERVER_MAX_COMMAND_PAYLOAD_BYTES +
            ' bytes',
        );
      }
      appendU32(output, request.playerId);
      appendU32(output, request.sequence);
      appendU16(output, request.payload.length);
      output.push(...request.payload);
      break;
    }
  }

  return Uint8Array.from(output);
}

export function decodeGameServerExternalSimulationRequest(
  bytes: Uint8Array,
): GameServerExternalSimulationRequest {
  assertMinimumLength(bytes, REQUEST_HEADER_BYTES, 'External simulation request');
  assertProtocolVersion(bytes[0] ?? -1);
  const operation = operationFromCode(bytes[1] ?? -1);

  switch (operation) {
    case 'describe':
    case 'snapshot': {
      assertExactLength(bytes, REQUEST_HEADER_BYTES, operation);
      return { operation };
    }
    case 'add-player':
    case 'remove-player':
    case 'snapshot-for': {
      assertExactLength(bytes, REQUEST_HEADER_BYTES + 4, operation);
      return {
        operation,
        playerId: readU32(bytes, REQUEST_HEADER_BYTES),
      };
    }
    case 'advance-tick': {
      assertExactLength(bytes, REQUEST_HEADER_BYTES + 8, operation);
      return {
        operation,
        targetTick: readU64(bytes, REQUEST_HEADER_BYTES),
      };
    }
    case 'apply-command': {
      assertMinimumLength(
        bytes,
        COMMAND_REQUEST_FIXED_BYTES,
        'apply-command request',
      );
      const sequence = readU32(bytes, 6);
      if (sequence === 0) {
        throw new Error('Command sequence must be non-zero');
      }
      const payloadLength = readU16(bytes, 10);
      if (payloadLength > GAME_SERVER_MAX_COMMAND_PAYLOAD_BYTES) {
        throw new Error(
          'Command payload exceeds ' +
            GAME_SERVER_MAX_COMMAND_PAYLOAD_BYTES +
            ' bytes',
        );
      }
      assertExactLength(
        bytes,
        COMMAND_REQUEST_FIXED_BYTES + payloadLength,
        'apply-command request',
      );
      return {
        operation,
        playerId: readU32(bytes, 2),
        sequence,
        payload: bytes.slice(COMMAND_REQUEST_FIXED_BYTES),
      };
    }
  }
}

function snapshotScopeCode(scope: GameServerSnapshotScope): number {
  return scope === 'shared' ? 0 : 1;
}

function snapshotScopeFromCode(code: number): GameServerSnapshotScope {
  if (code === 0) {
    return 'shared';
  }
  if (code === 1) {
    return 'player-scoped';
  }

  throw new Error('Invalid external simulation snapshot scope ' + code);
}

function fnvUpdate(hash: bigint, bytes: Uint8Array): bigint {
  let next = hash;

  for (const byte of bytes) {
    next ^= BigInt(byte);
    next = (next * FNV_PRIME) & U64_MASK;
  }

  return next;
}

function u64Bytes(value: bigint): Uint8Array {
  const output: number[] = [];
  appendU64(output, value);
  return Uint8Array.from(output);
}

export function gameServerSnapshotHash(
  tick: bigint,
  payload: Uint8Array,
): bigint {
  let hash = FNV_OFFSET_BASIS;
  hash = fnvUpdate(hash, u64Bytes(tick));
  hash = fnvUpdate(hash, u64Bytes(BigInt(payload.length)));
  return fnvUpdate(hash, payload);
}

function encodeSnapshotBody(input: {
  tick: bigint;
  payload: Uint8Array;
}): number[] {
  if (input.payload.length > GAME_SERVER_MAX_SNAPSHOT_PAYLOAD_BYTES) {
    throw new Error(
      'Snapshot payload exceeds ' +
        GAME_SERVER_MAX_SNAPSHOT_PAYLOAD_BYTES +
        ' bytes',
    );
  }

  const output: number[] = [];
  appendU64(output, input.tick);
  appendU64(output, gameServerSnapshotHash(input.tick, input.payload));
  appendU16(output, input.payload.length);
  output.push(...input.payload);
  return output;
}

export function encodeGameServerExternalSimulationResponse(
  operation: GameServerExternalSimulationOperation,
  response: GameServerExternalSimulationResponse,
): Uint8Array {
  const output = [
    GAME_SERVER_EXTERNAL_SIMULATION_PROTOCOL_VERSION,
    operationCode(operation),
  ];

  if (response.kind === 'rejected') {
    const payload = new TextEncoder().encode(response.message);
    if (payload.length > GAME_SERVER_MAX_EXTERNAL_SIMULATION_ERROR_BYTES) {
      throw new Error(
        'External simulation error exceeds ' +
          GAME_SERVER_MAX_EXTERNAL_SIMULATION_ERROR_BYTES +
          ' bytes',
      );
    }

    output.push(STATUS_ERROR, ...payload);
    return Uint8Array.from(output);
  }

  output.push(STATUS_OK);

  switch (response.kind) {
    case 'descriptor': {
      if (operation !== 'describe') {
        throw new Error('Descriptor response does not match ' + operation);
      }
      assertIntegerInRange(response.descriptor.tickHz, 1, 0xffff, 'tickHz');
      assertIntegerInRange(
        response.descriptor.maxPlayers,
        1,
        0xffff,
        'maxPlayers',
      );
      appendU16(output, response.descriptor.tickHz);
      appendU16(output, response.descriptor.maxPlayers);
      appendU64(output, response.descriptor.currentTick);
      output.push(snapshotScopeCode(response.descriptor.snapshotScope));
      break;
    }
    case 'acknowledged': {
      if (operation !== 'add-player' && operation !== 'apply-command') {
        throw new Error('Acknowledged response does not match ' + operation);
      }
      break;
    }
    case 'player-removed': {
      if (operation !== 'remove-player') {
        throw new Error('Player removal response does not match ' + operation);
      }
      output.push(response.removed ? 1 : 0);
      break;
    }
    case 'tick-advanced': {
      if (operation !== 'advance-tick') {
        throw new Error('Tick response does not match ' + operation);
      }
      appendU64(output, response.tick);
      break;
    }
    case 'snapshot': {
      if (operation !== 'snapshot' && operation !== 'snapshot-for') {
        throw new Error('Snapshot response does not match ' + operation);
      }
      output.push(
        ...encodeSnapshotBody({
          tick: response.snapshot.tick,
          payload: response.snapshot.payload,
        }),
      );
      break;
    }
  }

  return Uint8Array.from(output);
}

export function decodeGameServerExternalSimulationResponse(
  bytes: Uint8Array,
): {
  operation: GameServerExternalSimulationOperation;
  response: GameServerExternalSimulationResponse;
} {
  assertMinimumLength(
    bytes,
    RESPONSE_HEADER_BYTES,
    'External simulation response',
  );
  assertProtocolVersion(bytes[0] ?? -1);
  const operation = operationFromCode(bytes[1] ?? -1);
  const status = bytes[2] ?? -1;

  if (status === STATUS_ERROR) {
    const payload = bytes.slice(RESPONSE_HEADER_BYTES);
    if (payload.length > GAME_SERVER_MAX_EXTERNAL_SIMULATION_ERROR_BYTES) {
      throw new Error('External simulation error payload is too large');
    }
    return {
      operation,
      response: {
        kind: 'rejected',
        message: new TextDecoder('utf-8', { fatal: true }).decode(payload),
      },
    };
  }

  if (status !== STATUS_OK) {
    throw new Error('Unexpected external simulation response status ' + status);
  }

  switch (operation) {
    case 'describe': {
      const expectedLength = RESPONSE_HEADER_BYTES + 2 + 2 + 8 + 1;
      assertExactLength(bytes, expectedLength, 'describe response');
      return {
        operation,
        response: {
          kind: 'descriptor',
          descriptor: {
            tickHz: readU16(bytes, 3),
            maxPlayers: readU16(bytes, 5),
            currentTick: readU64(bytes, 7),
            snapshotScope: snapshotScopeFromCode(bytes[15] ?? -1),
          },
        },
      };
    }
    case 'add-player':
    case 'apply-command': {
      assertExactLength(bytes, RESPONSE_HEADER_BYTES, operation + ' response');
      return { operation, response: { kind: 'acknowledged' } };
    }
    case 'remove-player': {
      assertExactLength(
        bytes,
        RESPONSE_HEADER_BYTES + 1,
        'remove-player response',
      );
      const value = bytes[3] ?? -1;
      if (value !== 0 && value !== 1) {
        throw new Error('Invalid external simulation boolean ' + value);
      }
      return {
        operation,
        response: { kind: 'player-removed', removed: value === 1 },
      };
    }
    case 'advance-tick': {
      assertExactLength(
        bytes,
        RESPONSE_HEADER_BYTES + 8,
        'advance-tick response',
      );
      return {
        operation,
        response: {
          kind: 'tick-advanced',
          tick: readU64(bytes, RESPONSE_HEADER_BYTES),
        },
      };
    }
    case 'snapshot':
    case 'snapshot-for': {
      assertMinimumLength(
        bytes,
        SNAPSHOT_RESPONSE_FIXED_BYTES,
        operation + ' response',
      );
      const tick = readU64(bytes, 3);
      const stateHash = readU64(bytes, 11);
      const payloadLength = readU16(bytes, 19);
      assertExactLength(
        bytes,
        SNAPSHOT_RESPONSE_FIXED_BYTES + payloadLength,
        operation + ' response',
      );
      const payload = bytes.slice(SNAPSHOT_RESPONSE_FIXED_BYTES);
      const expectedHash = gameServerSnapshotHash(tick, payload);
      if (stateHash !== expectedHash) {
        throw new Error(
          'Snapshot hash mismatch: expected ' +
            toGameServerU64Hex(expectedHash) +
            ', got ' +
            toGameServerU64Hex(stateHash),
        );
      }
      return {
        operation,
        response: {
          kind: 'snapshot',
          snapshot: { tick, stateHash, payload },
        },
      };
    }
  }
}

function rejectionMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'External simulation failed';
}

export function createGameServerExternalSimulationEndpoint(
  handler: GameServerExternalSimulationHandler,
): {
  exchange(requestBytes: Uint8Array): Uint8Array;
} {
  return {
    exchange(requestBytes) {
      const request = decodeGameServerExternalSimulationRequest(requestBytes);

      try {
        switch (request.operation) {
          case 'describe': {
            return encodeGameServerExternalSimulationResponse('describe', {
              kind: 'descriptor',
              descriptor: handler.describe(),
            });
          }
          case 'add-player': {
            handler.addPlayer(request.playerId);
            return encodeGameServerExternalSimulationResponse('add-player', {
              kind: 'acknowledged',
            });
          }
          case 'remove-player': {
            return encodeGameServerExternalSimulationResponse(
              'remove-player',
              {
                kind: 'player-removed',
                removed: handler.removePlayer(request.playerId),
              },
            );
          }
          case 'apply-command': {
            handler.applyCommand({
              playerId: request.playerId,
              sequence: request.sequence,
              payload: request.payload,
            });
            return encodeGameServerExternalSimulationResponse(
              'apply-command',
              { kind: 'acknowledged' },
            );
          }
          case 'advance-tick': {
            return encodeGameServerExternalSimulationResponse(
              'advance-tick',
              {
                kind: 'tick-advanced',
                tick: handler.advanceTick(request.targetTick),
              },
            );
          }
          case 'snapshot': {
            const snapshot = handler.snapshot();
            return encodeGameServerExternalSimulationResponse('snapshot', {
              kind: 'snapshot',
              snapshot: {
                tick: snapshot.tick,
                stateHash: gameServerSnapshotHash(
                  snapshot.tick,
                  snapshot.payload,
                ),
                payload: snapshot.payload,
              },
            });
          }
          case 'snapshot-for': {
            const snapshot = handler.snapshotFor(request.playerId);
            return encodeGameServerExternalSimulationResponse(
              'snapshot-for',
              {
                kind: 'snapshot',
                snapshot: {
                  tick: snapshot.tick,
                  stateHash: gameServerSnapshotHash(
                    snapshot.tick,
                    snapshot.payload,
                  ),
                  payload: snapshot.payload,
                },
              },
            );
          }
        }
      } catch (error) {
        return encodeGameServerExternalSimulationResponse(request.operation, {
          kind: 'rejected',
          message: rejectionMessage(error),
        });
      }
    },
  };
}

function canonicalizeJsonValue(value: unknown): unknown {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean'
  ) {
    return value;
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new TypeError('Canonical JSON does not support non-finite numbers');
    }
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => canonicalizeJsonValue(item));
  }

  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => item !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, canonicalizeJsonValue(item)]),
    );
  }

  throw new TypeError('Canonical JSON does not support ' + typeof value);
}

export function gameServerCanonicalJson(value: unknown): string {
  return JSON.stringify(canonicalizeJsonValue(value));
}

export function gameServerCanonicalJsonBytes(value: unknown): Uint8Array {
  return new TextEncoder().encode(gameServerCanonicalJson(value));
}

export function toGameServerHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join(
    '',
  );
}

export function fromGameServerHex(value: string): Uint8Array {
  if (value.length % 2 !== 0 || !/^[0-9a-f]*$/u.test(value)) {
    throw new Error('Hex value must contain lowercase byte pairs');
  }

  const output = new Uint8Array(value.length / 2);
  for (let index = 0; index < output.length; index += 1) {
    output[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
  }
  return output;
}

export function toGameServerU64Hex(value: bigint): string {
  if (value < 0n || value > U64_MASK) {
    throw new RangeError('u64 value is out of range');
  }

  return value.toString(16).padStart(16, '0');
}
