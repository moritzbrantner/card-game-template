import { createHmac, timingSafeEqual } from 'node:crypto';
import { createServer, type IncomingMessage } from 'node:http';
import { createRequire } from 'node:module';
import type { Duplex } from 'node:stream';
import { parseArgs } from 'node:util';

import next from 'next';

import { getEnv } from '@/src/config/env';
import { getDb } from '@/src/db/client';
import { type PersistedUnoMatchRecord } from '@/src/domain/game-matches/contracts';
import { subscribeToUnoMatch } from '@/src/domain/game-matches/realtime';
import { loadOwnedGameMatch } from '@/src/domain/game-matches/repository';
import { buildPersistedUnoMatchSnapshotDto } from '@/src/domain/game-matches/uno-snapshot';

const require = createRequire(import.meta.url);

type MatchWebSocket = {
  readyState: number;
  close(code?: number, reason?: string): void;
  on(event: 'close', listener: () => void): void;
  send(data: string): void;
};

type WebSocketServerInstance = {
  handleUpgrade(
    request: IncomingMessage,
    socket: Duplex,
    head: Buffer,
    callback: (webSocket: MatchWebSocket) => void,
  ): void;
};

type WebSocketModule = {
  Server: new (options: { noServer: boolean }) => WebSocketServerInstance;
};

const WebSocket = require('ws') as WebSocketModule;
const SESSION_COOKIE_NAME = 'app-session';
const GUEST_COOKIE_NAME = 'game-guest-id';
const SESSION_SECRET = getEnv().auth.secret;

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    dev: {
      type: 'boolean',
      default: false,
    },
    prod: {
      type: 'boolean',
      default: false,
    },
    host: {
      type: 'string',
      default: process.env.HOST ?? '0.0.0.0',
    },
    port: {
      type: 'string',
      default: process.env.PORT ?? '3000',
    },
  },
});

const port = Number(values.port);
const host = values.host;
const dev = values.dev || !values.prod;
const wsServer = new WebSocket.Server({ noServer: true });

function getCookieValue(cookieHeader: string | undefined, cookieName: string) {
  if (!cookieHeader) {
    return undefined;
  }

  for (const part of cookieHeader.split(';')) {
    const trimmed = part.trim();

    if (!trimmed.startsWith(`${cookieName}=`)) {
      continue;
    }

    return decodeURIComponent(trimmed.slice(cookieName.length + 1));
  }

  return undefined;
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function signCookieValue(value: string) {
  return createHmac('sha256', SESSION_SECRET).update(value).digest('base64url');
}

function hasValidSignature(encodedValue: string, providedSignature: string) {
  const expectedSignature = signCookieValue(encodedValue);
  const providedBuffer = Buffer.from(providedSignature);
  const expectedBuffer = Buffer.from(expectedSignature);

  return (
    providedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(providedBuffer, expectedBuffer)
  );
}

function parseSessionUserId(cookieValue: string | undefined) {
  if (!cookieValue) {
    return null;
  }

  const [encodedPayload, providedSignature] = cookieValue.split('.');

  if (
    !encodedPayload ||
    !providedSignature ||
    !hasValidSignature(encodedPayload, providedSignature)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as {
      user?: { id?: string };
    };
    return payload.user?.id ?? null;
  } catch {
    return null;
  }
}

function parseGuestId(cookieValue: string | undefined) {
  if (!cookieValue) {
    return null;
  }

  const [encodedGuestId, providedSignature] = cookieValue.split('.');

  if (
    !encodedGuestId ||
    !providedSignature ||
    !hasValidSignature(encodedGuestId, providedSignature)
  ) {
    return null;
  }

  try {
    return base64UrlDecode(encodedGuestId);
  } catch {
    return null;
  }
}

function getMatchIdFromUrl(url: string | undefined) {
  if (!url) {
    return null;
  }

  const pathname = new URL(url, 'http://127.0.0.1').pathname;
  const match = pathname.match(/^\/ws\/games\/uno\/matches\/([^/]+)$/);
  return match?.[1] ?? null;
}

async function authorizeMatchSocket(request: IncomingMessage) {
  const matchId = getMatchIdFromUrl(request.url);

  if (!matchId) {
    return null;
  }

  const cookieHeader = request.headers.cookie;
  const accountId = parseSessionUserId(
    getCookieValue(cookieHeader, SESSION_COOKIE_NAME),
  );
  const guestId = parseGuestId(getCookieValue(cookieHeader, GUEST_COOKIE_NAME));
  const identity = accountId
    ? {
        kind: 'account' as const,
        accountId,
      }
    : guestId
      ? {
          kind: 'guest' as const,
          guestId,
        }
      : null;

  if (!identity) {
    return null;
  }

  const match = await loadOwnedGameMatch<PersistedUnoMatchRecord>(
    getDb(),
    identity,
    matchId,
    { gameId: 'uno-style' },
  );

  if (!match) {
    return null;
  }

  return {
    identity,
    match,
  };
}

const app = next({
  dev,
  hostname: host,
  port,
});

async function main() {
  await app.prepare();
  const handle = app.getRequestHandler();
  const handleUpgrade = app.getUpgradeHandler();

  const server = createServer((request, response) => {
    void handle(request, response);
  });

  server.on('upgrade', (request, socket, head) => {
    const matchId = getMatchIdFromUrl(request.url);

    if (!matchId) {
      void handleUpgrade(request, socket, head);
      return;
    }

    void authorizeMatchSocket(request)
      .then((authorized) => {
        if (!authorized) {
          socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
          socket.destroy();
          return;
        }

        wsServer.handleUpgrade(request, socket, head, (webSocket) => {
          const unsubscribe = subscribeToUnoMatch(
            authorized.match.matchId,
            webSocket,
          );
          const snapshot = buildPersistedUnoMatchSnapshotDto(
            authorized.match,
            authorized.identity,
          );

          webSocket.send(
            JSON.stringify({
              type: 'uno.match.snapshot',
              snapshot,
            }),
          );

          webSocket.on('close', () => {
            unsubscribe();
          });
        });
      })
      .catch(() => {
        socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
        socket.destroy();
      });
  });

  server.listen(port, host, () => {
    process.stdout.write(
      `> Ready on http://${host}:${port}${dev ? ' (dev)' : ' (prod)'}\n`,
    );
  });

  for (const event of ['SIGINT', 'SIGTERM'] as const) {
    process.on(event, () => {
      server.close(() => {
        process.exit(0);
      });
    });
  }
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
