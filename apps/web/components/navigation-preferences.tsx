'use client';

import dynamic from 'next/dynamic';

const LanguageSelector = dynamic(
  () => import('@/components/language-selector').then((mod) => mod.LanguageSelector),
  {
    loading: () => (
      <div
        aria-hidden="true"
        className="h-8 w-[5.5rem] rounded-full border border-zinc-200 bg-white/80 dark:border-zinc-800 dark:bg-zinc-950/80"
      />
    ),
  },
);

const ThemeToggle = dynamic(
  () => import('@/components/theme-toggle').then((mod) => mod.ThemeToggle),
  {
    loading: () => (
      <div
        aria-hidden="true"
        className="h-8 w-16 rounded-md border border-transparent bg-zinc-100 dark:bg-zinc-900"
      />
    ),
  },
);

export function NavigationPreferences() {
  return (
    <>
      <LanguageSelector />
      <ThemeToggle />
    </>
  );
}
