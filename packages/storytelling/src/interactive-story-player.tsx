"use client";

import { useEffect, useMemo, useState } from "react";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { Button, cn } from "@moritzbrantner/ui";

import {
  createInteractiveStory,
  getStoryChoices,
  getStoryNode,
  isStoryEnding,
  resolveStoryPath,
} from "./interactive-story";
import { StoryDefaultStage } from "./story-default-stage";
import type {
  InteractiveStoryDefinition,
  StoryChoiceDefinition,
  StoryHistoryEntry,
  StoryNodeData,
  StoryRenderProps,
  StoryStageComponent,
} from "./story-types";

export type InteractiveStoryPlayerProps<
  TData extends StoryNodeData = StoryNodeData,
> = {
  story: InteractiveStoryDefinition<TData>;
  initialChoiceIds?: string[];
  className?: string;
  panelClassName?: string;
  ariaLabel?: string;
  stageRenderer?: StoryStageComponent<TData>;
  onChoice?: (
    choice: StoryChoiceDefinition,
    history: StoryHistoryEntry<TData>[],
  ) => void;
  onPathChange?: (history: StoryHistoryEntry<TData>[]) => void;
};

function buildInitialHistory<TData extends StoryNodeData>(
  story: InteractiveStoryDefinition<TData>,
  initialChoiceIds: string[],
) {
  return resolveStoryPath(story, initialChoiceIds).history as StoryHistoryEntry<TData>[];
}

export function InteractiveStoryPlayer<
  TData extends StoryNodeData = StoryNodeData,
