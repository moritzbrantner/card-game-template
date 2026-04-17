"use client";
import {
  buildStoryTimeline,
  createInteractiveStory,
  getStoryChoices,
  getStoryNode,
  isStoryEnding,
  resolveStoryPath
} from "./chunk-MTPAAM4Q.js";

// src/interactive-story-player.tsx
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion as motion2, useReducedMotion as useReducedMotion2 } from "motion/react";
import { Button, cn as cn2 } from "@moritzbrantner/ui";

// src/story-default-stage.tsx
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@moritzbrantner/ui";
import { jsx, jsxs } from "react/jsx-runtime";
var gradients = [
  "from-cyan-500/30 via-sky-500/15 to-background",
  "from-emerald-500/25 via-teal-500/15 to-background",
  "from-amber-500/25 via-orange-500/15 to-background",
  "from-fuchsia-500/25 via-rose-500/15 to-background"
];
function StoryDefaultStage(props) {
  const { node, currentIndex, progress } = props;
  const reducedMotion = useReducedMotion();
  const CustomScene = node.scene;
  const gradient = gradients[currentIndex % gradients.length];
  if (CustomScene) {
    return /* @__PURE__ */ jsx(CustomScene, { ...props });
  }
  return /* @__PURE__ */ jsxs(
    motion.div,
    {
      className: cn(
        "relative flex min-h-[24rem] overflow-hidden rounded-[2rem] border bg-card text-card-foreground shadow-2xl shadow-black/10",
        node.stageClassName
      ),
      initial: reducedMotion ? void 0 : { opacity: 0, y: 20, scale: 0.98 },
      animate: { opacity: 1, y: 0, scale: 1 },
      exit: reducedMotion ? void 0 : { opacity: 0, y: -16, scale: 0.98 },
      transition: { duration: reducedMotion ? 0 : 0.45, ease: "easeOut" },
      children: [
        /* @__PURE__ */ jsx(
          "div",
          {
            className: cn(
              "absolute inset-0 bg-gradient-to-br opacity-90",
              gradient
            )
          }
        ),
        /* @__PURE__ */ jsx("div", { className: "absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.24),transparent_60%)]" }),
        /* @__PURE__ */ jsxs("div", { className: "relative z-10 flex flex-1 flex-col justify-between p-8 md:p-10", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            node.eyebrow ? /* @__PURE__ */ jsx("p", { className: "text-xs uppercase tracking-[0.3em] text-muted-foreground", children: node.eyebrow }) : null,
            /* @__PURE__ */ jsx("h3", { className: "mt-4 max-w-xl text-3xl font-semibold tracking-tight md:text-5xl", children: node.title }),
            node.body ? /* @__PURE__ */ jsx("div", { className: "mt-6 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base", children: node.body }) : null
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "mt-8 flex items-center justify-between gap-4", children: [
            /* @__PURE__ */ jsx("div", { className: "w-full max-w-sm rounded-full bg-black/10 p-1 dark:bg-white/10", children: /* @__PURE__ */ jsx(
              motion.div,
              {
                className: "h-2 rounded-full bg-foreground",
                animate: { width: `${Math.max(progress * 100, 8)}%` },
                transition: { duration: reducedMotion ? 0 : 0.35, ease: "easeOut" }
              }
            ) }),
            /* @__PURE__ */ jsxs("p", { className: "text-xs uppercase tracking-[0.24em] text-muted-foreground", children: [
              "Scene ",
              currentIndex + 1
            ] })
          ] })
        ] })
      ]
    },
    node.id
  );
}

