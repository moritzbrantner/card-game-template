import { S as StoryNodeData, I as InteractiveStoryDefinition, l as StoryTimeline, g as InteractiveStoryNode, d as StoryChoiceDefinition, R as ResolvedStoryPath } from './story-types-VqZAZ1w6.js';

declare function createInteractiveStory<TData extends StoryNodeData>(story: InteractiveStoryDefinition<TData>): InteractiveStoryDefinition<TData>;
declare function getStoryNode<TData extends StoryNodeData>(story: InteractiveStoryDefinition<TData>, nodeId: string): InteractiveStoryNode<TData>;
declare function getStoryChoices<TData extends StoryNodeData>(node: InteractiveStoryNode<TData>): StoryChoiceDefinition[];
declare function isStoryEnding<TData extends StoryNodeData>(node: InteractiveStoryNode<TData>): boolean;
declare function resolveStoryPath<TData extends StoryNodeData>(input: InteractiveStoryDefinition<TData>, choiceIds?: string[], options?: {
    autoAdvanceLinearNodes?: boolean;
    maxSteps?: number;
}): ResolvedStoryPath<TData>;
declare function buildStoryTimeline<TData extends StoryNodeData>(story: InteractiveStoryDefinition<TData>, choiceIds?: string[]): StoryTimeline<TData>;

export { getStoryNode as a, buildStoryTimeline as b, createInteractiveStory as c, getStoryChoices as g, isStoryEnding as i, resolveStoryPath as r };