>({
  story: input,
  initialChoiceIds = [],
  className,
  panelClassName,
  ariaLabel,
  stageRenderer,
  onChoice,
  onPathChange,
}: InteractiveStoryPlayerProps<TData>) {
  const story = useMemo(() => createInteractiveStory(input), [input]);
  const initialChoiceKey = initialChoiceIds.join("|");
  const [history, setHistory] = useState<StoryHistoryEntry<TData>[]>(() =>
    buildInitialHistory(story, initialChoiceIds),
  );
  const reducedMotion = useReducedMotion();
  const currentNodeId = history[history.length - 1]?.nodeId ?? story.openingNodeId;
  const currentNode = getStoryNode(story, currentNodeId);
  const choices = getStoryChoices(currentNode);
  const ending = isStoryEnding(currentNode);
  const progress = history.length / Math.max(story.nodes.length, 1);
  const canGoBack = history.length > 1;
  const StageRenderer = (stageRenderer ?? StoryDefaultStage) as StoryStageComponent<TData>;

  useEffect(() => {
    setHistory(buildInitialHistory(story, initialChoiceIds));
  }, [initialChoiceKey, story]);

  useEffect(() => {
    onPathChange?.(history);
  }, [history, onPathChange]);

  const choose = (choiceId: string) => {
    const choice = choices.find((entry) => entry.id === choiceId && !entry.disabled);
    if (!choice) return;

    const nextNode = getStoryNode(story, choice.target);
    const nextHistory = [
      ...history,
      {
        nodeId: nextNode.id,
        choiceId: choice.id,
        data: nextNode.data,
      },
    ];

    setHistory(nextHistory);
    onChoice?.(choice, nextHistory);
  };

  const goBack = () => {
    if (!canGoBack) return;
    setHistory(history.slice(0, -1));
  };

  const restart = () => {
    const openingNode = getStoryNode(story, story.openingNodeId);

    setHistory([{ nodeId: openingNode.id, data: openingNode.data }]);
  };

  const renderProps: StoryRenderProps<TData> = {
    story,
    node: currentNode,
    history,
    currentIndex: history.length - 1,
    progress,
    isEnding: ending,
    canGoBack,
    choose,
    goBack,
    restart,
  };

  return (
    <section
      role="region"
      className={cn(
        "overflow-hidden rounded-[2rem] border bg-card/70 shadow-2xl shadow-black/5 backdrop-blur",
        className,
      )}
      aria-label={ariaLabel ?? story.title}
    >
      <div className="border-b border-border/60 px-6 py-5 md:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
              Interactive story package
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">
              {story.title}
            </h2>
            {story.subtitle ? (
              <p className="mt-2 text-sm leading-6 text-muted-foreground md:text-base">
                {story.subtitle}
              </p>
            ) : null}
          </div>

          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-muted-foreground">
            <span>Scene {history.length}</span>
            <span aria-hidden="true">/</span>
            <span>{story.nodes.length}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="p-6 md:p-8">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={currentNode.id}
              initial={reducedMotion ? undefined : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reducedMotion ? undefined : { opacity: 0, y: -12 }}
              transition={{ duration: reducedMotion ? 0 : 0.35, ease: "easeOut" }}
            >
              <StageRenderer {...renderProps} />
            </motion.div>
          </AnimatePresence>
        </div>

        <div
          className={cn(
            "border-t border-border/60 bg-background/70 p-6 lg:border-l lg:border-t-0 md:p-8",
            panelClassName,
            currentNode.panelClassName,
          )}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={currentNode.id}
              initial={reducedMotion ? undefined : { opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reducedMotion ? undefined : { opacity: 0, x: -8 }}
              transition={{ duration: reducedMotion ? 0 : 0.3, ease: "easeOut" }}
              className={cn("flex h-full flex-col", currentNode.className)}
            >
              {currentNode.eyebrow ? (
                <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
                  {currentNode.eyebrow}
                </p>
              ) : null}
              <h3 className="mt-3 text-2xl font-semibold tracking-tight">
                {currentNode.title}
              </h3>
              {currentNode.body ? (
                <div className="mt-4 text-sm leading-7 text-muted-foreground md:text-base">
                  {currentNode.body}
                </div>
              ) : null}
              <div className="mt-8 rounded-[1.5rem] border bg-card/70 p-5">
                <p className="text-sm font-medium">
                  {currentNode.prompt ?? (ending ? "This branch is complete." : "Choose what happens next.")}
                </p>
                <div className="mt-4 space-y-3">
                  {choices.length > 0 ? (
                    choices.map((choice) => (
                      <button
                        key={choice.id}
                        type="button"
                        onClick={() => choose(choice.id)}
                        disabled={choice.disabled}
                        className={cn(
                          "w-full rounded-[1.25rem] border bg-background px-4 py-3 text-left transition-colors",
                          "hover:border-foreground/40 hover:bg-accent",
                          "disabled:cursor-not-allowed disabled:opacity-50",
                        )}
                      >
                        <span className="block text-sm font-medium">
                          {choice.label}
                        </span>
                        {choice.description ? (
                          <span className="mt-1 block text-sm text-muted-foreground">
                            {choice.description}
                          </span>
                        ) : null}
                      </button>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Restart to explore another branch, or go back to choose a different path.
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={goBack}
                  disabled={!canGoBack}
                >
                  {story.backLabel ?? "Go back"}
                </Button>
                <Button type="button" variant="secondary" onClick={restart}>
                  {story.restartLabel ?? "Restart"}
                </Button>
              </div>

              <div className="mt-auto pt-8">
                <div className="rounded-full bg-muted p-1">
                  <motion.div
                    className="h-2 rounded-full bg-foreground"
                    animate={{ width: `${Math.max(progress * 100, 10)}%` }}
                    transition={{ duration: reducedMotion ? 0 : 0.3, ease: "easeOut" }}
                  />
                </div>
                <ol className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {history.map((entry, index) => {
                    const node = getStoryNode(story, entry.nodeId);

                    return (
                      <li
                        key={`${entry.nodeId}-${index}`}
                        className={cn(
                          "rounded-full border px-3 py-1",
                          index === history.length - 1
                            ? "border-foreground text-foreground"
                            : "border-border",
                        )}
                      >
                        {node.title}
                      </li>
                    );
                  })}
                </ol>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
