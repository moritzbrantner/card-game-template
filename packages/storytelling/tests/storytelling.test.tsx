// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import {
  InteractiveStoryPlayer,
  StoryContainer,
  StoryScene,
  StorySeries,
  buildStoryTimeline,
  createAudioStoryScene,
  createInteractiveStory,
  createSubtitleStoryScene,
  createVideoStoryScene,
  resolveStoryPath,
} from "../src";

describe("@moritzbrantner/storytelling", () => {
  const branchingStory = createInteractiveStory({
    id: "signal",
    title: "Signal in the fog",
    openingNodeId: "wake",
    nodes: [
      {
        id: "wake",
        title: "Wake the observatory",
        body: "A low signal reaches the tower. You decide whether to answer it or trace it first.",
        prompt: "What should the operator do first?",
        choices: [
          {
            id: "answer",
            label: "Answer immediately",
            target: "answer-node",
          },
          {
            id: "trace",
            label: "Trace the source",
            target: "trace-node",
          },
        ],
      },
      {
        id: "answer-node",
        title: "A distant pilot responds",
        body: "The message is fragmented, but the pilot confirms the storm wall is moving fast.",
      },
      {
        id: "trace-node",
        title: "The map reveals a hidden harbor",
        body: "The signal comes from a cove nobody has charted in decades.",
      },
    ],
  });

  test("renders a story container in jsdom", () => {
    render(
      <StoryContainer title="History" subtitle="Timeline">
        <StorySeries ariaLabel="Story">
          <StoryScene id="one" title="One">
            First scene
          </StoryScene>
          <StoryScene id="two" title="Two">
            Second scene
          </StoryScene>
        </StorySeries>
      </StoryContainer>,
    );

    expect(screen.getByRole("region", { name: "History" })).toBeTruthy();
    expect(screen.getByText("First scene")).toBeTruthy();
    expect(screen.getByRole("navigation", { name: "Story minimap" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Reset" })).toBeTruthy();
  });

  test("navigates story scenes through the minimap", () => {
    const originalScrollTo = HTMLElement.prototype.scrollTo;
    const scrollToMock = vi.fn();

    Object.defineProperty(HTMLElement.prototype, "scrollTo", {
      configurable: true,
      value: scrollToMock,
    });

    try {
      render(
        <StoryContainer title="History" subtitle="Timeline">
          <StorySeries ariaLabel="Story">
            <StoryScene id="one" title="One">
              First scene
            </StoryScene>
            <StoryScene id="two" title="Two">
              Second scene
            </StoryScene>
            <StoryScene id="three" title="Three">
              Third scene
            </StoryScene>
          </StorySeries>
        </StoryContainer>,
      );

      fireEvent.click(screen.getAllByRole("button", { name: "Go to scene 2: Two" })[0]);

      expect(scrollToMock).toHaveBeenCalledWith(
        expect.objectContaining({
          behavior: "smooth",
          top: 0,
        }),
      );
    } finally {
      Object.defineProperty(HTMLElement.prototype, "scrollTo", {
        configurable: true,
        value: originalScrollTo,
      });
    }
  });

  test("renders a branching story and advances when a choice is selected", async () => {
    render(<InteractiveStoryPlayer story={branchingStory} />);

    expect(screen.getAllByText("Wake the observatory").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "Trace the source" }));

    expect(
      await screen.findByText(
        "The signal comes from a cove nobody has charted in decades.",
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(/Restart to explore another branch, or go back to choose a different path/),
    ).toBeTruthy();
  });

  test("resolves branching paths for interactive and remotion use cases", () => {
    const path = resolveStoryPath(branchingStory, ["answer"]);

    expect(path.nodes.map((node) => node.id)).toEqual(["wake", "answer-node"]);
    expect(path.completed).toBe(true);

    const timeline = buildStoryTimeline(branchingStory, ["trace"]);

    expect(timeline.scenes).toHaveLength(2);
    expect(timeline.totalFrames).toBe(240);
    expect(timeline.scenes[1]?.node.id).toBe("trace-node");
  });

  test("renders subtitle scenes from subtitle file content", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        `WEBVTT

00:00:00.000 --> 00:00:02.000
We open on the empty station.

00:00:02.250 --> 00:00:04.500
The archive starts speaking again.`,
        { status: 200 },
      ),
    );

    vi.stubGlobal("fetch", fetchMock);

    try {
      const mediaStory = createInteractiveStory({
        id: "subtitle-story",
        title: "Subtitle scene story",
        openingNodeId: "captions",
        nodes: [
          {
            id: "captions",
            title: "Captions",
            body: "Subtitle files should render as reusable story stages.",
            scene: createSubtitleStoryScene({
              src: "/media/intro.vtt",
              description: "Caption cues are loaded from the subtitle file.",
            }),
          },
        ],
      });

      render(<InteractiveStoryPlayer story={mediaStory} />);

      expect(await screen.findByText("We open on the empty station.")).toBeTruthy();
      expect(screen.getByText("The archive starts speaking again.")).toBeTruthy();
      expect(fetchMock).toHaveBeenCalledWith("/media/intro.vtt");
    } finally {
      vi.unstubAllGlobals();
    }
  });

  test("renders audio and video story scenes with native media elements", async () => {
    const mediaStory = createInteractiveStory({
      id: "media-story",
      title: "Media story",
      openingNodeId: "audio",
      nodes: [
        {
          id: "audio",
          title: "Listen to the recording",
          next: "video",
          scene: createAudioStoryScene({
            src: "/audio/transmission.mp3",
            title: "Transmission",
            tracks: [
              {
                src: "/audio/transmission.vtt",
                label: "English captions",
                srcLang: "en",
                kind: "captions",
              },
            ],
          }),
        },
        {
          id: "video",
          title: "Watch the feed",
          scene: createVideoStoryScene({
            src: "/video/feed.mp4",
            poster: "/video/feed.jpg",
            title: "Harbor feed",
            tracks: [
              {
                src: "/video/feed.vtt",
                label: "English subtitles",
                srcLang: "en",
                default: true,
              },
            ],
          }),
        },
      ],
    });

    render(<InteractiveStoryPlayer story={mediaStory} />);

    const audio = document.querySelector("audio");

    expect(audio?.getAttribute("src")).toBe("/audio/transmission.mp3");
    expect(audio?.querySelector('track[kind="captions"]')?.getAttribute("src")).toBe(
      "/audio/transmission.vtt",
    );

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    await screen.findByText("Harbor feed");

    const video = document.querySelector("video");

    expect(video?.getAttribute("src")).toBe("/video/feed.mp4");
    expect(video?.getAttribute("poster")).toBe("/video/feed.jpg");
    expect(video?.querySelector('track[label="English subtitles"]')?.getAttribute("src")).toBe(
      "/video/feed.vtt",
    );
  });
});
