import * as react_jsx_runtime from 'react/jsx-runtime';
import { S as StoryNodeData, b as StoryRenderProps } from './story-types-VqZAZ1w6.js';
import 'react';

type StoryCanvasStageProps<TData extends StoryNodeData = StoryNodeData> = StoryRenderProps<TData> & {
    className?: string;
    cameraPosition?: [number, number, number];
};
declare function StoryCanvasStage<TData extends StoryNodeData = StoryNodeData>({ node, className, cameraPosition, ...renderProps }: StoryCanvasStageProps<TData>): react_jsx_runtime.JSX.Element;

export { StoryCanvasStage, type StoryCanvasStageProps };