// src/interactive-story-player.tsx
import { jsx as jsx2, jsxs as jsxs2 } from "react/jsx-runtime";
function buildInitialHistory(story, initialChoiceIds) {
  return resolveStoryPath(story, initialChoiceIds).history;
}
function InteractiveStoryPlayer({
  story: input,
  initialChoiceIds = [],
  className,
  panelClassName,
  ariaLabel,
  stageRenderer,
  onChoice,
  onPathChange
}) {
  const story = useMemo(() => createInteractiveStory(input), [input]);
  const initialChoiceKey = initialChoiceIds.join("|");
  const [history, setHistory] = useState(
    () => buildInitialHistory(story, initialChoiceIds)
  );
  const reducedMotion = useReducedMotion2();
  const currentNodeId = history[history.length - 1]?.nodeId ?? story.openingNodeId;
  const currentNode = getStoryNode(story, currentNodeId);
  const choices = getStoryChoices(currentNode);
  const ending = isStoryEnding(currentNode);
  const progress = history.length / Math.max(story.nodes.length, 1);
  const canGoBack = history.length > 1;
  const StageRenderer = stageRenderer ?? StoryDefaultStage;
  useEffect(() => {
    setHistory(buildInitialHistory(story, initialChoiceIds));
  }, [initialChoiceKey, story]);
  useEffect(() => {
    onPathChange?.(history);
  }, [history, onPathChange]);
  const choose = (choiceId) => {
    const choice = choices.find((entry) => entry.id === choiceId && !entry.disabled);
    if (!choice) return;
    const nextNode = getStoryNode(story, choice.target);
    const nextHistory = [
      ...history,
      {
        nodeId: nextNode.id,
        choiceId: choice.id,
        data: nextNode.data
      }
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
  const renderProps = {
    story,
    node: currentNode,
    history,
    currentIndex: history.length - 1,
    progress,
    isEnding: ending,
    canGoBack,
    choose,
    goBack,
    restart
  };
  return /* @__PURE__ */ jsxs2(
    "section",
    {
      role: "region",
      className: cn2(
        "overflow-hidden rounded-[2rem] border bg-card/70 shadow-2xl shadow-black/5 backdrop-blur",
        className
      ),
      "aria-label": ariaLabel ?? story.title,
      children: [
        /* @__PURE__ */ jsx2("div", { className: "border-b border-border/60 px-6 py-5 md:px-8", children: /* @__PURE__ */ jsxs2("div", { className: "flex flex-wrap items-end justify-between gap-4", children: [
          /* @__PURE__ */ jsxs2("div", { className: "max-w-2xl", children: [
            /* @__PURE__ */ jsx2("p", { className: "text-xs uppercase tracking-[0.28em] text-muted-foreground", children: "Interactive story package" }),
            /* @__PURE__ */ jsx2("h2", { className: "mt-2 text-2xl font-semibold tracking-tight md:text-3xl", children: story.title }),
            story.subtitle ? /* @__PURE__ */ jsx2("p", { className: "mt-2 text-sm leading-6 text-muted-foreground md:text-base", children: story.subtitle }) : null
          ] }),
          /* @__PURE__ */ jsxs2("div", { className: "flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-muted-foreground", children: [
            /* @__PURE__ */ jsxs2("span", { children: [
              "Scene ",
              history.length
            ] }),
            /* @__PURE__ */ jsx2("span", { "aria-hidden": "true", children: "/" }),
            /* @__PURE__ */ jsx2("span", { children: story.nodes.length })
          ] })
        ] }) }),
        /* @__PURE__ */ jsxs2("div", { className: "grid gap-0 lg:grid-cols-[1.15fr_0.85fr]", children: [
          /* @__PURE__ */ jsx2("div", { className: "p-6 md:p-8", children: /* @__PURE__ */ jsx2(AnimatePresence, { mode: "wait", initial: false, children: /* @__PURE__ */ jsx2(
            motion2.div,
            {
              initial: reducedMotion ? void 0 : { opacity: 0, y: 16 },
              animate: { opacity: 1, y: 0 },
              exit: reducedMotion ? void 0 : { opacity: 0, y: -12 },
              transition: { duration: reducedMotion ? 0 : 0.35, ease: "easeOut" },
              children: /* @__PURE__ */ jsx2(StageRenderer, { ...renderProps })
            },
            currentNode.id
          ) }) }),
          /* @__PURE__ */ jsx2(
            "div",
            {
              className: cn2(
                "border-t border-border/60 bg-background/70 p-6 lg:border-l lg:border-t-0 md:p-8",
                panelClassName,
                currentNode.panelClassName
              ),
              children: /* @__PURE__ */ jsx2(AnimatePresence, { mode: "wait", initial: false, children: /* @__PURE__ */ jsxs2(
                motion2.div,
                {
                  initial: reducedMotion ? void 0 : { opacity: 0, x: 12 },
                  animate: { opacity: 1, x: 0 },
                  exit: reducedMotion ? void 0 : { opacity: 0, x: -8 },
                  transition: { duration: reducedMotion ? 0 : 0.3, ease: "easeOut" },
                  className: cn2("flex h-full flex-col", currentNode.className),
                  children: [
                    currentNode.eyebrow ? /* @__PURE__ */ jsx2("p", { className: "text-xs uppercase tracking-[0.28em] text-muted-foreground", children: currentNode.eyebrow }) : null,
                    /* @__PURE__ */ jsx2("h3", { className: "mt-3 text-2xl font-semibold tracking-tight", children: currentNode.title }),
                    currentNode.body ? /* @__PURE__ */ jsx2("div", { className: "mt-4 text-sm leading-7 text-muted-foreground md:text-base", children: currentNode.body }) : null,
                    /* @__PURE__ */ jsxs2("div", { className: "mt-8 rounded-[1.5rem] border bg-card/70 p-5", children: [
                      /* @__PURE__ */ jsx2("p", { className: "text-sm font-medium", children: currentNode.prompt ?? (ending ? "This branch is complete." : "Choose what happens next.") }),
                      /* @__PURE__ */ jsx2("div", { className: "mt-4 space-y-3", children: choices.length > 0 ? choices.map((choice) => /* @__PURE__ */ jsxs2(
                        "button",
                        {
                          type: "button",
                          onClick: () => choose(choice.id),
                          disabled: choice.disabled,
                          className: cn2(
                            "w-full rounded-[1.25rem] border bg-background px-4 py-3 text-left transition-colors",
                            "hover:border-foreground/40 hover:bg-accent",
                            "disabled:cursor-not-allowed disabled:opacity-50"
                          ),
                          children: [
                            /* @__PURE__ */ jsx2("span", { className: "block text-sm font-medium", children: choice.label }),
                            choice.description ? /* @__PURE__ */ jsx2("span", { className: "mt-1 block text-sm text-muted-foreground", children: choice.description }) : null
                          ]
                        },
                        choice.id
                      )) : /* @__PURE__ */ jsx2("p", { className: "text-sm text-muted-foreground", children: "Restart to explore another branch, or go back to choose a different path." }) })
                    ] }),
                    /* @__PURE__ */ jsxs2("div", { className: "mt-6 flex flex-wrap gap-3", children: [
                      /* @__PURE__ */ jsx2(
                        Button,
                        {
                          type: "button",
                          variant: "outline",
                          onClick: goBack,
                          disabled: !canGoBack,
                          children: story.backLabel ?? "Go back"
                        }
                      ),
                      /* @__PURE__ */ jsx2(Button, { type: "button", variant: "secondary", onClick: restart, children: story.restartLabel ?? "Restart" })
                    ] }),
                    /* @__PURE__ */ jsxs2("div", { className: "mt-auto pt-8", children: [
                      /* @__PURE__ */ jsx2("div", { className: "rounded-full bg-muted p-1", children: /* @__PURE__ */ jsx2(
                        motion2.div,
                        {
                          className: "h-2 rounded-full bg-foreground",
                          animate: { width: `${Math.max(progress * 100, 10)}%` },
                          transition: { duration: reducedMotion ? 0 : 0.3, ease: "easeOut" }
                        }
                      ) }),
                      /* @__PURE__ */ jsx2("ol", { className: "mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground", children: history.map((entry, index) => {
                        const node = getStoryNode(story, entry.nodeId);
                        return /* @__PURE__ */ jsx2(
                          "li",
                          {
                            className: cn2(
                              "rounded-full border px-3 py-1",
                              index === history.length - 1 ? "border-foreground text-foreground" : "border-border"
                            ),
                            children: node.title
                          },
                          `${entry.nodeId}-${index}`
                        );
                      }) })
                    ] })
                  ]
                },
                currentNode.id
              ) })
            }
          )
        ] })
      ]
    }
  );
}

// src/story-container.tsx
import {
  useCallback,
  useEffect as useEffect2,
  useMemo as useMemo2,
  useRef,
  useState as useState2
} from "react";
import { useMotionValue } from "motion/react";
import { Button as Button2, cn as cn3 } from "@moritzbrantner/ui";

// src/story-context.tsx
import {
  createContext,
  useContext
} from "react";
import { jsx as jsx3 } from "react/jsx-runtime";
var StoryContext = createContext(null);
function StoryProvider({
  children,
  value
}) {
  return /* @__PURE__ */ jsx3(StoryContext.Provider, { value, children });
}
function useStoryContext(componentName) {
  const value = useContext(StoryContext);
  if (!value) {
    throw new Error(`${componentName} must be used within StoryContainer.`);
  }
  return value;
}

// src/story-introspection.ts
import {
  Children,
  isValidElement
} from "react";
var isDevelopment = process.env.NODE_ENV !== "production";
function invariant(condition, message) {
  if (!condition && isDevelopment) {
    throw new Error(message);
  }
}
function getStorySeriesElement(children) {
  const childArray = Children.toArray(children);
  invariant(
    childArray.length === 1,
    "StoryContainer expects exactly one direct StorySeries child."
  );
  const firstChild = childArray[0];
  if (!isValidElement(firstChild)) {
    invariant(false, "StoryContainer expects a StorySeries React element.");
    return null;
  }
  return firstChild;
}
function getStorySceneElements(children) {
  const childArray = Children.toArray(children);
  const sceneElements = [];
  for (const child of childArray) {
    const isScene = isValidElement(child) && typeof child.props === "object" && child.props !== null && typeof child.props.id === "string" && typeof child.props.title === "string";
    invariant(
      isScene,
      "StorySeries only accepts direct StoryScene children."
    );
    if (isScene) {
      sceneElements.push(child);
    }
  }
  return sceneElements;
}
function buildSceneMeta(children) {
  const seriesElement = getStorySeriesElement(children);
  if (!seriesElement) return [];
  const sceneElements = getStorySceneElements(
    seriesElement.props.children
  );
  const sceneIds = /* @__PURE__ */ new Set();
  return sceneElements.map((sceneElement) => {
    const { id, title, menuLabel, eyebrow } = sceneElement.props;
    invariant(
      !sceneIds.has(id),
      `StoryScene ids must be unique. Duplicate id "${id}" found.`
    );
    sceneIds.add(id);
    return {
      id,
      title,
      menuLabel,
      eyebrow
    };
  });
}

// src/story-container.tsx
import { jsx as jsx4, jsxs as jsxs3 } from "react/jsx-runtime";
var DEFAULT_INSTRUCTIONS = "Use the story panel scroll, step buttons, reset button, or arrow keys to move through the story.";
var clamp = (value, min, max) => Math.min(Math.max(value, min), max);
function isTextInputTarget(target) {
  if (!(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  return tagName === "input" || tagName === "textarea" || tagName === "select" || target.isContentEditable;
}
function StoryContainer({
  title,
  subtitle,
  instructions = DEFAULT_INSTRUCTIONS,
  className,
  ariaLabel,
  children
}) {
  const sceneMeta = useMemo2(() => buildSceneMeta(children), [children]);
  const sceneCount = sceneMeta.length;
  const maxSceneIndex = Math.max(sceneCount - 1, 0);
  const sceneProgress = useMotionValue(0);
  const [activeIndex, setActiveIndex] = useState2(0);
  const scrollToSceneRef = useRef(() => {
  });
  useEffect2(() => {
    setActiveIndex((current) => clamp(current, 0, maxSceneIndex));
    sceneProgress.set(clamp(sceneProgress.get(), 0, maxSceneIndex));
  }, [maxSceneIndex, sceneProgress]);
  const registerScrollToScene = useCallback((callback) => {
    scrollToSceneRef.current = callback;
  }, []);
  const scrollToScene = useCallback(
    (index) => {
      scrollToSceneRef.current(clamp(index, 0, maxSceneIndex));
    },
    [maxSceneIndex]
  );
  const reset = useCallback(() => {
    sceneProgress.set(0);
    setActiveIndex(0);
    scrollToScene(0);
  }, [sceneProgress, scrollToScene]);
  const progressLabel = sceneCount > 0 ? `${activeIndex + 1} / ${sceneCount}` : "0 / 0";
  const showMenu = sceneCount > 1;
  const handleKeyDown = (event) => {
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
  const contextValue = useMemo2(
    () => ({
      sceneMeta,
      activeIndex,
      setActiveIndex,
      sceneCount,
      sceneProgress,
      scrollToScene,
      registerScrollToScene,
      reset
    }),
    [
      activeIndex,
      registerScrollToScene,
      reset,
      sceneCount,
      sceneMeta,
      sceneProgress,
      scrollToScene
    ]
  );
  return /* @__PURE__ */ jsx4(StoryProvider, { value: contextValue, children: /* @__PURE__ */ jsxs3(
    "section",
    {
      className: cn3(
        "min-h-[70vh] rounded-2xl border bg-card/40 p-6 md:p-10",
        className
      ),
      onKeyDown: handleKeyDown,
      tabIndex: 0,
      role: "region",
      "aria-label": ariaLabel ?? title,
      children: [
        /* @__PURE__ */ jsxs3("header", { className: "mx-auto max-w-3xl text-center", children: [
          /* @__PURE__ */ jsx4("h1", { className: "text-3xl font-semibold tracking-tight md:text-5xl", children: title }),
          subtitle ? /* @__PURE__ */ jsx4("p", { className: "mt-4 text-muted-foreground", children: subtitle }) : null,
          /* @__PURE__ */ jsxs3("div", { className: "mt-4 flex flex-wrap items-center justify-center gap-3", children: [
            /* @__PURE__ */ jsxs3("p", { className: "text-xs uppercase tracking-[0.25em] text-muted-foreground", children: [
              "Step ",
              progressLabel
            ] }),
            showMenu ? /* @__PURE__ */ jsx4(
              Button2,
              {
                type: "button",
                variant: "outline",
                size: "sm",
                onClick: reset,
                disabled: activeIndex === 0,
                children: "Reset"
              }
            ) : null
          ] })
        ] }),
        /* @__PURE__ */ jsxs3(
          "div",
          {
            className: cn3(
              "mx-auto mt-10 max-w-5xl",
              showMenu ? "grid gap-6 md:grid-cols-[120px_1fr] md:items-stretch" : ""
            ),
            children: [
              showMenu ? /* @__PURE__ */ jsx4(
                "ol",
                {
                  className: "story-steps-scrollbar-hidden order-2 flex gap-3 overflow-x-auto md:order-1 md:flex-col",
                  "aria-label": "Story steps",
                  children: sceneMeta.map((scene, index) => /* @__PURE__ */ jsx4("li", { children: /* @__PURE__ */ jsx4(
                    "button",
                    {
                      type: "button",
                      className: cn3(
                        "rounded-full border px-3 py-1 text-sm transition-colors",
                        index === activeIndex ? "border-foreground bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                      ),
                      onClick: () => scrollToScene(index),
                      "aria-current": index === activeIndex ? "step" : void 0,
                      "aria-label": `Step ${index + 1}: ${scene.title}`,
                      children: scene.menuLabel ?? index + 1
                    }
                  ) }, scene.id))
                }
              ) : null,
              /* @__PURE__ */ jsx4("div", { className: cn3(showMenu ? "order-1 md:order-2" : ""), children })
            ]
          }
        ),
        /* @__PURE__ */ jsx4("p", { className: "mt-8 text-center text-sm text-muted-foreground", children: instructions })
      ]
    }
  ) });
}

// src/story-media.tsx
import {
  useEffect as useEffect3,
  useMemo as useMemo3,
  useState as useState3
} from "react";
import { cn as cn4 } from "@moritzbrantner/ui";
import { jsx as jsx5, jsxs as jsxs4 } from "react/jsx-runtime";
function extractFileName(src) {
  if (!src) {
    return null;
  }
  const [path] = src.split(/[?#]/, 1);
  const segments = path.split("/").filter(Boolean);
  return segments[segments.length - 1] ?? src;
}
function inferSubtitleFormat(input, format) {
  if (format && format !== "auto") {
    return format;
  }
  const normalized = input.trim().toLowerCase();
  if (normalized.startsWith("webvtt") || normalized.endsWith(".vtt")) {
    return "vtt";
  }
  return "srt";
}
function parseSubtitleTimestamp(input) {
  const normalized = input.trim().replace(",", ".");
  const segments = normalized.split(":");
  if (segments.length < 2 || segments.length > 3) {
    return null;
  }
  const secondsWithMillis = Number(segments[segments.length - 1]);
  const minutes = Number(segments[segments.length - 2]);
  const hours = segments.length === 3 ? Number(segments[0]) : 0;
  if (Number.isNaN(secondsWithMillis) || Number.isNaN(minutes) || Number.isNaN(hours)) {
    return null;
  }
  return hours * 3600 + minutes * 60 + secondsWithMillis;
}
function parseSubtitleText(input, format = "auto") {
  const normalized = input.replace(/\r\n?/g, "\n").trim();
  if (!normalized) {
    return [];
  }
  const resolvedFormat = inferSubtitleFormat(normalized, format);
  const withoutHeader = resolvedFormat === "vtt" ? normalized.replace(/^WEBVTT[^\n]*\n+/, "") : normalized;
  const blocks = withoutHeader.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);
  const cues = [];
  for (const block of blocks) {
    const lines = block.split("\n").map((line) => line.trimEnd()).filter(Boolean);
    if (lines.length === 0) {
      continue;
    }
    if (resolvedFormat === "vtt" && (lines[0]?.startsWith("NOTE") || lines[0]?.startsWith("STYLE") || lines[0]?.startsWith("REGION"))) {
      continue;
    }
    let timingLineIndex = 0;
    if (!lines[0]?.includes("-->")) {
      timingLineIndex = 1;
    }
    const timingLine = lines[timingLineIndex];
    if (!timingLine || !timingLine.includes("-->")) {
      continue;
    }
    const [rawStart, rawEndAndSettings] = timingLine.split("-->");
    const rawEnd = rawEndAndSettings?.trim().split(/\s+/, 1)[0];
    const startTimeInSeconds = parseSubtitleTimestamp(rawStart ?? "");
    const endTimeInSeconds = parseSubtitleTimestamp(rawEnd ?? "");
    if (startTimeInSeconds === null || endTimeInSeconds === null) {
      continue;
    }
    const text = lines.slice(timingLineIndex + 1).join("\n").trim();
    if (!text) {
      continue;
    }
    cues.push({
      id: `${cues.length}-${startTimeInSeconds}-${endTimeInSeconds}`,
      startTimeInSeconds,
      endTimeInSeconds,
      text
    });
  }
  return cues;
}
function formatSubtitleTime(seconds) {
  const totalSeconds = Math.max(seconds, 0);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor(totalSeconds % 3600 / 60);
  const remainingSeconds = totalSeconds % 60;
  const secondsLabel = remainingSeconds.toFixed(3).padStart(6, "0");
  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0"
    )}:${secondsLabel}`;
  }
  return `${String(minutes).padStart(2, "0")}:${secondsLabel}`;
}
function StoryMediaHeader({
  label,
  title,
  description,
  badge
}) {
  return /* @__PURE__ */ jsxs4("div", { className: "flex flex-wrap items-start justify-between gap-4", children: [
    /* @__PURE__ */ jsxs4("div", { className: "max-w-2xl", children: [
      /* @__PURE__ */ jsx5("p", { className: "text-xs uppercase tracking-[0.24em] text-muted-foreground", children: label }),
      /* @__PURE__ */ jsx5("h4", { className: "mt-2 text-2xl font-semibold tracking-tight", children: title }),
      description ? /* @__PURE__ */ jsx5("div", { className: "mt-3 text-sm leading-6 text-muted-foreground", children: description }) : null
    ] }),
    badge ? /* @__PURE__ */ jsx5("div", { className: "rounded-full border px-3 py-1 text-xs uppercase tracking-[0.2em] text-muted-foreground", children: badge }) : null
  ] });
}
function StoryMediaTrackElements({ tracks }) {
  return tracks?.map((track) => /* @__PURE__ */ jsx5(
    "track",
    {
      default: track.default,
      kind: track.kind,
      label: track.label,
      src: track.src,
      srcLang: track.srcLang
    },
    `${track.kind ?? "subtitles"}-${track.label}-${track.src}`
  ));
}
function StorySubtitleFile({
  src,
  content,
  title,
  description,
  languageLabel = "Subtitle file",
  format = "auto",
  showTimestamps = true,
  className,
  listClassName,
  loadingLabel = "Loading subtitle cues...",
  emptyLabel = "No subtitle cues available.",
  errorLabel = "Unable to load subtitle file."
}) {
  const [resolvedContent, setResolvedContent] = useState3(content ?? "");
  const [status, setStatus] = useState3(content ? "ready" : src ? "loading" : "idle");
  useEffect3(() => {
    if (content !== void 0) {
      setResolvedContent(content);
      setStatus("ready");
      return;
    }
    if (!src) {
      setResolvedContent("");
      setStatus("idle");
      return;
    }
    let cancelled = false;
    setStatus("loading");
    void fetch(src).then(async (response) => {
      if (!response.ok) {
        throw new Error(`Failed to load subtitle file: ${response.status}`);
      }
      return response.text();
    }).then((nextContent) => {
      if (cancelled) {
        return;
      }
      setResolvedContent(nextContent);
      setStatus("ready");
    }).catch(() => {
      if (cancelled) {
        return;
      }
      setResolvedContent("");
      setStatus("error");
    });
    return () => {
      cancelled = true;
    };
  }, [content, src]);
  const cues = useMemo3(
    () => parseSubtitleText(resolvedContent, format),
    [format, resolvedContent]
  );
  const fileName = title ?? extractFileName(src) ?? "Inline subtitles";
  const badge = src ? inferSubtitleFormat(src, format).toUpperCase() : inferSubtitleFormat(resolvedContent, format).toUpperCase();
  return /* @__PURE__ */ jsxs4(
    "section",
    {
      className: cn4(
        "relative min-h-[24rem] overflow-hidden rounded-[2rem] border bg-card text-card-foreground shadow-2xl shadow-black/10",
        className
      ),
      children: [
        /* @__PURE__ */ jsx5("div", { className: "absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_42%),linear-gradient(180deg,rgba(14,23,38,0.95),rgba(3,7,18,1))]" }),
        /* @__PURE__ */ jsxs4("div", { className: "relative z-10 flex h-full flex-col p-6 md:p-8", children: [
          /* @__PURE__ */ jsx5(
            StoryMediaHeader,
            {
              label: languageLabel,
              title: fileName,
              description,
              badge
            }
          ),
          /* @__PURE__ */ jsxs4(
            "div",
            {
              className: cn4(
                "mt-6 flex-1 rounded-[1.5rem] border border-white/10 bg-black/25 p-4",
                listClassName
              ),
              children: [
                status === "loading" ? /* @__PURE__ */ jsx5("p", { className: "text-sm text-white/72", children: loadingLabel }) : null,
                status === "error" ? /* @__PURE__ */ jsx5("p", { className: "text-sm text-white/72", children: errorLabel }) : null,
                status !== "loading" && status !== "error" && cues.length === 0 ? /* @__PURE__ */ jsx5("p", { className: "text-sm text-white/72", children: emptyLabel }) : null,
                cues.length > 0 ? /* @__PURE__ */ jsx5("ol", { className: "space-y-3 overflow-y-auto pr-2", children: cues.map((cue) => /* @__PURE__ */ jsxs4(
                  "li",
                  {
                    className: "rounded-[1.25rem] border border-white/10 bg-white/5 p-4",
                    children: [
                      showTimestamps ? /* @__PURE__ */ jsxs4("p", { className: "text-xs uppercase tracking-[0.22em] text-white/60", children: [
                        formatSubtitleTime(cue.startTimeInSeconds),
                        " -",
                        " ",
                        formatSubtitleTime(cue.endTimeInSeconds)
                      ] }) : null,
                      /* @__PURE__ */ jsx5("p", { className: "mt-2 whitespace-pre-line text-sm leading-6 text-white/88 md:text-base", children: cue.text })
                    ]
                  },
                  cue.id
                )) }) : null
              ]
            }
          )
        ] })
      ]
    }
  );
}
function StoryAudioFile({
  title,
  description,
  artworkSrc,
  className,
  playerClassName,
  tracks,
  controls = true,
  preload = "metadata",
  src,
  ...props
}) {
  const fileName = title ?? extractFileName(src) ?? "Audio track";
  return /* @__PURE__ */ jsxs4(
    "figure",
    {
      className: cn4(
        "relative min-h-[24rem] overflow-hidden rounded-[2rem] border bg-card text-card-foreground shadow-2xl shadow-black/10",
        className
      ),
      children: [
        /* @__PURE__ */ jsx5("div", { className: "absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.22),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(20,184,166,0.18),transparent_30%),linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,6,23,1))]" }),
        /* @__PURE__ */ jsxs4("div", { className: "relative z-10 flex h-full flex-col justify-between gap-6 p-6 md:p-8", children: [
          /* @__PURE__ */ jsx5(
            StoryMediaHeader,
            {
              label: "Audio file",
              title: fileName,
              description,
              badge: src ? extractFileName(src)?.split(".").pop() : void 0
            }
          ),
          /* @__PURE__ */ jsxs4("div", { className: "grid gap-6 md:grid-cols-[180px_1fr] md:items-end", children: [
            /* @__PURE__ */ jsx5("div", { className: "overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/5", children: artworkSrc ? /* @__PURE__ */ jsx5(
              "img",
              {
                src: artworkSrc,
                alt: "",
                className: "h-full min-h-[180px] w-full object-cover"
              }
            ) : /* @__PURE__ */ jsx5("div", { className: "flex min-h-[180px] items-center justify-center bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] px-6 text-center text-sm uppercase tracking-[0.28em] text-white/65", children: "Audio" }) }),
            /* @__PURE__ */ jsx5(
              "audio",
              {
                ...props,
                controls,
                preload,
                src,
                className: cn4("w-full", playerClassName),
                children: /* @__PURE__ */ jsx5(StoryMediaTrackElements, { tracks })
              }
            )
          ] })
        ] })
      ]
    }
  );
}
function StoryVideoFile({
  title,
  description,
  className,
  playerClassName,
  tracks,
  controls = true,
  preload = "metadata",
  playsInline = true,
  src,
  ...props
}) {
  const fileName = title ?? extractFileName(src) ?? "Video clip";
  return /* @__PURE__ */ jsxs4(
    "figure",
    {
      className: cn4(
        "relative min-h-[24rem] overflow-hidden rounded-[2rem] border bg-card text-card-foreground shadow-2xl shadow-black/10",
        className
      ),
      children: [
        /* @__PURE__ */ jsx5("div", { className: "absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.16),transparent_34%),linear-gradient(180deg,rgba(15,23,42,0.98),rgba(2,6,23,1))]" }),
        /* @__PURE__ */ jsxs4("div", { className: "relative z-10 flex h-full flex-col gap-6 p-6 md:p-8", children: [
          /* @__PURE__ */ jsx5(
            StoryMediaHeader,
            {
              label: "Video file",
              title: fileName,
              description,
              badge: src ? extractFileName(src)?.split(".").pop() : void 0
            }
          ),
          /* @__PURE__ */ jsx5("div", { className: "overflow-hidden rounded-[1.75rem] border border-white/10 bg-black/40", children: /* @__PURE__ */ jsx5(
            "video",
            {
              ...props,
              controls,
              preload,
              playsInline,
              src,
              className: cn4(
                "aspect-video w-full bg-black object-cover",
                playerClassName
              ),
              children: /* @__PURE__ */ jsx5(StoryMediaTrackElements, { tracks })
            }
          ) })
        ] })
      ]
    }
  );
}
function createSubtitleStoryScene(props) {
  function SubtitleStoryScene(_renderProps) {
    return /* @__PURE__ */ jsx5(StorySubtitleFile, { ...props });
  }
  SubtitleStoryScene.displayName = "SubtitleStoryScene";
  return SubtitleStoryScene;
}
function createAudioStoryScene(props) {
  function AudioStoryScene(_renderProps) {
    return /* @__PURE__ */ jsx5(StoryAudioFile, { ...props });
  }
  AudioStoryScene.displayName = "AudioStoryScene";
  return AudioStoryScene;
}
function createVideoStoryScene(props) {
  function VideoStoryScene(_renderProps) {
    return /* @__PURE__ */ jsx5(StoryVideoFile, { ...props });
  }
  VideoStoryScene.displayName = "VideoStoryScene";
  return VideoStoryScene;
}

// src/story-scene.tsx
import { motion as motion3, useReducedMotion as useReducedMotion3, useTransform } from "motion/react";
import { cn as cn5 } from "@moritzbrantner/ui";
import { jsx as jsx6, jsxs as jsxs5 } from "react/jsx-runtime";
var isDevelopment2 = process.env.NODE_ENV !== "production";
function StorySceneComponent({
  id,
  title,
  eyebrow,
  children,
  className
}) {
  const { sceneMeta, sceneProgress, activeIndex } = useStoryContext("StoryScene");
  const reducedMotion = useReducedMotion3();
  const index = sceneMeta.findIndex((scene) => scene.id === id);
  if (index === -1) {
    if (isDevelopment2) {
      throw new Error(`StoryScene with id "${id}" is not registered.`);
    }
    return null;
  }
  const isActive = activeIndex === index;
  const opacity = useTransform(
    sceneProgress,
    [index - 0.45, index, index + 0.45],
    [0, 1, 0],
    { clamp: true }
  );
  const y = useTransform(
    sceneProgress,
    [index - 0.45, index, index + 0.45],
    [24, 0, -24],
    { clamp: true }
  );
  const scale = useTransform(
    sceneProgress,
    [index - 0.45, index, index + 0.45],
    [0.985, 1, 0.985],
    { clamp: true }
  );
  return /* @__PURE__ */ jsxs5(
    motion3.article,
    {
      className: cn5(
        "absolute inset-0 flex flex-col justify-center p-6",
        isActive ? "pointer-events-auto z-10" : "pointer-events-none z-0",
        className
      ),
      style: reducedMotion ? void 0 : { opacity, y, scale },
      animate: reducedMotion ? {
        opacity: isActive ? 1 : 0,
        y: 0,
        scale: 1
      } : void 0,
      transition: reducedMotion ? { duration: 0 } : void 0,
      "aria-hidden": !isActive,
      children: [
        eyebrow ? /* @__PURE__ */ jsx6("p", { className: "text-sm uppercase tracking-[0.2em] text-muted-foreground", children: eyebrow }) : null,
        /* @__PURE__ */ jsx6("h2", { className: "mt-2 text-2xl font-semibold tracking-tight", children: title }),
        /* @__PURE__ */ jsx6("div", { className: "mt-4 max-w-2xl text-base leading-7 text-muted-foreground", children })
      ]
    }
  );
}
var StoryScene = StorySceneComponent;

// src/story-series.tsx
import { useCallback as useCallback2, useEffect as useEffect4, useMemo as useMemo4, useRef as useRef2 } from "react";
import {
  useMotionValueEvent,
  useReducedMotion as useReducedMotion4,
  useScroll,
  useSpring,
  useTransform as useTransform2
} from "motion/react";
import { cn as cn6 } from "@moritzbrantner/ui";
import { jsx as jsx7 } from "react/jsx-runtime";
var clamp2 = (value, min, max) => Math.min(Math.max(value, min), max);
function StorySeriesComponent({
  children,
  className,
  viewportClassName = "h-[26rem] md:h-[70vh]",
  ariaLabel
}) {
  const {
    sceneCount,
    setActiveIndex,
    sceneProgress,
    registerScrollToScene
  } = useStoryContext("StorySeries");
  const seriesRef = useRef2(null);
  const reducedMotion = useReducedMotion4();
  const sceneElements = useMemo4(() => getStorySceneElements(children), [children]);
  const maxSceneIndex = Math.max(sceneCount - 1, 0);
  const { scrollYProgress } = useScroll({ container: seriesRef });
  const springProgress = useSpring(scrollYProgress, {
    stiffness: 180,
    damping: 28,
    mass: 0.2
  });
  const smoothSceneProgress = useTransform2(
    springProgress,
    (value) => value * maxSceneIndex
  );
  const reducedMotionProgress = useTransform2(
    scrollYProgress,
    (value) => Math.round(value * maxSceneIndex)
  );
  useMotionValueEvent(
    reducedMotion ? reducedMotionProgress : smoothSceneProgress,
    "change",
    (latest) => {
      const nextProgress = clamp2(latest, 0, maxSceneIndex);
      const nextActiveIndex = clamp2(Math.round(nextProgress), 0, maxSceneIndex);
      sceneProgress.set(nextProgress);
      setActiveIndex(
        (current) => current === nextActiveIndex ? current : nextActiveIndex
      );
    }
  );
  const scrollToScene = useCallback2(
    (index) => {
      const element = seriesRef.current;
      if (!element) return;
      const nextIndex = clamp2(index, 0, maxSceneIndex);
      const maxScroll = Math.max(element.scrollHeight - element.clientHeight, 0);
      const target = maxSceneIndex === 0 ? 0 : nextIndex / maxSceneIndex * maxScroll;
      element.scrollTo({
        top: target,
        behavior: reducedMotion ? "auto" : "smooth"
      });
    },
    [maxSceneIndex, reducedMotion]
  );
  useEffect4(() => {
    registerScrollToScene(scrollToScene);
    return () => {
      registerScrollToScene(() => {
      });
    };
  }, [registerScrollToScene, scrollToScene]);
  return /* @__PURE__ */ jsx7(
    "div",
    {
      ref: seriesRef,
      role: "region",
      "aria-label": ariaLabel,
      className: cn6(
        "story-steps-scrollbar-hidden relative overflow-y-auto overscroll-contain",
        viewportClassName,
        className
      ),
      children: /* @__PURE__ */ jsx7(
        "div",
        {
          className: "relative",
          style: { height: `${Math.max(sceneCount, 1) * 100}%` },
          children: /* @__PURE__ */ jsx7(
            "div",
            {
              className: cn6(
                "sticky top-0 z-10 overflow-hidden rounded-xl border bg-background",
                viewportClassName
              ),
              children: sceneElements
            }
          )
        }
      )
    }
  );
}
var StorySeries = StorySeriesComponent;
export {
  InteractiveStoryPlayer,
  StoryAudioFile,
  StoryContainer,
  StoryDefaultStage,
  StoryScene,
  StorySeries,
  StorySubtitleFile,
  StoryVideoFile,
  buildStoryTimeline,
  createAudioStoryScene,
  createInteractiveStory,
  createSubtitleStoryScene,
  createVideoStoryScene,
  getStoryChoices,
  getStoryNode,
  isStoryEnding,
  resolveStoryPath
};
