export { b as buildStoryTimeline, c as createInteractiveStory, g as getStoryChoices, a as getStoryNode, i as isStoryEnding, r as resolveStoryPath } from './interactive-story-yl8SU7_Q.js';
import * as react_jsx_runtime from 'react/jsx-runtime';
import { S as StoryNodeData, I as InteractiveStoryDefinition, c as StoryStageComponent, d as StoryChoiceDefinition, e as StoryHistoryEntry, b as StoryRenderProps, f as StorySceneProps } from './story-types-VqZAZ1w6.js';
export { g as InteractiveStoryNode, R as ResolvedStoryPath, h as StoryRemotionSceneComponent, a as StoryRemotionSceneProps, i as StorySceneDefinition, j as StoryThreeSceneComponent, k as StoryThreeSceneProps, l as StoryTimeline, m as StoryTimelineScene } from './story-types-VqZAZ1w6.js';
import { ReactElement, ComponentPropsWithoutRef, ReactNode } from 'react';

type InteractiveStoryPlayerProps<TData extends StoryNodeData = StoryNodeData> = {
    story: InteractiveStoryDefinition<TData>;
    initialChoiceIds?: string[];
    className?: string;
    panelClassName?: string;
    ariaLabel?: string;
    stageRenderer?: StoryStageComponent<TData>;
    onChoice?: (choice: StoryChoiceDefinition, history: StoryHistoryEntry<TData>[]) => void;
    onPathChange?: (history: StoryHistoryEntry<TData>[]) => void;
};
declare function InteractiveStoryPlayer<TData extends StoryNodeData = StoryNodeData>({ story: input, initialChoiceIds, className, panelClassName, ariaLabel, stageRenderer, onChoice, onPathChange, }: InteractiveStoryPlayerProps<TData>): react_jsx_runtime.JSX.Element;

type StoryContainerProps = {
    title: string;
    subtitle?: string;
    instructions?: string;
    className?: string;
    ariaLabel?: string;
    children: ReactElement;
};
declare function StoryContainer({ title, subtitle, instructions, className, ariaLabel, children, }: StoryContainerProps): react_jsx_runtime.JSX.Element;

declare function StoryDefaultStage<TData extends StoryNodeData = StoryNodeData>(props: StoryRenderProps<TData>): react_jsx_runtime.JSX.Element;

type StoryMediaTextTrack = {
    src: string;
    label: string;
    srcLang?: string;
    kind?: "subtitles" | "captions" | "descriptions" | "chapters" | "metadata";
    default?: boolean;
};
type StorySubtitleCue = {
    id: string;
    startTimeInSeconds: number;
    endTimeInSeconds: number;
    text: string;
};
type StorySubtitleFileProps = {
    src?: string;
    content?: string;
    title?: ReactNode;
    description?: ReactNode;
    languageLabel?: ReactNode;
    format?: "auto" | "srt" | "vtt";
    showTimestamps?: boolean;
    className?: string;
    listClassName?: string;
    loadingLabel?: ReactNode;
    emptyLabel?: ReactNode;
    errorLabel?: ReactNode;
};
type StoryAudioFileProps = Omit<ComponentPropsWithoutRef<"audio">, "children"> & {
    title?: ReactNode;
    description?: ReactNode;
    artworkSrc?: string;
    className?: string;
    playerClassName?: string;
    tracks?: StoryMediaTextTrack[];
};
type StoryVideoFileProps = Omit<ComponentPropsWithoutRef<"video">, "children"> & {
    title?: ReactNode;
    description?: ReactNode;
    className?: string;
    playerClassName?: string;
    tracks?: StoryMediaTextTrack[];
};
declare function StorySubtitleFile({ src, content, title, description, languageLabel, format, showTimestamps, className, listClassName, loadingLabel, emptyLabel, errorLabel, }: StorySubtitleFileProps): react_jsx_runtime.JSX.Element;
declare function StoryAudioFile({ title, description, artworkSrc, className, playerClassName, tracks, controls, preload, src, ...props }: StoryAudioFileProps): react_jsx_runtime.JSX.Element;
declare function StoryVideoFile({ title, description, className, playerClassName, tracks, controls, preload, playsInline, src, ...props }: StoryVideoFileProps): react_jsx_runtime.JSX.Element;
declare function createSubtitleStoryScene<TData extends StoryNodeData = StoryNodeData>(props: StorySubtitleFileProps): StoryStageComponent<TData>;
declare function createAudioStoryScene<TData extends StoryNodeData = StoryNodeData>(props: StoryAudioFileProps): StoryStageComponent<TData>;
declare function createVideoStoryScene<TData extends StoryNodeData = StoryNodeData>(props: StoryVideoFileProps): StoryStageComponent<TData>;

declare function StorySceneComponent({ id, title, eyebrow, children, className, }: StorySceneProps): react_jsx_runtime.JSX.Element | null;
declare const StoryScene: typeof StorySceneComponent;

type StorySeriesProps = {
    children: ReactNode;
    className?: string;
    viewportClassName?: string;
    ariaLabel?: string;
};
declare function StorySeriesComponent({ children, className, viewportClassName, ariaLabel, }: StorySeriesProps): react_jsx_runtime.JSX.Element;
declare const StorySeries: typeof StorySeriesComponent;

export { InteractiveStoryDefinition, InteractiveStoryPlayer, type InteractiveStoryPlayerProps, StoryAudioFile, type StoryAudioFileProps, StoryChoiceDefinition, StoryContainer, type StoryContainerProps, StoryDefaultStage, StoryHistoryEntry, type StoryMediaTextTrack, StoryNodeData, StoryRenderProps, StoryScene, StorySceneProps, StorySeries, type StorySeriesProps, StoryStageComponent, type StorySubtitleCue, StorySubtitleFile, type StorySubtitleFileProps, StoryVideoFile, type StoryVideoFileProps, createAudioStoryScene, createSubtitleStoryScene, createVideoStoryScene };
