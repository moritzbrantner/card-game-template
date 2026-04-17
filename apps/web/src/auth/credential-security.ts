const THROTTLE_WINDOW_MS = 10 * 60 * 1000;
const THROTTLE_MAX_ATTEMPTS = 5;
const THROTTLE_BLOCK_MS = 15 * 60 * 1000;

type AttemptRecord = {
  count: number;
  firstAttemptAt: number;
  blockedUntil: number | null;
};

const attemptStore = new Map<string, AttemptRecord>();

export function buildCredentialThrottleKey(email: string, ip: string): string {
  return `${email.toLowerCase()}::${ip}`;
}

export function isCredentialAttemptThrottled(key: string, now = Date.now()): boolean {
  const record = attemptStore.get(key);
  if (!record) {
    return false;
  }

  if (record.blockedUntil && record.blockedUntil > now) {
    return true;
  }

  if (record.blockedUntil && record.blockedUntil <= now) {
    attemptStore.delete(key);
    return false;
  }

  if (record.firstAttemptAt + THROTTLE_WINDOW_MS <= now) {
    attemptStore.delete(key);
    return false;
  }

  return false;
}

export function registerCredentialAttemptFailure(key: string, now = Date.now()): void {
  const existing = attemptStore.get(key);

  if (!existing || existing.firstAttemptAt + THROTTLE_WINDOW_MS <= now) {
    attemptStore.set(key, {
      count: 1,
      firstAttemptAt: now,
      blockedUntil: null,
    });
    return;
  }

  const nextCount = existing.count + 1;
  if (nextCount >= THROTTLE_MAX_ATTEMPTS) {
    attemptStore.set(key, {
      count: nextCount,
      firstAttemptAt: existing.firstAttemptAt,
      blockedUntil: now + THROTTLE_BLOCK_MS,
    });
    return;
  }

  attemptStore.set(key, {
    count: nextCount,
    firstAttemptAt: existing.firstAttemptAt,
    blockedUntil: null,
  });
}

export function clearCredentialAttemptFailures(key: string): void {
  attemptStore.delete(key);
}

export function getClientIpFromRequest(request: unknown): string {
  if (!request || typeof request !== 'object') {
    return 'unknown';
  }

  const candidate = request as { headers?: Headers | Record<string, string | string[] | undefined> };
  const headers = candidate.headers;
  if (!headers) {
    return 'unknown';
  }

  if (headers instanceof Headers) {
    const forwardedFor = headers.get('x-forwarded-for');
    if (forwardedFor) {
      return forwardedFor.split(',')[0]?.trim() ?? 'unknown';
    }

    return headers.get('x-real-ip') ?? 'unknown';
  }

  const forwardedFor = headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string') {
    return forwardedFor.split(',')[0]?.trim() ?? 'unknown';
  }

  if (Array.isArray(forwardedFor) && forwardedFor[0]) {
    return forwardedFor[0].split(',')[0]?.trim() ?? 'unknown';
  }

  const realIp = headers['x-real-ip'];
  if (typeof realIp === 'string') {
    return realIp;
  }

  return 'unknown';
}

export function __resetCredentialAttemptStoreForTests() {
  attemptStore.clear();
}
