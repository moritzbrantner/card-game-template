import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

import { cookies } from 'next/headers';

import type { AppSession } from '@/src/auth';
import { getEnv } from '@/src/config/env';

import type { MatchOwnerIdentity } from './contracts';

export const GUEST_COOKIE_NAME = 'game-guest-id';
const GUEST_COOKIE_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

function base64UrlEncode(value: string) {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function sign(value: string) {
  return createHmac('sha256', getEnv().auth.secret)
    .update(value)
    .digest('base64url');
}

export function serializeGuestIdCookieValue(guestId: string) {
  const encodedGuestId = base64UrlEncode(guestId);
  return `${encodedGuestId}.${sign(encodedGuestId)}`;
}

export function parseGuestIdCookieValue(value: string | undefined) {
  if (!value) {
    return null;
  }

  const [encodedGuestId, providedSignature] = value.split('.');
  if (!encodedGuestId || !providedSignature) {
    return null;
  }

  const expectedSignature = sign(encodedGuestId);
  const providedBuffer = Buffer.from(providedSignature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    providedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    return base64UrlDecode(encodedGuestId);
  } catch {
    return null;
  }
}

function parseCookieHeader(cookieHeader: string | null | undefined) {
  if (!cookieHeader) {
    return new Map<string, string>();
  }

  return new Map(
    cookieHeader
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const separatorIndex = part.indexOf('=');

        if (separatorIndex < 0) {
          return [part, ''] as const;
        }

        return [
          part.slice(0, separatorIndex),
          decodeURIComponent(part.slice(separatorIndex + 1)),
        ] as const;
      }),
  );
}

export function resolveMatchOwnerIdentityFromCookieHeader(
  cookieHeader: string | null | undefined,
  session: AppSession | null,
): MatchOwnerIdentity | null {
  if (session?.user.id) {
    return {
      kind: 'account',
      accountId: session.user.id,
    };
  }

  const cookiesByName = parseCookieHeader(cookieHeader);
  const guestId = parseGuestIdCookieValue(cookiesByName.get(GUEST_COOKIE_NAME));

  return guestId
    ? {
        kind: 'guest',
        guestId,
      }
    : null;
}

function getSessionDisplayName(session: AppSession | null) {
  return (
    session?.user.name?.trim() || session?.user.tag?.trim() || 'Player One'
  );
}

export async function resolveExistingMatchOwnerIdentity(
  session: AppSession | null,
): Promise<{
  identity: MatchOwnerIdentity | null;
  displayName: string | null;
}> {
  if (session?.user.id) {
    return {
      identity: {
        kind: 'account',
        accountId: session.user.id,
      },
      displayName: getSessionDisplayName(session),
    };
  }

  const cookieStore = await cookies();
  const guestId = parseGuestIdCookieValue(
    cookieStore.get(GUEST_COOKIE_NAME)?.value,
  );

  return {
    identity: guestId
      ? {
          kind: 'guest',
          guestId,
        }
      : null,
    displayName: null,
  };
}

export async function resolveOrCreateMatchOwnerIdentity(
  session: AppSession | null,
): Promise<{
  identity: MatchOwnerIdentity;
  displayName: string | null;
}> {
  const existing = await resolveExistingMatchOwnerIdentity(session);

  if (existing.identity !== null) {
    return {
      identity: existing.identity,
      displayName: existing.displayName,
    };
  }

  const guestId = `guest-${randomUUID()}`;
  const cookieStore = await cookies();

  cookieStore.set({
    name: GUEST_COOKIE_NAME,
    value: serializeGuestIdCookieValue(guestId),
    httpOnly: true,
    sameSite: 'lax',
    secure: getEnv().isProduction,
    path: '/',
    maxAge: GUEST_COOKIE_MAX_AGE_SECONDS,
  });

  return {
    identity: {
      kind: 'guest',
      guestId,
    },
    displayName: null,
  };
}
