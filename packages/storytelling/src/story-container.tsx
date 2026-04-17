"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactElement,
} from "react";

import { useMotionValue } from "motion/react";

import { Button, cn } from "@moritzbrantner/ui";

import { StoryProvider } from "./story-context";
import { buildSceneMeta } from "./story-introspection";
import { StoryMinimap } from "./story-minimap";

export type StoryContainerProps = {
  title: string;
  subtitle?: string;
  instructions?: string;
  className?: string;
  ariaLabel?: string;
  children: ReactElement;
};

const DEFAULT_INSTRUCTIONS =
  "Use the story panel scroll, minimap, reset button, or arrow keys to move through the story.";

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

function isTextInputTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;

  const tagName = target.tagName.toLowerCase();

  return (
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select" ||
    target.isContentEditable
  );
}

export function StoryContainer({
  title,
  subtitle,
  instructions = DEFAULT_INSTRUCTIONS,
  className,
  ariaLabel,
  children,
}: StoryContainerProps) {
  const sceneMeta = useMemo(() => buildSceneMeta(children), [children]);
  const sceneCount = sceneMeta.length;
  const maxSceneIndex = Math.max(sceneCount - 1, 0);
  const sceneProgress = useMotionValue(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollToSceneRef = useRef<(index: number) => void>(() => {});

  useEffect(() => {
    setActiveIndex((current) => clamp(current, 0, maxSceneIndex));
    sceneProgress.set(clamp(sceneProgress.get(), 0, maxSceneIndex));
  }, [maxSceneIndex, sceneProgress]);

  const registerScrollToScene = useCallback((callback: (index: number) => void) => {
    scrollToSceneRef.current = callback;
  }, []);

  const scrollToScene = useCallback(
    (index: number) => {
      scrollToSceneRef.current(clamp(index, 0, maxSceneIndex));
    },
    [maxSceneIndex],
  );

  const reset = useCallback(() => {
    sceneProgress.set(0);
    setActiveIndex(0);
    scrollToScene(0);
  }, [sceneProgress, scrollToScene]);

  const progressLabel =
    sceneCount > 0 ? `${activeIndex + 1} / ${sceneCount}` : "0 / 0";
  const showMenu = sceneCount > 1;

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (isTextInputTarget(event.target)) return;

    switch (event.key) {
      case "ArrowDown":
      case "ArrowRight": {
        event.preventDefault();
        scrollToScene(activeIndex + 1);
        return;
      }
      case "ArrowUp":
      case "ArrowLeft": {
        event.preventDefault();
        scrollToScene(activeIndex - 1);
        return;
      }
      case "Home": {
        event.preventDefault();
        scrollToScene(0);
        return;
      }
      case "End": {
        event.preventDefault();
        scrollToScene(maxSceneIndex);
        return;
      }
      default:
        return;
    }
  };

  const contextValue = useMemo(
    () => ({
      sceneMeta,
      activeIndex,
      setActiveIndex,
      sceneCount,
      sceneProgress,
      scrollToScene,
      registerScrollToScene,
      reset,
    }),
    [
      activeIndex,
      registerScrollToScene,
      reset,
      sceneCount,
      sceneMeta,
      sceneProgress,
      scrollToScene,
    ],
  );

  return (
    <StoryProvider value={contextValue}>
      <section
        className={cn(
          "min-h-[70vh] rounded-2xl border bg-card/40 p-6 md:p-10",
          className,
        )}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="region"
        aria-label={ariaLabel ?? title}
      >
        <header className="mx-auto max-w-3xl text-center">
          <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-4 text-muted-foreground">{subtitle}</p>
          ) : null}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
              Step {progressLabel}
            </p>
            {showMenu ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={reset}
                disabled={activeIndex === 0}
              >
                Reset
              </Button>
            ) : null}
          </div>
        </header>

        <div
          className={cn(
            "mx-auto mt-10 max-w-5xl",
            showMenu
              ? "grid gap-6 md:grid-cols-[220px_1fr] md:items-stretch"
              : "",
          )}
        >
          {showMenu ? (
            <StoryMinimap className="order-2 md:order-1" />
          ) : null}

          <div className={cn(showMenu ? "order-1 md:order-2" : "")}>
            {children}
          </div>
        </div>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          {instructions}
        </p>
      </section>
    </StoryProvider>
  );
}
