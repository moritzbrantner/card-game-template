// src/interactive-story.ts
var DEFAULT_CONTINUE_LABEL = "Continue";
var DEFAULT_REMOTION_DURATION_IN_FRAMES = 120;
var isDevelopment = process.env.NODE_ENV !== "production";
function invariant(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
function createNodeLookup(story) {
  return new Map(story.nodes.map((node) => [node.id, node]));
}
function createInteractiveStory(story) {
  invariant(
    story.nodes.length > 0,
    `Story "${story.id}" must declare at least one node.`
  );
  const nodeIds = /* @__PURE__ */ new Set();
  for (const node of story.nodes) {
    invariant(node.id.length > 0, "Story nodes must have a non-empty id.");
    invariant(
      !nodeIds.has(node.id),
      `Story node ids must be unique. Duplicate id "${node.id}" found.`
    );
    nodeIds.add(node.id);
    const choiceIds = /* @__PURE__ */ new Set();
    for (const choice of node.choices ?? []) {
      invariant(
        !choiceIds.has(choice.id),
        `Choice ids must be unique per node. Duplicate choice "${choice.id}" found on "${node.id}".`
      );
      choiceIds.add(choice.id);
    }
  }
  invariant(
    nodeIds.has(story.openingNodeId),
    `Story "${story.id}" references missing opening node "${story.openingNodeId}".`
  );
  for (const node of story.nodes) {
    for (const choice of node.choices ?? []) {
      invariant(
        nodeIds.has(choice.target),
        `Choice "${choice.id}" on "${node.id}" points to missing node "${choice.target}".`
      );
    }
    if (node.next) {
      invariant(
        nodeIds.has(node.next),
        `Node "${node.id}" points to missing next node "${node.next}".`
      );
    }
  }
  return story;
}
function getStoryNode(story, nodeId) {
  const node = createNodeLookup(story).get(nodeId);
  if (!node) {
    throw new Error(`Story "${story.id}" does not contain node "${nodeId}".`);
  }
  return node;
}
function getStoryChoices(node) {
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
      target: node.next
    }
  ];
}
function isStoryEnding(node) {
  return getStoryChoices(node).length === 0;
}
function resolveStoryPath(input, choiceIds = [], options) {
  const story = createInteractiveStory(input);
  const nodeLookup = createNodeLookup(story);
  const nodes = [];
  const autoAdvanceLinearNodes = options?.autoAdvanceLinearNodes ?? false;
  const maxSteps = options?.maxSteps ?? story.nodes.length * 2;
  let currentNode = nodeLookup.get(story.openingNodeId);
  const history = [
    { nodeId: story.openingNodeId, data: currentNode.data }
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
        completed: true
      };
    }
    let selectedChoice = choiceIds[choiceIndex] ? choices.find((choice) => choice.id === choiceIds[choiceIndex]) : void 0;
    if (!selectedChoice && autoAdvanceLinearNodes && !currentNode.choices?.length) {
      selectedChoice = choices[0];
    }
    if (!selectedChoice) {
      return {
        nodes,
        history,
        currentNode,
        completed: false
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
          `Choice "${selectedChoice.id}" points to unknown node "${selectedChoice.target}".`
        );
      }
      return {
        nodes,
        history,
        currentNode,
        completed: false
      };
    }
    history.push({
      nodeId: nextNode.id,
      choiceId: selectedChoice.id,
      data: nextNode.data
    });
    currentNode = nextNode;
    nodes.push(nextNode);
  }
  throw new Error(
    `Story "${story.id}" exceeded ${maxSteps} steps while resolving a path.`
  );
}
function buildStoryTimeline(story, choiceIds = []) {
  const path = resolveStoryPath(story, choiceIds, {
    autoAdvanceLinearNodes: true
  });
  let cursor = 0;
  const scenes = path.nodes.map((node) => {
    const scene = {
      node,
      startFrame: cursor,
      durationInFrames: node.durationInFrames ?? DEFAULT_REMOTION_DURATION_IN_FRAMES
    };
    cursor += scene.durationInFrames;
    return scene;
  });
  return {
    scenes,
    totalFrames: cursor,
    history: path.history
  };
}

export {
  createInteractiveStory,
  getStoryNode,
  getStoryChoices,
  isStoryEnding,
  resolveStoryPath,
  buildStoryTimeline
};
