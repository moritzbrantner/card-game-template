import type { AppRole } from '@/lib/authorization';
import { verifyPassword } from '@/lib/password';
import {
  buildCredentialThrottleKey,
  clearCredentialAttemptFailures,
  getClientIpFromRequest,
  isCredentialAttemptThrottled,
  registerCredentialAttemptFailure,
} from '@/src/auth/credential-security';
import {
  clearCredentialFailuresForUser,
  registerCredentialFailureForUser,
} from '@/src/auth/account-lifecycle';

type CredentialsInput = {
  email?: unknown;
  password?: unknown;
};

type DbUser = {
  id: string;
  email: string | null;
  tag: string;
  name: string | null;
  image: string | null;
  role: AppRole;
  passwordHash: string | null;
  lockoutUntil: Date | null;
};

type CredentialsDependencies = {
  findUserByEmail: (email: string) => Promise<DbUser | undefined>;
  verifyPassword: (password: string, passwordHash: string) => Promise<boolean>;
  onAuthenticationFailure: (userId: string | null) => Promise<void>;
  onAuthenticationSuccess: (userId: string) => Promise<void>;
};

async function resolveDefaultDependencies(): Promise<CredentialsDependencies> {
  const { getDb } = await import('@/src/db/client');

  return {
    findUserByEmail: async (email) => {
      return getDb().query.users.findFirst({
        where: (table, { eq }) => eq(table.email, email),
      });
    },
    verifyPassword,
    onAuthenticationFailure: async (userId) => {
      if (!userId) {
        return;
      }

      await registerCredentialFailureForUser(userId);
    },
    onAuthenticationSuccess: async (userId) => {
      await clearCredentialFailuresForUser(userId);
    },
  };
}

export async function authorizeCredentials(
  credentials: CredentialsInput | undefined,
  dependencies?: CredentialsDependencies,
  request?: unknown,
) {
  const email = credentials?.email;
  const password = credentials?.password;

  if (typeof email !== 'string' || typeof password !== 'string') {
    return null;
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    return null;
  }

  const clientIp = getClientIpFromRequest(request);
  const throttleKey = buildCredentialThrottleKey(normalizedEmail, clientIp);

  if (isCredentialAttemptThrottled(throttleKey)) {
    return null;
  }

  const resolvedDependencies =
    dependencies ?? (await resolveDefaultDependencies());
  const user = await resolvedDependencies.findUserByEmail(normalizedEmail);

  if (!user?.passwordHash) {
    registerCredentialAttemptFailure(throttleKey);
    await resolvedDependencies.onAuthenticationFailure(user?.id ?? null);
    return null;
  }

  if (user.lockoutUntil && user.lockoutUntil.getTime() > Date.now()) {
    registerCredentialAttemptFailure(throttleKey);
    return null;
  }

  const isValidPassword = await resolvedDependencies.verifyPassword(
    password,
    user.passwordHash,
  );
  if (!isValidPassword) {
    registerCredentialAttemptFailure(throttleKey);
    await resolvedDependencies.onAuthenticationFailure(user.id);
    return null;
  }

  clearCredentialAttemptFailures(throttleKey);
  await resolvedDependencies.onAuthenticationSuccess(user.id);

  return {
    id: user.id,
    email: user.email,
    tag: user.tag,
    name: user.name,
    image: user.image,
    role: user.role,
  };
}
