'use client';

import { useEffect, useRef, useState } from 'react';

import { useRouter } from '@/i18n/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAppSettings } from '@/src/settings/provider';

type NavigationHotkey = readonly [string, string];

type NavigationHotkeyItem = {
  key: string;
  href: string;
  label: string;
  groupLabel: string;
  hotkey: NavigationHotkey;
  hotkeyLabel: string;
  searchText: string;
};

type NavigationHotkeysProps = {
  items: NavigationHotkeyItem[];
  labels: {
    button: string;
    title: string;
    description: string;
    searchPlaceholder: string;
    empty: string;
  };
};

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();
  return tagName === 'input' || tagName === 'textarea' || tagName === 'select' || target.isContentEditable;
}

function getShortcutCode(shortcut: NavigationHotkey) {
  return `Key${shortcut[1].toUpperCase()}`;
}

export function NavigationHotkeys({ items, labels }: NavigationHotkeysProps) {
  const router = useRouter();
  const { settings } = useAppSettings();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) {
      setQuery('');
      return;
    }

    window.setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  }, [open]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (open) {
          setOpen(false);
        }
        return;
      }

      if (isTypingTarget(event.target)) {
        return;
      }

      if ((event.key === '?' && !event.metaKey && !event.ctrlKey) || ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k')) {
        event.preventDefault();
        setOpen((currentOpenState) => !currentOpenState);
        return;
      }

      if (!event.altKey || event.metaKey || event.ctrlKey || event.shiftKey) {
        return;
      }

      const matchingPage = items.find((page) => getShortcutCode(page.hotkey) === event.code);

      if (!matchingPage) {
        return;
      }

      event.preventDefault();
      setOpen(false);
      router.push(matchingPage.href);
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [items, open, router]);

  const groupedPages = items.reduce<Record<string, NavigationHotkeyItem[]>>((groups, page) => {
    groups[page.groupLabel] ??= [];
    groups[page.groupLabel].push(page);
    return groups;
  }, {});

  const normalizedQuery = query.trim().toLowerCase();
  const filteredGroups = Object.entries(groupedPages)
    .map(([groupLabel, groupPages]) => [
      groupLabel,
      groupPages.filter((page) => {
        if (!normalizedQuery) {
          return true;
        }

        return page.searchText.includes(normalizedQuery);
      }),
    ] as const)
    .filter(([, groupPages]) => groupPages.length > 0);

  return (
    <>
      {settings.showHotkeyHints ? (
        <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => setOpen(true)}>
          {labels.button}
          <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
            ?
          </Badge>
        </Button>
      ) : null}

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-zinc-950/45 px-4 py-12 backdrop-blur-sm"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={labels.title}
            className="w-full max-w-2xl overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
              <p className="text-sm font-semibold">{labels.title}</p>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{labels.description}</p>
            </div>

            <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
              <Input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={labels.searchPlaceholder}
                aria-label={labels.searchPlaceholder}
              />
            </div>

            <div className="max-h-[24rem] overflow-y-auto px-3 py-3">
              {filteredGroups.length === 0 ? (
                <p className="rounded-2xl px-3 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">{labels.empty}</p>
              ) : (
                filteredGroups.map(([groupLabel, groupPages]) => (
                  <section key={groupLabel} className="mb-4 last:mb-0">
                    <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
                      {groupLabel}
                    </p>
                    <div className="space-y-1">
                      {groupPages.map((page) => (
                        <button
                          key={page.key}
                          type="button"
                          className="flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-900"
                          onClick={() => {
                            router.push(page.href);
                            setOpen(false);
                          }}
                        >
                          <span className="font-medium">{page.label}</span>
                          <span className="text-xs text-zinc-500 dark:text-zinc-400">{page.hotkeyLabel}</span>
                        </button>
                      ))}
                    </div>
                  </section>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
