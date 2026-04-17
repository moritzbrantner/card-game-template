"use client";

import {
  createContext,
  useContext,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

import type { MotionValue } from "motion/react";

import type { StorySceneMeta } from "./story-types";

type StoryContextValue = {
  sceneMeta: StorySceneMeta[];
  activeIndex: number;
  setActiveIndex: Dispatch<SetStateAction<number>>;
  sceneCount: number;
  sceneProgress: MotionValue<number>;
  scrollToScene: (index: number) => void;
  registerScrollToScene: (callback: (index: number) => void) => void;
  reset: () => void;
};

const StoryContext = createContext<StoryContextValue | null>(null);

export function StoryProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: StoryContextValue;
}) {
  return (
    <StoryContext.Provider value={value}>{children}</StoryContext.Provider>
  );
}

export function useStoryContext(componentName: string) {
  const value = useContext(StoryContext);

  if (!value) {
    throw new Error(`${componentName} must be used within StoryContainer.`);
  }

  return value;
}
