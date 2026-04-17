"use client";

import { motion, useReducedMotion } from "motion/react";

import { cn } from "@moritzbrantner/ui";

import type { StoryNodeData, StoryRenderProps } from "./story-types";

const gradients = [
  "from-cyan-500/30 via-sky-500/15 to-background",
  "from-emerald-500/25 via-teal-500/15 to-background",
  "from-amber-500/25 via-orange-500/15 to-background",
  "from-fuchsia-500/25 via-rose-500/15 to-background",
];

export function StoryDefaultStage<
  TData extends StoryNodeData = StoryNodeData,
>(props: StoryRenderProps<TData>) {
  const { node, currentIndex, progress } = props;
  const reducedMotion = useReducedMotion();
  const CustomScene = node.scene;
  const gradient = gradients[currentIndex % gradients.length];

  if (CustomScene) {
    return <CustomScene {...props} />;
  }

  return (
    <motion.div
      key={node.id}
      className={cn(
        "relative flex min-h-[24rem] overflow-hidden rounded-[2rem] border bg-card text-card-foreground shadow-2xl shadow-black/10",
        node.stageClassName,
      )}
      initial={reducedMotion ? undefined : { opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reducedMotion ? undefined : { opacity: 0, y: -16, scale: 0.98 }}
      transition={{ duration: reducedMotion ? 0 : 0.45, ease: "easeOut" }}
    >
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-br opacity-90",
          gradient,
        )}
      />
      <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.24),transparent_60%)]" />
      <div className="relative z-10 flex flex-1 flex-col justify-between p-8 md:p-10">
        <div>
          {node.eyebrow ? (
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              {node.eyebrow}
            </p>
          ) : null}
          <h3 className="mt-4 max-w-xl text-3xl font-semibold tracking-tight md:text-5xl">
            {node.title}
          </h3>
          {node.body ? (
            <div className="mt-6 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
              {node.body}
            </div>
          ) : null}
        </div>

        <div className="mt-8 flex items-center justify-between gap-4">
          <div className="w-full max-w-sm rounded-full bg-black/10 p-1 dark:bg-white/10">
            <motion.div
              className="h-2 rounded-full bg-foreground"
              animate={{ width: `${Math.max(progress * 100, 8)}%` }}
              transition={{ duration: reducedMotion ? 0 : 0.35, ease: "easeOut" }}
            />
          </div>
          <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
            Scene {currentIndex + 1}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
