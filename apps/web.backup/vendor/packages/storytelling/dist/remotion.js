import {
  buildStoryTimeline,
  getStoryNode,
  isStoryEnding
} from "./chunk-MTPAAM4Q.js";

// src/remotion.tsx
import {
  AbsoluteFill,
  Sequence,
  interpolate,
  useCurrentFrame
} from "remotion";
import { jsx, jsxs } from "react/jsx-runtime";
function DefaultStoryRemotionScene({
  node,
  frame,
  durationInFrames,
  currentIndex,
  progress
}) {
  const opacity = interpolate(
    frame,
    [0, durationInFrames * 0.12, durationInFrames * 0.88, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const translateY = interpolate(
    frame,
    [0, durationInFrames * 0.15, durationInFrames],
    [40, 0, -28],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const hue = currentIndex * 57 % 360;
  return /* @__PURE__ */ jsxs(
    AbsoluteFill,
    {
      style: {
        opacity,
        transform: `translateY(${translateY}px)`,
        justifyContent: "space-between",
        padding: 64,
        background: `radial-gradient(circle at top, hsla(${hue}, 75%, 62%, 0.35), transparent 36%), linear-gradient(180deg, rgba(10, 15, 25, 0.95), rgba(4, 8, 14, 1))`,
        color: "white",
        fontFamily: "ui-sans-serif, system-ui, sans-serif"
      },
      children: [
        /* @__PURE__ */ jsxs("div", { children: [
          node.eyebrow ? /* @__PURE__ */ jsx("p", { style: { fontSize: 18, letterSpacing: "0.25em", textTransform: "uppercase", opacity: 0.72 }, children: node.eyebrow }) : null,
          /* @__PURE__ */ jsx("h2", { style: { marginTop: 20, fontSize: 62, lineHeight: 1.05, maxWidth: 980 }, children: node.title }),
          node.body ? /* @__PURE__ */ jsx(
            "div",
            {
              style: {
                marginTop: 28,
                maxWidth: 840,
                fontSize: 28,
                lineHeight: 1.55,
                opacity: 0.82
              },
              children: node.body
            }
          ) : null
        ] }),
        /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 16 }, children: [
          /* @__PURE__ */ jsx(
            "div",
            {
              style: {
                width: 420,
                borderRadius: 999,
                background: "rgba(255,255,255,0.12)",
                padding: 6
              },
              children: /* @__PURE__ */ jsx(
                "div",
                {
                  style: {
                    height: 10,
                    width: `${Math.max(progress * 100, 10)}%`,
                    borderRadius: 999,
                    background: "white"
                  }
                }
              )
            }
          ),
          /* @__PURE__ */ jsxs("span", { style: { fontSize: 16, letterSpacing: "0.2em", textTransform: "uppercase", opacity: 0.75 }, children: [
            "Scene ",
            currentIndex + 1
          ] })
        ] })
      ]
    }
  );
}
function StoryRemotionComposition({
  story,
  choiceIds = []
}) {
  const frame = useCurrentFrame();
  const timeline = buildStoryTimeline(story, choiceIds);
  return /* @__PURE__ */ jsx(AbsoluteFill, { children: timeline.scenes.map((scene, index) => {
    const Scene = scene.node.remotionScene ?? DefaultStoryRemotionScene;
    const history = timeline.history.slice(0, index + 1);
    const sceneFrame = Math.max(frame - scene.startFrame, 0);
    const node = getStoryNode(story, scene.node.id);
    return /* @__PURE__ */ jsx(
      Sequence,
      {
        from: scene.startFrame,
        durationInFrames: scene.durationInFrames,
        children: /* @__PURE__ */ jsx(
          Scene,
          {
            story,
            node,
            history,
            currentIndex: index,
            progress: (index + 1) / Math.max(timeline.scenes.length, 1),
            isEnding: isStoryEnding(node),
            canGoBack: index > 0,
            choose: () => {
            },
            goBack: () => {
            },
            restart: () => {
            },
            frame: sceneFrame,
            absoluteFrame: frame,
            durationInFrames: scene.durationInFrames
          }
        )
      },
      scene.node.id
    );
  }) });
}
export {
  DefaultStoryRemotionScene,
  StoryRemotionComposition,
  buildStoryTimeline
};
