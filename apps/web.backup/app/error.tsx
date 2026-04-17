'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html>
      <body className="bg-zinc-50 p-8 text-zinc-950">
        <div className="mx-auto max-w-2xl rounded-[2rem] border border-zinc-200 bg-white p-8 shadow-sm">
          <p className="text-sm uppercase tracking-[0.24em] text-zinc-500">Application error</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Something failed on the server.</h1>
          <p className="mt-3 text-zinc-600">The request has been logged. Retry the render or return to a safe page.</p>
          <button
            type="button"
            onClick={reset}
            className="mt-6 rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
          >
            Retry
          </button>
        </div>
      </body>
    </html>
  );
}
