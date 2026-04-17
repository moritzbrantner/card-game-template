import type { ComponentType, ReactNode } from "react";

export type StorySceneDefinition = {
  id: string;
  title: string;
  body: string;
  eyebrow?: string;
  menuLabel?: string;
};

export type StorySceneProps = {
  id: string;
  title: string;
  menuLabel?: string;
  eyebrow?: string;
  children: ReactNode;
  className?: string;
};

export type StorySceneMeta = Omit<StorySceneProps, "children" | "className">;

export type StoryNodeData = Record<string, unknown>;

export type StoryChoiceDefinition = {
  id: string;
  label: string;
  target: string;
  description?: string;
  disabled?: boolean;
};

export type StoryHistoryEntry<TData extends StoryNodeData = StoryNodeData> = {
  nodeId: string;
  choiceId?: string;
  data?: TData;
};

export type InteractiveStoryDefinition<
  TData extends StoryNodeData = StoryNodeData,
> = {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  openingNodeId: string;
  nodes: InteractiveStoryNode<TData>[];
  backLabel?: string;
  restartLabel?: string;
};

export type StoryRenderProps<TData extends StoryNodeData = StoryNodeData> = {
  story: InteractiveStoryDefinition<TData>;
  node: InteractiveStoryNode<TData>;
  history: StoryHistoryEntry<TData>[];
  currentIndex: number;
  progress: number;
  isEnding: boolean;
  canGoBack: boolean;
  choose: (choiceId: string) => void;
  goBack: () => void;
  restart: () => void;
};

export type StoryStageComponent<TData extends StoryNodeData = StoryNodeData> =
  ComponentType<StoryRenderProps<TData>>;

export type StoryRemotionSceneProps<
  TData extends StoryNodeData = StoryNodeData,
> = StoryRenderProps<TData> & {
  frame: number;
  absoluteFrame: number;
  durationInFrames: number;
};

export type StoryRemotionSceneComponent<
  TData extends StoryNodeData = StoryNodeData,
> = ComponentType<StoryRemotionSceneProps<TData>>;

export type StoryThreeSceneProps<TData extends StoryNodeData = StoryNodeData> =
  StoryRenderProps<TData>;

export type StoryThreeSceneComponent<
  TData extends StoryNodeData = StoryNodeData,
> = ComponentType<StoryThreeSceneProps<TData>>;

export type InteractiveStoryNode<TData extends StoryNodeData = StoryNodeData> =
  {
    id: string;
    title: string;
    body?: ReactNode;
    prompt?: ReactNode;
    eyebrow?: string;
    choices?: StoryChoiceDefinition[];
    next?: string;
    continueLabel?: string;
    durationInFrames?: number;
    data?: TData;
    className?: string;
    panelClassName?: string;
    stageClassName?: string;
    scene?: StoryStageComponent<TData>;
    remotionScene?: StoryRemotionSceneComponent<TData>;
    threeScene?: StoryThreeSceneComponent<TData>;
  };

export type ResolvedStoryPath<TData extends StoryNodeData = StoryNodeData> = {
  nodes: InteractiveStoryNode<TData>[];
  history: StoryHistoryEntry<TData>[];
  currentNode: InteractiveStoryNode<TData>;
  completed: boolean;
};

export type StoryTimelineScene<TData extends StoryNodeData = StoryNodeData> = {
  node: InteractiveStoryNode<TData>;
  startFrame: number;
  durationInFrames: number;
};

export type StoryTimeline<TData extends StoryNodeData = StoryNodeData> = {
  scenes: StoryTimelineScene<TData>[];
  totalFrames: number;
  history: StoryHistoryEntry<TData>[];
};
