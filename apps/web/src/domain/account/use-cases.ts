import { eq, like, or } from 'drizzle-orm';

import { verifyPassword } from '@/lib/password';
import {
  requestPasswordReset,
  resetPasswordWithToken,
  signUpWithCredentials,
  type SignupInput,
  verifyEmailByToken,
} from '@/src/auth/account-lifecycle';
import { getDb } from '@/src/db/client';
import { users, verificationTokens } from '@/src/db/schema';
import { failure, success, type ServiceResult } from '@/src/domain/shared/result';
import { deleteProfileImage } from '@/src/profile/object-storage';

const EMAIL_VERIFICATION_PREFIX = 'email-verification:';
const PASSWORD_RESET_PREFIX = 'password-reset:';

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export type AccountError = {
  code: 'VALIDATION_ERROR' | 'NOT_FOUND' | 'FORBIDDEN' | 'CONFLICT';
  message: string;
};

type ManagedAccountUser = {
  id: string;
  email: string | null;
  image: string | null;
  passwordHash: string | null;
};

type AccountMutationDependencies = {
  findUserById: (userId: string) => Promise<ManagedAccountUser | undefined>;
  findUserByEmail: (email: string) => Promise<ManagedAccountUser | undefined>;
  verifyPassword: (password: string, passwordHash: string) => Promise<boolean>;
  updateEmail: (userId: string, email: string) => Promise<void>;
  performAccountDeletion: (userId: string) => Promise<void>;
  deleteProfileImage: (keyOrUrl: string | null | undefined) => Promise<void>;
};

async function resolveMutationDependencies(): Promise<AccountMutationDependencies> {
  return {
    findUserById: async (userId) => {
      return getDb().query.users.findFirst({
        where: (table, { eq: innerEq }) => innerEq(table.id, userId),
      });
    },
    findUserByEmail: async (email) => {
      return getDb().query.users.findFirst({
        where: (table, { eq: innerEq }) => innerEq(table.email, email),
      });
    },
    verifyPassword,
    updateEmail: async (userId, email) => {
      await getDb()
        .update(users)
        .set({
          email,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
    },
    performAccountDeletion: async (userId) => {
      await getDb().transaction(async (tx) => {
        await tx
          .delete(verificationTokens)
          .where(
            or(
              like(verificationTokens.identifier, `${EMAIL_VERIFICATION_PREFIX}${userId}`),
              like(verificationTokens.identifier, `${PASSWORD_RESET_PREFIX}${userId}`),
            ),
          );

        await tx.delete(users).where(eq(users.id, userId));
      });
    },
    deleteProfileImage,
  };
}

function mapLifecycleError(error: string): AccountError {
  if (error === 'An account already exists for this email.') {
    return { code: 'CONFLICT', message: error };
  }

  if (
    error === 'Invalid verification token.' ||
    error === 'Verification token has expired.' ||
    error === 'Invalid password reset token.' ||
    error === 'Password reset token has expired.'
  ) {
    return { code: 'NOT_FOUND', message: error };
  }

  return { code: 'VALIDATION_ERROR', message: error };
}

export async function registerAccountUseCase(
  input: SignupInput,
): Promise<ServiceResult<{ userId: string; verificationToken: string }, AccountError>> {
  const result = await signUpWithCredentials(input);

  if (!result.ok) {
    return failure(mapLifecycleError(result.error));
  }

  return success({
    userId: result.userId,
    verificationToken: result.verificationToken,
  });
}

export async function requestAccountRecoveryUseCase(email: string): Promise<ServiceResult<{ requested: true }, never>> {
  await requestPasswordReset(email);
  return success({ requested: true });
}

export async function recoverAccountWithTokenUseCase(
  token: string,
  password: string,
): Promise<ServiceResult<{ recovered: true }, AccountError>> {
  const result = await resetPasswordWithToken(token, password);

  if (!result.ok) {
    return failure(mapLifecycleError(result.error));
  }

  return success({ recovered: true });
}

export async function verifyAccountEmailUseCase(token: string): Promise<ServiceResult<{ verified: true }, AccountError>> {
  const result = await verifyEmailByToken(token);

  if (!result.ok) {
    return failure(mapLifecycleError(result.error));
  }

  return success({ verified: true });
}

export type UpdateAccountEmailInput = {
  email: string;
  currentPassword: string;
};

export async function updateAccountEmailUseCase(
  userId: string,
  input: UpdateAccountEmailInput,
  deps?: AccountMutationDependencies,
): Promise<ServiceResult<{ email: string }, AccountError>> {
  const resolvedDeps = deps ?? (await resolveMutationDependencies());
  const nextEmail = normalizeEmail(input.email);
  const currentPassword = input.currentPassword;

  if (!nextEmail || !nextEmail.includes('@')) {
    return failure({
      code: 'VALIDATION_ERROR',
      message: 'A valid email is required.',
    });
  }

  if (!currentPassword) {
    return failure({
      code: 'VALIDATION_ERROR',
      message: 'Current password is required.',
    });
  }

  const existingUser = await resolvedDeps.findUserById(userId);
  if (!existingUser) {
    return failure({
      code: 'NOT_FOUND',
      message: 'User account was not found.',
    });
  }

  if (!existingUser.passwordHash) {
    return failure({
      code: 'FORBIDDEN',
      message: 'This account cannot be updated with a password.',
    });
  }

  const passwordMatches = await resolvedDeps.verifyPassword(currentPassword, existingUser.passwordHash);
  if (!passwordMatches) {
    return failure({
      code: 'FORBIDDEN',
      message: 'Current password is incorrect.',
    });
  }

  if (normalizeEmail(existingUser.email ?? '') === nextEmail) {
    return failure({
      code: 'VALIDATION_ERROR',
      message: 'Please enter a different email address.',
    });
  }

  const duplicateUser = await resolvedDeps.findUserByEmail(nextEmail);
  if (duplicateUser && duplicateUser.id !== userId) {
    return failure({
      code: 'CONFLICT',
      message: 'An account already exists for this email.',
    });
  }

  await resolvedDeps.updateEmail(userId, nextEmail);

  return success({ email: nextEmail });
}

export type DeleteAccountInput = {
  currentPassword: string;
};

export async function deleteAccountUseCase(
  userId: string,
  input: DeleteAccountInput,
  deps?: AccountMutationDependencies,
): Promise<ServiceResult<{ deleted: true }, AccountError>> {
  const resolvedDeps = deps ?? (await resolveMutationDependencies());
  const currentPassword = input.currentPassword;

  if (!currentPassword) {
    return failure({
      code: 'VALIDATION_ERROR',
      message: 'Current password is required.',
    });
  }

  const existingUser = await resolvedDeps.findUserById(userId);
  if (!existingUser) {
    return failure({
      code: 'NOT_FOUND',
      message: 'User account was not found.',
    });
  }

  if (!existingUser.passwordHash) {
    return failure({
      code: 'FORBIDDEN',
      message: 'This account cannot be deleted with a password.',
    });
  }

  const passwordMatches = await resolvedDeps.verifyPassword(currentPassword, existingUser.passwordHash);
  if (!passwordMatches) {
    return failure({
      code: 'FORBIDDEN',
      message: 'Current password is incorrect.',
    });
  }

  await resolvedDeps.performAccountDeletion(userId);

  try {
    await resolvedDeps.deleteProfileImage(existingUser.image);
  } catch (error) {
    console.error('[account] failed to delete profile image during account deletion', {
      userId,
      error,
    });
  }

  return success({ deleted: true });
}
