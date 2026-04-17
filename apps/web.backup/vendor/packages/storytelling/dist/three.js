"use client";

// src/three.tsx
import { Canvas, useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { cn } from "@moritzbrantner/ui";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
function DefaultThreeScene({
  currentIndex,
  progress
}) {
  const meshRef = useRef(null);
  const hue = currentIndex * 62 % 360;
  useFrame((state) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    mesh.rotation.x = state.clock.elapsedTime * 0.35;
    mesh.rotation.y = state.clock.elapsedTime * 0.55;
    mesh.position.y = Math.sin(state.clock.elapsedTime * 1.4) * 0.18;
  });
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx("color", { attach: "background", args: ["#050816"] }),
    /* @__PURE__ */ jsx("ambientLight", { intensity: 0.8 }),
    /* @__PURE__ */ jsx("directionalLight", { position: [3, 4, 5], intensity: 1.8 }),
    /* @__PURE__ */ jsx("pointLight", { position: [-4, -3, 2], intensity: 1.2, color: `hsl(${hue}, 85%, 70%)` }),
    /* @__PURE__ */ jsxs("mesh", { ref: meshRef, scale: 1 + progress * 0.35, children: [
      /* @__PURE__ */ jsx("icosahedronGeometry", { args: [1.75, 1] }),
      /* @__PURE__ */ jsx(
        "meshStandardMaterial",
        {
          color: `hsl(${hue}, 85%, 62%)`,
          emissive: `hsl(${hue}, 90%, 40%)`,
          emissiveIntensity: 0.45,
          roughness: 0.2,
          metalness: 0.6
        }
      )
    ] }),
    /* @__PURE__ */ jsxs("mesh", { rotation: [-Math.PI / 2, 0, 0], position: [0, -2.7, 0], children: [
      /* @__PURE__ */ jsx("circleGeometry", { args: [4.5, 64] }),
      /* @__PURE__ */ jsx("meshStandardMaterial", { color: "#0f172a", transparent: true, opacity: 0.55 })
    ] })
  ] });
}
function StoryCanvasStage({
  node,
  className,
  cameraPosition = [0, 0, 6],
  ...renderProps
}) {
  const Scene = node.threeScene ?? DefaultThreeScene;
  return /* @__PURE__ */ jsxs(
    "div",
    {
      className: cn(
        "relative min-h-[24rem] overflow-hidden rounded-[2rem] border bg-black shadow-2xl shadow-black/20",
        node.stageClassName,
        className
      ),
      children: [
        /* @__PURE__ */ jsx(Canvas, { camera: { position: cameraPosition, fov: 42 }, children: /* @__PURE__ */ jsx(Scene, { node, ...renderProps }) }),
        /* @__PURE__ */ jsx("div", { className: "pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-black/55 to-transparent" }),
        /* @__PURE__ */ jsx("div", { className: "pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/70 to-transparent" })
      ]
    }
  );
}
export {
  StoryCanvasStage
};
