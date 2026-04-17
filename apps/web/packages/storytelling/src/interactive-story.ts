import type {
  InteractiveStoryDefinition,
  InteractiveStoryNode,
  ResolvedStoryPath,
  StoryChoiceDefinition,
  StoryHistoryEntry,
  StoryNodeData,
  StoryTimeline,
} from "./story-types";

const DEFAULT_CONTINUE_LABEL = "Continue";
const DEFAULT_REMOTION_DURATION_IN_FRAMES = 120;
const isDevelopment = process.env.NODE_ENV !== "production";

function invariant(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function createNodeLookup<TData extends StoryNodeData>(
  story: InteractiveStoryDefinition<TData>,
) {
  return new Map(story.nodes.map((node) => [node.id, node] as const));
}

export function createInteractiveStory<TData extends StoryNodeData>(
  story: InteractiveStoryDefinition<TData>,
) {
  invariant(
    story.nodes.length > 0,
    `Story "${story.id}" must declare at least one node.`,
  );

  const nodeIds = new Set<string>();

  for (const node of story.nodes) {
    invariant(node.id.length > 0, "Story nodes must have a non-empty id.");
    invariant(
      !nodeIds.has(node.id),
      `Story node ids must be unique. Duplicate id "${node.id}" found.`,
    );
    nodeIds.add(node.id);

    const choiceIds = new Set<string>();
    for (const choice of node.choices ?? []) {
      invariant(
        !choiceIds.has(choice.id),
        `Choice ids must be unique per node. Duplicate choice "${choice.id}" found on "${node.id}".`,
      );
      choiceIds.add(choice.id);
    }
  }

  invariant(
    nodeIds.has(story.openingNodeId),
    `Story "${story.id}" references missing opening node "${story.openingNodeId}".`,
  );

  for (const node of story.nodes) {
    for (const choice of node.choices ?? []) {
      invariant(
        nodeIds.has(choice.target),
        `Choice "${choice.id}" on "${node.id}" points to missing node "${choice.target}".`,
      );
    }

    if (node.next) {
      invariant(
        nodeIds.has(node.next),
        `Node "${node.id}" points to missing next node "${node.next}".`,
      );
    }
  }

  return story;
}

export function getStoryNode<TData extends StoryNodeData>(
  story: InteractiveStoryDefinition<TData>,
  nodeId: string,
) {
  const node = createNodeLookup(story).get(nodeId);

  if (!node) {
    throw new Error(`Story "${story.id}" does not contain node "${nodeId}".`);
  }

  return node;
}

export function getStoryChoices<TData extends StoryNodeData>(
  node: InteractiveStoryNode<TData>,
): StoryChoiceDefinition[] {
  if (node.choices && node.choices.length > 0) {
    return node.choices;
  }

  if (!node.next) {
    return [];
  }

  return [
    {
      id: `${node.id}__continue`,
      label: node.continueLabel ?? DEFAULT_CONTINUE_LABEL,
      target: node.next,
    },
  ];
}

export function isStoryEnding<TData extends StoryNodeData>(
  node: InteractiveStoryNode<TData>,
) {
  return getStoryChoices(node).length === 0;
}

export function resolveStoryPath<TData extends StoryNodeData>(
  input: InteractiveStoryDefinition<TData>,
  choiceIds: string[] = [],
  options?: {
    autoAdvanceLinearNodes?: boolean;
    maxSteps?: number;
  },
): ResolvedStoryPath<TData> {
  const story = createInteractiveStory(input);
  const nodeLookup = createNodeLookup(story);
  const nodes: InteractiveStoryNode<TData>[] = [];
  const autoAdvanceLinearNodes = options?.autoAdvanceLinearNodes ?? false;
  const maxSteps = options?.maxSteps ?? story.nodes.length * 2;
  let currentNode = nodeLookup.get(story.openingNodeId)!;
  const history: StoryHistoryEntry<TData>[] = [
    { nodeId: story.openingNodeId, data: currentNode.data },
  ];
  let currentStep = 0;
  let choiceIndex = 0;

  nodes.push(currentNode);

  while (currentStep < maxSteps) {
    currentStep += 1;

    const choices = getStoryChoices(currentNode);
    if (choices.length === 0) {
      return {
        nodes,
        history,
        currentNode,
        completed: true,
      };
    }

    let selectedChoice = choiceIds[choiceIndex]
      ? choices.find((choice) => choice.id === choiceIds[choiceIndex])
      : undefined;

    if (!selectedChoice && autoAdvanceLinearNodes && !currentNode.choices?.length) {
      selectedChoice = choices[0];
    }

    if (!selectedChoice) {
      return {
        nodes,
        history,
        currentNode,
        completed: false,
      };
    }

    const usesInputChoice = choiceIds[choiceIndex] === selectedChoice.id;
    if (usesInputChoice) {
      choiceIndex += 1;
    }

    const nextNode = nodeLookup.get(selectedChoice.target);

    if (!nextNode) {
      if (isDevelopment) {
        throw new Error(
          `Choice "${selectedChoice.id}" points to unknown node "${selectedChoice.target}".`,
        );
      }

      return {
        nodes,
        history,
        currentNode,
        completed: false,
      };
    }

    history.push({
      nodeId: nextNode.id,
      choiceId: selectedChoice.id,
      data: nextNode.data,
    });
    currentNode = nextNode;
    nodes.push(nextNode);
  }

  throw new Error(
    `Story "${story.id}" exceeded ${maxSteps} steps while resolving a path.`,
  );
}

export function buildStoryTimeline<TData extends StoryNodeData>(
  story: InteractiveStoryDefinition<TData>,
  choiceIds: string[] = [],
): StoryTimeline<TData> {
  const path = resolveStoryPath(story, choiceIds, {
    autoAdvanceLinearNodes: true,
  });
  let cursor = 0;

  const scenes = path.nodes.map((node) => {
    const scene = {
      node,
      startFrame: cursor,
      durationInFrames:
        node.durationInFrames ?? DEFAULT_REMOTION_DURATION_IN_FRAMES,
    };

    cursor += scene.durationInFrames;
    return scene;
  });

  return {
    scenes,
    totalFrames: cursor,
    history: path.history,
  };
}
