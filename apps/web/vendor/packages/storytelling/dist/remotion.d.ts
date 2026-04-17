import * as react_jsx_runtime from 'react/jsx-runtime';
import { S as StoryNodeData, a as StoryRemotionSceneProps, I as InteractiveStoryDefinition } from './story-types-VqZAZ1w6.js';
export { b as buildStoryTimeline } from './interactive-story-yl8SU7_Q.js';
import 'react';

type StoryRemotionCompositionProps<TData extends StoryNodeData = StoryNodeData> = {
    story: InteractiveStoryDefinition<TData>;
    choiceIds?: string[];
};
declare function DefaultStoryRemotionScene<TData extends StoryNodeData = StoryNodeData>({ node, frame, durationInFrames, currentIndex, progress, }: StoryRemotionSceneProps<TData>): react_jsx_runtime.JSX.Element;
declare function StoryRemotionComposition<TData extends StoryNodeData = StoryNodeData>({ story, choiceIds, }: StoryRemotionCompositionProps<TData>): react_jsx_runtime.JSX.Element;

export { DefaultStoryRemotionScene, StoryRemotionComposition, type StoryRemotionCompositionProps };
