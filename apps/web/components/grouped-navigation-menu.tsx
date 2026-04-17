'use client';

import { useEffect, useEffectEvent, useRef, useState } from 'react';

import { Link, usePathname } from '@/i18n/navigation';
import { useAppSettings } from '@/src/settings/provider';

type NavigationCategoryKey = 'discover' | 'workspace' | 'admin';

type GroupedNavigationMenuProps = {
  categories: Array<{
    key: NavigationCategoryKey;
    label: string;
    links: Array<{
      href: string;
      label: string;
      hotkey: string;
      prefetch?: boolean;
    }>;
  }>;
};

function matchesPath(pathname: string, href: string) {
  if (href === '/') {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function GroupedNavigationMenu({ categories }: GroupedNavigationMenuProps) {
  const pathname = usePathname();
  const { settings } = useAppSettings();
  const containerRef = useRef<HTMLDivElement>(null);
  const [openState, setOpenState] = useState<{
    key: NavigationCategoryKey;
    pathname: string;
  } | null>(null);

  const activeCategoryKey =
    categories.find((category) => category.links.some((link) => matchesPath(pathname, link.href)))?.key ?? null;

  const openCategoryKey =
    openState &&
    openState.pathname === pathname &&
    categories.some((category) => category.key === openState.key)
      ? openState.key
      : null;

  const openCategory = categories.find((category) => category.key === openCategoryKey) ?? null;

  const handlePointerDown = useEffectEvent((event: PointerEvent) => {
    if (!containerRef.current?.contains(event.target as Node)) {
      setOpenState(null);
    }
  });

  const handleKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      setOpenState(null);
    }
  });

  useEffect(() => {
    if (!openCategoryKey) {
      return;
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openCategoryKey]);

  return (
    <div
      ref={containerRef}
      className="relative min-w-0 overflow-visible"
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setOpenState(null);
        }
      }}
    >
      <div className="flex min-w-0 items-center gap-2 overflow-x-auto pb-1 md:justify-center">
        {categories.map((category) => {
          const isOpen = category.key === openCategoryKey;
          const isActive = category.key === activeCategoryKey;

          return (
            <div key={category.key} className="shrink-0">
              <button
                type="button"
                aria-controls={`navigation-submenu-${category.key}`}
                aria-expanded={isOpen}
                className={[
                  'inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2',
                  isOpen || isActive
                    ? 'border-zinc-900 bg-zinc-900 text-zinc-50 shadow-sm dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-950'
                    : 'border-zinc-200/80 bg-white/80 text-zinc-700 hover:border-zinc-300 hover:text-zinc-950 focus-visible:ring-zinc-900 dark:border-zinc-800 dark:bg-zinc-950/80 dark:text-zinc-200 dark:hover:border-zinc-700 dark:hover:text-zinc-50 dark:focus-visible:ring-zinc-50',
                ].join(' ')}
                onClick={() => {
                  setOpenState((currentOpenState) =>
                    currentOpenState?.key === category.key && currentOpenState.pathname === pathname
                      ? null
                      : { key: category.key, pathname },
                  );
                }}
              >
                <span>{category.label}</span>
                <svg
                  aria-hidden="true"
                  viewBox="0 0 16 16"
                  className={['h-3.5 w-3.5 transition-transform duration-200', isOpen ? 'rotate-180' : undefined]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <path
                    d="M4.25 6.5 8 10.25 11.75 6.5"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                  />
                </svg>
              </button>
            </div>
          );
        })}
      </div>

      {openCategory ? (
        <div
          id={`navigation-submenu-${openCategory.key}`}
          className="absolute left-1/2 top-[calc(100%+0.75rem)] z-30 w-[calc(100vw-2rem)] max-w-5xl -translate-x-1/2 origin-top rounded-[1.75rem] border border-zinc-200/80 bg-white/95 p-3 shadow-[0_32px_90px_-40px_rgba(0,0,0,0.55)] backdrop-blur-xl transition-all duration-200 dark:border-zinc-800 dark:bg-zinc-950/95"
        >
          <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {openCategory.links.map((link) => {
              const isCurrentPage = matchesPath(pathname, link.href);

              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    prefetch={link.prefetch}
                    aria-current={isCurrentPage ? 'page' : undefined}
                    className={[
                      'flex min-h-16 items-center rounded-2xl px-4 py-3 text-sm font-medium transition-colors',
                      isCurrentPage
                        ? 'bg-zinc-900 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-950'
                        : 'bg-zinc-50/90 text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950 dark:bg-zinc-900/80 dark:text-zinc-200 dark:hover:bg-zinc-900 dark:hover:text-zinc-50',
                    ].join(' ')}
                    onClick={() => {
                      setOpenState(null);
                    }}
                  >
                    <span>{link.label}</span>
                    {settings.showHotkeyHints ? (
                      <span
                        aria-hidden="true"
                        className="ml-auto rounded-full border border-zinc-200/80 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-zinc-500 dark:border-zinc-700 dark:text-zinc-400"
                      >
                        {link.hotkey}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
