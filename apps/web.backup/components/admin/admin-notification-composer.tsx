'use client';

import { useMemo, useState, type FormEvent } from 'react';

import type { AppRole } from '@/lib/authorization';
import { useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { readProblemDetail } from '@/src/http/problem-client';
import { useTranslations } from '@/src/i18n';

type NotificationAudience = 'user' | 'role' | 'all';

type UserOption = {
  id: string;
  displayName: string;
  email: string;
  role: AppRole;
};

type AdminNotificationComposerProps = {
  userOptions: UserOption[];
  allowedAudiences?: readonly NotificationAudience[];
  initialAudience?: NotificationAudience;
  initialTargetUserId?: string;
  initialTargetRole?: AppRole;
  className?: string;
};

const selectClassName = [
  'flex h-10 w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm shadow-sm transition-colors',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2',
  'dark:border-zinc-700 dark:bg-zinc-950 dark:focus-visible:ring-zinc-50',
].join(' ');

export function AdminNotificationComposer({
  userOptions,
  allowedAudiences = ['user', 'role', 'all'],
  initialAudience = 'user',
  initialTargetUserId,
  initialTargetRole = 'USER',
  className,
}: AdminNotificationComposerProps) {
  const t = useTranslations('AdminPage');
  const router = useRouter();
  const defaultAudience = allowedAudiences.includes(initialAudience) ? initialAudience : allowedAudiences[0] ?? 'user';
  const [audience, setAudience] = useState<NotificationAudience>(defaultAudience);
  const [pending, setPending] = useState(false);
  const [state, setState] = useState<{ error?: string; success?: string }>({});
  const recipientLabel = useMemo(() => {
    return userOptions.find((user) => user.id === initialTargetUserId)?.displayName;
  }, [initialTargetUserId, userOptions]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setState({});

    const formData = new FormData(event.currentTarget);
    formData.set('audience', audience);

    const response = await fetch('/api/admin/notifications', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const problem = await readProblemDetail(response, t('users.notifications.genericError'));
      setState({ error: problem.message });
      setPending(false);
      return;
    }

    const body = (await response.json().catch(() => null)) as { recipientCount?: number } | null;

    event.currentTarget.reset();

    setState({
      success: t('users.notifications.success', {
        count: body?.recipientCount ?? 0,
      }),
    });
    setPending(false);
    router.refresh();
  }

  const showAudienceSelector = allowedAudiences.length > 1;
  const showUserSelector = audience === 'user' && !initialTargetUserId;
  const showRoleSelector = audience === 'role';

  return (
    <form onSubmit={handleSubmit} className={['space-y-4', className].filter(Boolean).join(' ')}>
      {showAudienceSelector ? (
        <div className="space-y-2">
          <Label htmlFor="admin-notification-audience">{t('users.notifications.fields.audience')}</Label>
          <select
            id="admin-notification-audience"
            value={audience}
            onChange={(event) => setAudience(event.target.value as NotificationAudience)}
            className={selectClassName}
          >
            {allowedAudiences.map((value) => (
              <option key={value} value={value}>
                {t(`users.notifications.audiences.${value}`)}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {showUserSelector ? (
        <div className="space-y-2">
          <Label htmlFor="admin-notification-user">{t('users.notifications.fields.user')}</Label>
          <select
            id="admin-notification-user"
            name="targetUserId"
            defaultValue={initialTargetUserId ?? userOptions[0]?.id ?? ''}
            className={selectClassName}
            required
          >
            {userOptions.map((user) => (
              <option key={user.id} value={user.id}>
                {user.displayName} | {user.email} | {user.role}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {initialTargetUserId ? (
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 px-4 py-3 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-300">
          <input type="hidden" name="targetUserId" value={initialTargetUserId} />
          <p className="font-medium text-zinc-950 dark:text-zinc-50">{t('users.notifications.directRecipient')}</p>
          <p className="mt-1">{recipientLabel ?? t('users.detail.fallback')}</p>
        </div>
      ) : null}

      {showRoleSelector ? (
        <div className="space-y-2">
          <Label htmlFor="admin-notification-role">{t('users.notifications.fields.role')}</Label>
          <select
            id="admin-notification-role"
            name="targetRole"
            defaultValue={initialTargetRole}
            className={selectClassName}
            required
          >
            {(['SUPERADMIN', 'ADMIN', 'MANAGER', 'USER'] as const).map((role) => (
              <option key={role} value={role}>
                {t(`users.notifications.roles.${role}`)}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="admin-notification-title">{t('users.notifications.fields.title')}</Label>
        <Input
          id="admin-notification-title"
          name="title"
          minLength={3}
          maxLength={120}
          placeholder={t('users.notifications.placeholders.title')}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="admin-notification-body">{t('users.notifications.fields.body')}</Label>
        <Textarea
          id="admin-notification-body"
          name="body"
          minLength={5}
          maxLength={500}
          placeholder={t('users.notifications.placeholders.body')}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="admin-notification-href">{t('users.notifications.fields.href')}</Label>
        <Input
          id="admin-notification-href"
          name="href"
          placeholder={t('users.notifications.placeholders.href')}
          pattern="\/.*"
        />
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{t('users.notifications.hrefHint')}</p>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? t('users.notifications.sending') : t('users.notifications.submit')}
      </Button>

      <div role="status" className="space-y-1">
        {state.error ? <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p> : null}
        {state.success ? <p className="text-sm text-emerald-600 dark:text-emerald-400">{state.success}</p> : null}
      </div>
    </form>
  );
}
