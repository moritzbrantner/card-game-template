'use client';

import { useState, type FormEvent } from 'react';

import type { AppRole } from '@/lib/authorization';
import { useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { readProblemDetail } from '@/src/http/problem-client';
import { useTranslations } from '@/src/i18n';

const roleOptions = [
  'SUPERADMIN',
  'ADMIN',
  'MANAGER',
  'USER',
] as const satisfies readonly AppRole[];
const selectClassName =
  'w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900';

export function AdminRoleManager({
  userId,
  currentRole,
  disabled = false,
}: {
  userId: string;
  currentRole: AppRole;
  disabled?: boolean;
}) {
  const t = useTranslations('AdminPage');
  const router = useRouter();
  const [nextRole, setNextRole] = useState<AppRole>(currentRole);
  const [pending, setPending] = useState(false);
  const [state, setState] = useState<{ error?: string; success?: string }>({});

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (disabled || nextRole === currentRole) {
      return;
    }

    setPending(true);
    setState({});

    const response = await fetch(`/api/admin/users/${userId}/role`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ role: nextRole }),
    });

    if (!response.ok) {
      const problem = await readProblemDetail(
        response,
        t('users.detail.roleManager.genericError'),
      );
      setState({ error: problem.message });
      setPending(false);
      return;
    }

    setState({
      success: t('users.detail.roleManager.success', {
        role: t(`users.notifications.roles.${nextRole}`),
      }),
    });
    setPending(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          {t('users.detail.roleManager.currentRole')}
        </p>
        <p className="font-medium">
          {t(`users.notifications.roles.${currentRole}`)}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="admin-role-manager-role">
          {t('users.detail.roleManager.nextRole')}
        </Label>
        <select
          id="admin-role-manager-role"
          value={nextRole}
          onChange={(event) => setNextRole(event.target.value as AppRole)}
          className={selectClassName}
          disabled={disabled || pending}
        >
          {roleOptions.map((role) => (
            <option key={role} value={role}>
              {t(`users.notifications.roles.${role}`)}
            </option>
          ))}
        </select>
      </div>

      {disabled ? (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
          {t('users.detail.roleManager.selfChangeHint')}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={disabled || pending || nextRole === currentRole}
      >
        {pending
          ? t('users.detail.roleManager.saving')
          : t('users.detail.roleManager.submit')}
      </Button>

      <div role="status" className="space-y-1">
        {state.error ? (
          <p className="text-sm text-red-600 dark:text-red-400">
            {state.error}
          </p>
        ) : null}
        {state.success ? (
          <p className="text-sm text-emerald-600 dark:text-emerald-400">
            {state.success}
          </p>
        ) : null}
      </div>
    </form>
  );
}
