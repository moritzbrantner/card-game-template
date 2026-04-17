const cubeFaces = [
  'translate-z-[84px]',
  'rotate-y-180 translate-z-[84px]',
  'rotate-y-90 translate-z-[84px]',
  '-rotate-y-90 translate-z-[84px]',
  'rotate-x-90 translate-z-[84px]',
  '-rotate-x-90 translate-z-[84px]',
];

export function ThreeShowcase() {
  return (
    <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="relative min-h-96 overflow-hidden rounded-3xl border border-zinc-200 bg-[radial-gradient(circle_at_top,#fde68a,transparent_28%),radial-gradient(circle_at_bottom,#67e8f9,transparent_24%),linear-gradient(160deg,#09090b,#18181b_40%,#0f172a)] p-8 dark:border-zinc-800">
        <div className="absolute inset-x-10 top-10 h-32 rounded-full bg-amber-200/20 blur-3xl" />
        <div className="absolute bottom-8 left-1/2 h-24 w-64 -translate-x-1/2 rounded-full bg-cyan-300/20 blur-3xl" />
        <div className="flex h-full items-center justify-center [perspective:1200px]">
          <div className="relative h-44 w-44 [transform-style:preserve-3d] animate-[spin-cube_14s_linear_infinite]">
            {cubeFaces.map((face, index) => (
              <span
                key={face}
                className={[
                  'absolute inset-0 rounded-[2rem] border border-white/25 bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] backdrop-blur-sm',
                  face,
                  index % 2 === 0 ? 'bg-cyan-300/20' : 'bg-amber-200/20',
                ].join(' ')}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        <article className="rounded-3xl border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500 dark:text-zinc-400">
            Three.js lane
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">Reserve a space for 3D work</h2>
          <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
            Keep a dedicated route for lighting studies, model viewers, camera experiments, and interaction proofs before
            they enter product flows.
          </p>
        </article>

        <article className="rounded-3xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <h3 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">What belongs here next</h3>
          <ul className="mt-4 space-y-3 text-sm text-zinc-600 dark:text-zinc-300">
            <li>GLTF model previews with product annotations.</li>
            <li>Lighting and material comparisons for branded surfaces.</li>
            <li>Scroll-tied scenes before they graduate into the story demo.</li>
          </ul>
        </article>
      </div>
    </section>
  );
}
