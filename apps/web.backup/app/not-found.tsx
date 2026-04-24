import Link from 'next/link';

import { routing } from '@/i18n/routing';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl rounded-[2rem] border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <p className="text-sm uppercase tracking-[0.24em] text-zinc-500">
        Not found
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">
        The page does not exist.
      </h1>
      <p className="mt-3 text-zinc-600 dark:text-zinc-300">
        Use the main navigation or return to the localized home page.
      </p>
      <Link
        href={`/${routing.defaultLocale}`}
        className="mt-6 inline-flex rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-950"
      >
        Go home
      </Link>
    </div>
  );
}
