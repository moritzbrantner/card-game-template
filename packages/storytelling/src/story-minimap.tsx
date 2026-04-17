"use client";

import { motion, useTransform } from "motion/react";

import { cn } from "@moritzbrantner/ui";

import { useStoryContext } from "./story-context";

export type StoryMinimapProps = {
  className?: string;
  ariaLabel?: string;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

function StoryMinimapComponent({
  className,
  ariaLabel = "Story minimap",
}: StoryMinimapProps) {
  const {
    sceneMeta,
    activeIndex,
    sceneCount,
    sceneProgress,
    scrollToScene,
  } = useStoryContext("StoryMinimap");
  const maxSceneIndex = Math.max(sceneCount - 1, 0);
  const railProgress = useTransform(sceneProgress, (value) =>
    maxSceneIndex === 0 ? 1 : clamp(value / maxSceneIndex, 0, 1),
  );

  if (sceneCount < 2) {
    return null;
  }

  return (
    <nav
      className={cn(
        "rounded-2xl border bg-background/70 p-3 shadow-sm backdrop-blur-sm",
        className,
      )}
      aria-label={ariaLabel}
    >
      <div className="mb-3 flex items-center justify-between gap-3 px-1">
        <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-foreground">
          Minimap
        </p>
        <p className="text-xs text-muted-foreground">
          {activeIndex + 1} / {sceneCount}
        </p>
      </div>

      <div className="relative">
        <div
          className="absolute bottom-4 left-4 top-4 hidden w-px bg-border md:block"
          aria-hidden="true"
        />
        <motion.div
          className="absolute bottom-4 left-4 top-4 hidden w-px origin-top bg-foreground md:block"
          aria-hidden="true"
          style={{ scaleY: railProgress }}
        />

        <ol className="story-steps-scrollbar-hidden relative flex gap-3 overflow-x-auto px-1 pb-1 md:flex-col md:gap-2 md:overflow-visible md:px-0 md:pb-0">
          {sceneMeta.map((scene, index) => {
            const isActive = index === activeIndex;
            const isComplete = index < activeIndex;

            return (
              <li key={scene.id} className="shrink-0 md:shrink">
                <button
                  type="button"
                  className={cn(
                    "flex min-w-[10rem] items-start gap-3 rounded-xl border px-3 py-3 text-left transition-colors md:min-w-0 md:w-full md:items-center",
                    isActive
                      ? "border-foreground/15 bg-foreground text-background"
                      : "border-transparent text-muted-foreground hover:border-border hover:bg-muted/70 hover:text-foreground",
                  )}
                  onClick={() => scrollToScene(index)}
                  aria-current={isActive ? "step" : undefined}
                  aria-label={`Go to scene ${index + 1}: ${scene.title}`}
                >
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors",
                      isActive
                        ? "border-background/25 bg-background/10 text-background"
                        : isComplete
                          ? "border-foreground/20 bg-foreground/10 text-foreground"
                          : "border-border bg-background text-muted-foreground",
                    )}
                    aria-hidden="true"
                  >
                    {index + 1}
                  </span>

                  <span className="min-w-0">
                    <span
                      className={cn(
                        "block text-[11px] uppercase tracking-[0.18em]",
                        isActive ? "text-background/70" : "text-muted-foreground",
                      )}
                    >
                      {scene.menuLabel ?? scene.eyebrow ?? `Scene ${index + 1}`}
                    </span>
                    <span className="mt-1 block max-w-40 text-sm font-medium leading-5 md:max-w-none">
                      {scene.title}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}

export const StoryMinimap = StoryMinimapComponent;
