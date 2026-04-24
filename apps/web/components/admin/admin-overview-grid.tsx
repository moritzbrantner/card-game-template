'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

import { createSwapy, utils, type SlotItemMapArray, type Swapy } from 'swapy';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import {
  ADMIN_OVERVIEW_LAYOUT_STORAGE_KEY,
  areAdminOverviewLayoutsEqual,
  buildDefaultAdminOverviewLayout,
  parseAdminOverviewLayout,
  serializeAdminOverviewLayout,
  type AdminOverviewLayoutEntry,
} from '@/src/admin/overview-layout';
import { useTranslations } from '@/src/i18n';

type AdminOverviewWorkspace = {
  key: string;
  href: string;
  title: string;
  description: string;
};

type AdminOverviewGridProps = {
  pages: AdminOverviewWorkspace[];
};

const ADMIN_OVERVIEW_LAYOUT_EVENT = 'admin-overview-layout-change';

export function AdminOverviewGrid({ pages }: AdminOverviewGridProps) {
  const t = useTranslations('AdminPage');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const swapyRef = useRef<Swapy | null>(null);
  const pageIds = pages.map((page) => page.key);
  const defaultLayout = buildDefaultAdminOverviewLayout(pageIds);
  const [draftLayout, setDraftLayout] =
    useState<AdminOverviewLayoutEntry[]>(defaultLayout);
  const [isEditing, setIsEditing] = useState(false);
  const savedLayoutSnapshot = useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === 'undefined') {
        return () => undefined;
      }

      function handleChange() {
        onStoreChange();
      }

      window.addEventListener('storage', handleChange);
      window.addEventListener(ADMIN_OVERVIEW_LAYOUT_EVENT, handleChange);

      return () => {
        window.removeEventListener('storage', handleChange);
        window.removeEventListener(ADMIN_OVERVIEW_LAYOUT_EVENT, handleChange);
      };
    },
    () => window.localStorage.getItem(ADMIN_OVERVIEW_LAYOUT_STORAGE_KEY),
    () => null,
  );
  const savedLayout = parseAdminOverviewLayout(savedLayoutSnapshot, pageIds);

  useEffect(() => {
    if (!isEditing || !containerRef.current) {
      return;
    }

    const swapy = createSwapy(containerRef.current, {
      animation: 'dynamic',
      manualSwap: true,
      swapMode: 'drop',
    });

    swapy.onSwap((event) => {
      setDraftLayout(event.newSlotItemMap.asArray as SlotItemMapArray);
    });

    swapyRef.current = swapy;

    return () => {
      swapy.destroy();
      swapyRef.current = null;
    };
  }, [isEditing]);

  useEffect(() => {
    if (!isEditing) {
      return;
    }

    utils.dynamicSwapy(
      swapyRef.current,
      pages,
      'key',
      draftLayout,
      setDraftLayout,
    );
  }, [draftLayout, isEditing, pages]);

  const hasUnsavedChanges = !areAdminOverviewLayoutsEqual(
    savedLayout,
    draftLayout,
  );
  const layout = isEditing ? draftLayout : savedLayout;
  const slottedPages = utils.toSlottedItems(pages, 'key', layout);

  function handleEditStart() {
    setDraftLayout(savedLayout);
    setIsEditing(true);
  }

  function handleCancel() {
    setDraftLayout(savedLayout);
    setIsEditing(false);
  }

  function handleReset() {
    setDraftLayout(defaultLayout);
  }

  function handleSave() {
    const nextLayout = draftLayout;

    window.localStorage.setItem(
      ADMIN_OVERVIEW_LAYOUT_STORAGE_KEY,
      serializeAdminOverviewLayout(nextLayout),
    );
    window.dispatchEvent(new Event(ADMIN_OVERVIEW_LAYOUT_EVENT));
    setIsEditing(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-3xl border border-zinc-200 bg-white/70 p-4 dark:border-zinc-800 dark:bg-zinc-950/60">
        <div className="space-y-1">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
            {t('overview.layoutTitle')}
          </p>
          <p className="max-w-2xl text-sm text-zinc-600 dark:text-zinc-300">
            {isEditing
              ? t('overview.editHint')
              : t('overview.layoutDescription')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isEditing ? (
            <>
              <Button type="button" variant="ghost" onClick={handleReset}>
                {t('overview.resetLayout')}
              </Button>
              <Button type="button" variant="outline" onClick={handleCancel}>
                {t('overview.cancelEditing')}
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={!hasUnsavedChanges}
              >
                {t('overview.saveLayout')}
              </Button>
            </>
          ) : (
            <Button type="button" variant="outline" onClick={handleEditStart}>
              {t('overview.editLayout')}
            </Button>
          )}
        </div>
      </div>

      <div ref={containerRef} className="grid gap-4 md:grid-cols-2">
        {slottedPages.map(({ slotId, itemId, item }) => {
          if (!item) {
            return null;
          }

          return (
            <div
              key={slotId}
              data-swapy-slot={slotId}
              className={[
                'rounded-3xl transition-colors',
                isEditing ? 'bg-emerald-50/70 p-1 dark:bg-emerald-950/20' : '',
              ].join(' ')}
            >
              <div
                data-swapy-item={itemId}
                className={[
                  'h-full',
                  isEditing ? 'cursor-grab active:cursor-grabbing' : '',
                ].join(' ')}
              >
                <Card
                  className={
                    isEditing
                      ? 'h-full border-emerald-200 dark:border-emerald-900'
                      : 'h-full'
                  }
                >
                  <CardHeader className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-2">
                        <CardTitle>{item.title}</CardTitle>
                        <CardDescription>{item.description}</CardDescription>
                      </div>
                      {isEditing ? (
                        <button
                          type="button"
                          data-swapy-handle
                          className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
                          aria-label={t('overview.dragHandle')}
                        >
                          {t('overview.dragAction')}
                        </button>
                      ) : null}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Link
                      href={item.href}
                      data-swapy-no-drag
                      className="inline-block text-sm font-semibold text-emerald-600 hover:underline dark:text-emerald-400"
                    >
                      {t('overview.openWorkspace')}
                    </Link>
                  </CardContent>
                </Card>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
