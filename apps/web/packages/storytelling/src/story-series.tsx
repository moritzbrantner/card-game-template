"use client";

import { useCallback, useEffect, useMemo, useRef, type ReactNode } from "react";

import {
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";

import { cn } from "@moritzbrantner/ui";

import { useStoryContext } from "./story-context";
import { getStorySceneElements } from "./story-introspection";

export type StorySeriesProps = {
  children: ReactNode;
  className?: string;
  viewportClassName?: string;
  ariaLabel?: string;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

function StorySeriesComponent({
  children,
  className,
  viewportClassName = "h-[26rem] md:h-[70vh]",
  ariaLabel,
}: StorySeriesProps) {
  const {
    sceneCount,
    setActiveIndex,
    sceneProgress,
    registerScrollToScene,
  } = useStoryContext("StorySeries");
  const seriesRef = useRef<HTMLDivElement | null>(null);
  const reducedMotion = useReducedMotion();
  const sceneElements = useMemo(() => getStorySceneElements(children), [children]);
  const maxSceneIndex = Math.max(sceneCount - 1, 0);
  const { scrollYProgress } = useScroll({ container: seriesRef });
  const springProgress = useSpring(scrollYProgress, {
    stiffness: 180,
    damping: 28,
    mass: 0.2,
  });
  const smoothSceneProgress = useTransform(
    springProgress,
    (value) => value * maxSceneIndex,
  );
  const reducedMotionProgress = useTransform(
    scrollYProgress,
    (value) => Math.round(value * maxSceneIndex),
  );

  useMotionValueEvent(
    reducedMotion ? reducedMotionProgress : smoothSceneProgress,
    "change",
    (latest) => {
      const nextProgress = clamp(latest, 0, maxSceneIndex);
      const nextActiveIndex = clamp(Math.round(nextProgress), 0, maxSceneIndex);

      sceneProgress.set(nextProgress);
      setActiveIndex((current) =>
        current === nextActiveIndex ? current : nextActiveIndex,
      );
    },
  );

  const scrollToScene = useCallback(
    (index: number) => {
      const element = seriesRef.current;
      if (!element) return;

      const nextIndex = clamp(index, 0, maxSceneIndex);
      const maxScroll = Math.max(element.scrollHeight - element.clientHeight, 0);
      const target =
        maxSceneIndex === 0 ? 0 : (nextIndex / maxSceneIndex) * maxScroll;

      element.scrollTo({
        top: target,
        behavior: reducedMotion ? "auto" : "smooth",
      });
    },
    [maxSceneIndex, reducedMotion],
  );

  useEffect(() => {
    registerScrollToScene(scrollToScene);

    return () => {
      registerScrollToScene(() => {});
    };
  }, [registerScrollToScene, scrollToScene]);

  return (
    <div
      ref={seriesRef}
      role="region"
      aria-label={ariaLabel}
      className={cn(
        "story-steps-scrollbar-hidden relative overflow-y-auto overscroll-contain",
        viewportClassName,
        className,
      )}
    >
      <div
        className="relative"
        style={{ height: `${Math.max(sceneCount, 1) * 100}%` }}
      >
        <div
          className={cn(
            "sticky top-0 z-10 overflow-hidden rounded-xl border bg-background",
            viewportClassName,
          )}
        >
          {sceneElements}
        </div>
      </div>
    </div>
  );
}

export const StorySeries = StorySeriesComponent;
