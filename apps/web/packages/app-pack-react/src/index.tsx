type StaticRedirectPageProps = {
  href: string;
  title?: string;
  ctaLabel?: string;
};

export function StaticRedirectPage({
  href,
  title = 'Redirecting...',
  ctaLabel = 'Continue',
}: StaticRedirectPageProps) {
  const redirectScript = `window.location.replace(new URL(${JSON.stringify(href)}, window.location.href).toString());`;

  return (
    <section className="mx-auto flex min-h-[50vh] max-w-xl flex-col items-center justify-center gap-4 px-6 text-center">
      <script dangerouslySetInnerHTML={{ __html: redirectScript }} />
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
        {title}
      </h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        <a
          href={href}
          className="inline-flex rounded-full border border-zinc-300 px-4 py-2 font-medium text-zinc-950 dark:border-zinc-700 dark:text-zinc-50"
        >
          {ctaLabel}
        </a>
      </p>
    </section>
  );
}
