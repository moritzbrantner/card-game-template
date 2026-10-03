'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { useRouter } from '@/i18n/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  formatInputSequence,
  NAVIGATION_CONTEXT_ID,
  NAVIGATION_PALETTE_ACTION_ID,
  navigationActionId,
  navigationPageContextId,
} from '@/src/input-bindings/foundation';
import { useInputBindings } from '@/src/input-bindings/provider';
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

export function NavigationHotkeys({ items, labels }: NavigationHotkeysProps) {
  const router = useRouter();
  const { settings } = useAppSettings();
  const { browserModule, registry, profile, report, status } =
    useInputBindings();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  const hotkeyLabelsByAction = useMemo(() => {
    const labelsByAction = new Map<string, string>();
    for (const binding of report?.effectiveBindings ?? []) {
      if (!labelsByAction.has(binding.action)) {
        labelsByAction.set(
          binding.action,
          formatInputSequence(binding.sequence),
        );
      }
    }
    return labelsByAction;
  }, [report]);

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
    if (!open) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [open]);

  useEffect(() => {
    if (!browserModule || status !== 'ready') {
      return;
    }

    const activeContexts = new Set([
      NAVIGATION_CONTEXT_ID,
      ...items.map((item) => navigationPageContextId(item.key)),
    ]);
    const hrefByAction = new Map(
      items.map((item) => [navigationActionId(item.key), item.href]),
    );
    const controller = new browserModule.InputRuntimeController({
      registry,
      profile,
      getActiveContexts: () => activeContexts,
      chordTimeoutMs: 900,
      consumePolicy: 'matched',
      onDispatch: (dispatch) => {
        if (dispatch.phase !== 'press') {
          return;
        }
        if (dispatch.action === NAVIGATION_PALETTE_ACTION_ID) {
          setOpen((currentOpenState) => !currentOpenState);
          return;
        }

        const href = hrefByAction.get(dispatch.action);
        if (href) {
          setOpen(false);
          router.push(href);
        }
      },
    });

    return browserModule.attachKeyboardRuntime(controller, {
      keyTarget: document,
      focusTarget: window,
      visibilityTarget: document,
      ignoreTextEntry: true,
      mode: 'physical',
    });
  }, [browserModule, items, profile, registry, router, status]);

  const groupedPages = items.reduce<Record<string, NavigationHotkeyItem[]>>(
    (groups, page) => {
      groups[page.groupLabel] ??= [];
      groups[page.groupLabel].push(page);
      return groups;
    },
    {},
  );

  const normalizedQuery = query.trim().toLowerCase();
  const filteredGroups = Object.entries(groupedPages)
    .map(
      ([groupLabel, groupPages]) =>
        [
          groupLabel,
          groupPages.filter((page) => {
            if (!normalizedQuery) {
              return true;
            }

            return page.searchText.includes(normalizedQuery);
          }),
        ] as const,
    )
    .filter(([, groupPages]) => groupPages.length > 0);

  return (
    <>
      {settings.showHotkeyHints ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => setOpen(true)}
        >
          {labels.button}
          <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
            {hotkeyLabelsByAction.get(NAVIGATION_PALETTE_ACTION_ID) ?? '?'}
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
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                {labels.description}
              </p>
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
                <p className="rounded-2xl px-3 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
                  {labels.empty}
                </p>
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
                          <span className="text-xs text-zinc-500 dark:text-zinc-400">
                            {hotkeyLabelsByAction.get(
                              navigationActionId(page.key),
                            ) ?? page.hotkeyLabel}
                          </span>
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
