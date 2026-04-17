import {
  Children,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";

import type { StorySceneMeta, StorySceneProps } from "./story-types";

const isDevelopment = process.env.NODE_ENV !== "production";

function invariant(condition: boolean, message: string) {
  if (!condition && isDevelopment) {
    throw new Error(message);
  }
}

export function getStorySeriesElement(children: ReactNode) {
  const childArray = Children.toArray(children);

  invariant(
    childArray.length === 1,
    "StoryContainer expects exactly one direct StorySeries child.",
  );

  const firstChild = childArray[0];
  if (!isValidElement(firstChild)) {
    invariant(false, "StoryContainer expects a StorySeries React element.");
    return null;
  }

  return firstChild;
}

export function getStorySceneElements(children: ReactNode) {
  const childArray = Children.toArray(children);

  const sceneElements: ReactElement<StorySceneProps>[] = [];

  for (const child of childArray) {
    const isScene =
      isValidElement(child) &&
      typeof child.props === "object" &&
      child.props !== null &&
      typeof (child.props as StorySceneProps).id === "string" &&
      typeof (child.props as StorySceneProps).title === "string";

    invariant(
      isScene,
      "StorySeries only accepts direct StoryScene children.",
    );

    if (isScene) {
      sceneElements.push(child as ReactElement<StorySceneProps>);
    }
  }

  return sceneElements;
}

export function buildSceneMeta(children: ReactNode) {
  const seriesElement = getStorySeriesElement(children);
  if (!seriesElement) return [];

  const sceneElements = getStorySceneElements(
    (seriesElement.props as { children?: ReactNode }).children,
  );
  const sceneIds = new Set<string>();

  return sceneElements.map((sceneElement): StorySceneMeta => {
    const { id, title, menuLabel, eyebrow } = sceneElement.props;

    invariant(
      !sceneIds.has(id),
      `StoryScene ids must be unique. Duplicate id "${id}" found.`,
    );
    sceneIds.add(id);

    return {
      id,
      title,
      menuLabel,
      eyebrow,
    };
  });
}
