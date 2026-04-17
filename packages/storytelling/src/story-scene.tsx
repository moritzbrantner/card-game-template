"use client";

import { motion, useReducedMotion, useTransform } from "motion/react";

import { cn } from "@moritzbrantner/ui";

import { useStoryContext } from "./story-context";
import type { StorySceneProps } from "./story-types";

const isDevelopment = process.env.NODE_ENV !== "production";

function StorySceneComponent({
  id,
  title,
  eyebrow,
  children,
  className,
}: StorySceneProps) {
  const { sceneMeta, sceneProgress, activeIndex } = useStoryContext("StoryScene");
  const reducedMotion = useReducedMotion();
  const index = sceneMeta.findIndex((scene) => scene.id === id);

  if (index === -1) {
    if (isDevelopment) {
      throw new Error(`StoryScene with id "${id}" is not registered.`);
    }

    return null;
  }

  const isActive = activeIndex === index;
  const opacity = useTransform(
    sceneProgress,
    [index - 0.45, index, index + 0.45],
    [0, 1, 0],
    { clamp: true },
  );
  const y = useTransform(
    sceneProgress,
    [index - 0.45, index, index + 0.45],
    [24, 0, -24],
    { clamp: true },
  );
  const scale = useTransform(
    sceneProgress,
    [index - 0.45, index, index + 0.45],
    [0.985, 1, 0.985],
    { clamp: true },
  );

  return (
    <motion.article
      className={cn(
        "absolute inset-0 flex flex-col justify-center p-6",
        isActive ? "pointer-events-auto z-10" : "pointer-events-none z-0",
        className,
      )}
      style={reducedMotion ? undefined : { opacity, y, scale }}
      animate={
        reducedMotion
          ? {
              opacity: isActive ? 1 : 0,
              y: 0,
              scale: 1,
            }
          : undefined
      }
      transition={reducedMotion ? { duration: 0 } : undefined}
      aria-hidden={!isActive}
    >
      {eyebrow ? (
        <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="mt-2 text-2xl font-semibold tracking-tight">{title}</h2>
      <div className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
        {children}
      </div>
    </motion.article>
  );
}

export const StoryScene = StorySceneComponent;
