import { createHmac, timingSafeEqual } from 'node:crypto';

import { cookies } from 'next/headers';

import type { AppSession, AppSessionUser } from '@/src/auth';
import { getEnv } from '@/src/config/env';
import { buildProfileImageUrl } from '@/src/profile/object-storage';

const SESSION_COOKIE_NAME = 'app-session';
const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;
const SESSION_SECRET = getEnv().auth.secret;

type SessionPayload = {
  user?: AppSessionUser;
};

function base64UrlEncode(value: string) {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function sign(value: string) {
  return createHmac('sha256', SESSION_SECRET).update(value).digest('base64url');
}

function serializeSession(payload: SessionPayload) {
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

function parseSession(value: string | undefined): SessionPayload | null {
  if (!value) {
    return null;
  }

  const [encodedPayload, providedSignature] = value.split('.');
  if (!encodedPayload || !providedSignature) {
    return null;
  }

  const expectedSignature = sign(encodedPayload);
  const providedBuffer = Buffer.from(providedSignature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    providedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    return JSON.parse(base64UrlDecode(encodedPayload)) as SessionPayload;
  } catch {
    return null;
  }
}

async function getCookieStore() {
  return cookies();
}

async function writeSessionCookie(payload: SessionPayload | null) {
  const cookieStore = await getCookieStore();

  if (!payload?.user) {
    cookieStore.delete(SESSION_COOKIE_NAME);
    return;
  }

  cookieStore.set({
    name: SESSION_COOKIE_NAME,
    value: serializeSession(payload),
    httpOnly: true,
    sameSite: 'lax',
    secure: getEnv().isProduction,
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function getAuthSession(): Promise<AppSession | null> {
  const cookieStore = await getCookieStore();
  const payload = parseSession(cookieStore.get(SESSION_COOKIE_NAME)?.value);

  return payload?.user ? { user: payload.user } : null;
}

export async function signInSession(
  user: Pick<
    AppSessionUser,
    'id' | 'email' | 'tag' | 'name' | 'image' | 'role'
  >,
): Promise<AppSession> {
  const normalizedUser: AppSessionUser = {
    id: user.id,
    email: user.email,
    tag: user.tag ?? null,
    name: user.name ?? null,
    image: buildProfileImageUrl(user.image) ?? null,
    role: user.role,
  };

  await writeSessionCookie({ user: normalizedUser });
  return { user: normalizedUser };
}

export async function signOutSession() {
  await writeSessionCookie(null);
}
