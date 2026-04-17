import { ReactNode, ComponentType } from 'react';

type StorySceneDefinition = {
    id: string;
    title: string;
    body: string;
    eyebrow?: string;
    menuLabel?: string;
};
type StorySceneProps = {
    id: string;
    title: string;
    menuLabel?: string;
    eyebrow?: string;
    children: ReactNode;
    className?: string;
};
type StoryNodeData = Record<string, unknown>;
type StoryChoiceDefinition = {
    id: string;
    label: string;
    target: string;
    description?: string;
    disabled?: boolean;
};
type StoryHistoryEntry<TData extends StoryNodeData = StoryNodeData> = {
    nodeId: string;
    choiceId?: string;
    data?: TData;
};
type InteractiveStoryDefinition<TData extends StoryNodeData = StoryNodeData> = {
    id: string;
    title: string;
    subtitle?: string;
    description?: string;
    openingNodeId: string;
    nodes: InteractiveStoryNode<TData>[];
    backLabel?: string;
    restartLabel?: string;
};
type StoryRenderProps<TData extends StoryNodeData = StoryNodeData> = {
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
type StoryStageComponent<TData extends StoryNodeData = StoryNodeData> = ComponentType<StoryRenderProps<TData>>;
type StoryRemotionSceneProps<TData extends StoryNodeData = StoryNodeData> = StoryRenderProps<TData> & {
    frame: number;
    absoluteFrame: number;
    durationInFrames: number;
};
type StoryRemotionSceneComponent<TData extends StoryNodeData = StoryNodeData> = ComponentType<StoryRemotionSceneProps<TData>>;
type StoryThreeSceneProps<TData extends StoryNodeData = StoryNodeData> = StoryRenderProps<TData>;
type StoryThreeSceneComponent<TData extends StoryNodeData = StoryNodeData> = ComponentType<StoryThreeSceneProps<TData>>;
type InteractiveStoryNode<TData extends StoryNodeData = StoryNodeData> = {
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
type ResolvedStoryPath<TData extends StoryNodeData = StoryNodeData> = {
    nodes: InteractiveStoryNode<TData>[];
    history: StoryHistoryEntry<TData>[];
    currentNode: InteractiveStoryNode<TData>;
    completed: boolean;
};
type StoryTimelineScene<TData extends StoryNodeData = StoryNodeData> = {
    node: InteractiveStoryNode<TData>;
    startFrame: number;
    durationInFrames: number;
};
type StoryTimeline<TData extends StoryNodeData = StoryNodeData> = {
    scenes: StoryTimelineScene<TData>[];
    totalFrames: number;
    history: StoryHistoryEntry<TData>[];
};

export type { InteractiveStoryDefinition as I, ResolvedStoryPath as R, StoryNodeData as S, StoryRemotionSceneProps as a, StoryRenderProps as b, StoryStageComponent as c, StoryChoiceDefinition as d, StoryHistoryEntry as e, StorySceneProps as f, InteractiveStoryNode as g, StoryRemotionSceneComponent as h, StorySceneDefinition as i, StoryThreeSceneComponent as j, StoryThreeSceneProps as k, StoryTimeline as l, StoryTimelineScene as m };
