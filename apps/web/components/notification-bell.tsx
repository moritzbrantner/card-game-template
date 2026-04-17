'use client';

import { useOptimistic, useState } from 'react';

import { Link } from '@/i18n/navigation';
import { MarkNotificationReadButton } from '@/components/notifications/mark-notification-read-button';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import type { NotificationFeedItem } from '@/src/domain/notifications/use-cases';
import { useTranslations } from '@/src/i18n';

type NotificationBellProps = {
  items: NotificationFeedItem[];
  unreadCount: number;
};

type NotificationBellState = {
  items: NotificationFeedItem[];
  unreadCount: number;
};

export function NotificationBell({ items, unreadCount }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const navigationT = useTranslations('NavigationBar');
  const [state, applyOptimisticUpdate] = useOptimistic<NotificationBellState, string>(
    { items, unreadCount },
    (currentState, notificationId) => {
      const target = currentState.items.find((item) => item.id === notificationId);

      if (!target || target.status === 'read') {
        return currentState;
      }

      return {
        items: currentState.items.map((item) =>
          item.id === notificationId ? { ...item, status: 'read' } : item,
        ),
        unreadCount: Math.max(0, currentState.unreadCount - 1),
      };
    },
  );

  return (
    <div
      className="relative"
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setOpen(false);
        }
      }}
    >
      <button
        type="button"
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
        aria-label={navigationT('notifications.button', { count: state.unreadCount })}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((current) => !current)}
      >
        <BellIcon />
        {state.unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-semibold leading-5 text-white">
            {state.unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-20 mt-2 w-80 rounded-2xl border border-zinc-200 bg-white p-3 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          <div className="flex items-center justify-between gap-3 border-b border-zinc-200 pb-3 dark:border-zinc-800">
            <div>
              <p className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                {navigationT('notifications.title')}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {navigationT('notifications.subtitle', { count: state.unreadCount })}
              </p>
            </div>
            {state.unreadCount > 0 ? <Badge>{state.unreadCount}</Badge> : null}
          </div>

          <div className="mt-3 space-y-2">
            {state.items.length > 0 ? (
              state.items.map((item) => {
                const content = (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-zinc-950 dark:text-zinc-50">
                          {item.title}
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          {formatNotificationDate(item.createdAt)}
                        </p>
                      </div>
                      {item.status === 'unread' ? <span className="mt-1 h-2.5 w-2.5 rounded-full bg-red-500" /> : null}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                      {item.body}
                    </p>
                  </>
                );

                return (
                  <article
                    key={item.id}
                    className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-3 dark:border-zinc-800 dark:bg-zinc-950"
                  >
                    {item.href ? (
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className="block transition-colors hover:text-zinc-950 dark:hover:text-zinc-50"
                      >
                        {content}
                      </Link>
                    ) : (
                      content
                    )}

                    {item.status === 'unread' ? (
                      <MarkNotificationReadButton
                        notificationId={item.id}
                        label={navigationT('notifications.markRead')}
                        pendingLabel={navigationT('notifications.markingRead')}
                        errorLabel={navigationT('notifications.markReadError')}
                        onSuccess={() => {
                          applyOptimisticUpdate(item.id);
                        }}
                        className="mt-3 px-0 text-xs"
                        errorClassName="text-xs text-red-600 dark:text-red-400"
                      />
                    ) : null}
                  </article>
                );
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-zinc-200 px-4 py-6 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                {navigationT('notifications.empty')}
              </div>
            )}
          </div>

          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className={buttonVariants({
              variant: 'ghost',
              size: 'sm',
              className: 'mt-3 w-full justify-center',
            })}
          >
            {navigationT('notifications.viewAll')}
          </Link>
        </div>
      ) : null}
    </div>
  );
}

function formatNotificationDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function BellIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4.5 w-4.5"
    >
      <path d="M15 18H9" />
      <path d="M18 16V11C18 7.686 15.314 5 12 5C8.686 5 6 7.686 6 11V16L4 18H20L18 16Z" />
    </svg>
  );
}
