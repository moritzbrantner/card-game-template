const TAG_ALLOWED_PATTERN = /^[a-z0-9](?:[a-z0-9_-]{1,38}[a-z0-9])?$/;

export const PROFILE_TAG_MIN_LENGTH = 3;
export const PROFILE_TAG_MAX_LENGTH = 40;

function stripDiacritics(value: string) {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
}

function trimTagSeparators(value: string) {
  return value.replace(/^[-_]+|[-_]+$/g, '');
}

export function normalizeProfileTagInput(value: string) {
  return value.trim().replace(/^@+/, '').toLowerCase();
}

export function sanitizeProfileTagBase(value: string) {
  return trimTagSeparators(
    stripDiacritics(normalizeProfileTagInput(value))
      .replace(/[^a-z0-9_-]+/g, '-')
      .slice(0, PROFILE_TAG_MAX_LENGTH),
  );
}

export function validateProfileTag(tag: string): { ok: true } | { ok: false; message: string } {
  if (tag.length < PROFILE_TAG_MIN_LENGTH) {
    return {
      ok: false,
      message: `Tag must be at least ${PROFILE_TAG_MIN_LENGTH} characters.`,
    };
  }

  if (tag.length > PROFILE_TAG_MAX_LENGTH) {
    return {
      ok: false,
      message: `Tag must be ${PROFILE_TAG_MAX_LENGTH} characters or fewer.`,
    };
  }

  if (!TAG_ALLOWED_PATTERN.test(tag)) {
    return {
      ok: false,
      message: 'Tag can only contain lowercase letters, numbers, hyphens, and underscores, and cannot start or end with punctuation.',
    };
  }

  return { ok: true };
}

export function formatProfileTag(tag: string) {
  return `@${tag}`;
}

export function buildPublicProfilePath(tag: string) {
  return `/profile/${formatProfileTag(tag)}`;
}

export function buildPublicProfileBlogPath(tag: string) {
  return `${buildPublicProfilePath(tag)}/blog`;
}

export function buildPublicProfileFollowersPath(tag: string) {
  return `${buildPublicProfilePath(tag)}/followers`;
}

function decodeProfileTagSegment(segment: string) {
  try {
    return decodeURIComponent(segment);
  } catch {
    return null;
  }
}

export function parseProfileTagSegment(segment: string) {
  const decodedSegment = decodeProfileTagSegment(segment);

  if (!decodedSegment?.startsWith('@')) {
    return null;
  }

  const tag = normalizeProfileTagInput(decodedSegment);
  return validateProfileTag(tag).ok ? tag : null;
}

export function getFallbackProfileTag(userId: string) {
  const sanitizedUserId = userId.toLowerCase().replace(/[^a-z0-9]/g, '');
  return `u${sanitizedUserId}`.slice(0, PROFILE_TAG_MAX_LENGTH);
}

export function getInitialProfileTagCandidates(input: {
  userId: string;
  email: string;
  name?: string | null;
}) {
  const baseCandidates = [input.name ?? '', input.email.split('@')[0] ?? '', 'user']
    .map(sanitizeProfileTagBase)
    .filter((candidate) => candidate.length > 0);
  const fallbackTag = getFallbackProfileTag(input.userId);
  const suffix = fallbackTag.slice(-6);
  const candidates = new Set<string>();

  for (const base of baseCandidates) {
    const trimmedBase = base.slice(0, PROFILE_TAG_MAX_LENGTH);

    if (validateProfileTag(trimmedBase).ok) {
      candidates.add(trimmedBase);
    }

    const withSuffix = `${trimmedBase.slice(0, PROFILE_TAG_MAX_LENGTH - suffix.length - 1)}-${suffix}`;
    if (validateProfileTag(withSuffix).ok) {
      candidates.add(withSuffix);
    }
  }

  candidates.add(fallbackTag);
  return [...candidates];
}
