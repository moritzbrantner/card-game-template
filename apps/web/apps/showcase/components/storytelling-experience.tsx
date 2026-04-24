'use client';

import {
  StoryContainer,
  StoryScene as PackageStoryScene,
  StorySeries,
} from '@moritzbrantner/storytelling';

export type StoryScene = {
  id: string;
  title: string;
  description: string;
  progressionStart: number;
  progressionEnd: number;
  color: string;
  position: [number, number, number];
  scale?: number;
};

type StorytellingExperienceProps = {
  scenes: StoryScene[];
};

function formatPosition(position: [number, number, number]) {
  return position.map((value) => value.toFixed(1)).join(', ');
}

function toRgb(hexColor: string) {
  const normalized = hexColor.replace('#', '');

  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return null;
  }

  const value = Number.parseInt(normalized, 16);

  return {
    red: (value >> 16) & 255,
    green: (value >> 8) & 255,
    blue: value & 255,
  };
}

function toAlphaColor(hexColor: string, alpha: number) {
  const rgb = toRgb(hexColor);

  if (!rgb) {
    return hexColor;
  }

  return `rgba(${rgb.red}, ${rgb.green}, ${rgb.blue}, ${alpha})`;
}

export function StorytellingExperience({
  scenes,
}: StorytellingExperienceProps) {
  return (
    <StoryContainer
      title="Package-powered story sequence"
      subtitle="This scroll sequence now runs on @moritzbrantner/storytelling instead of the local prototype."
      ariaLabel="Storytelling package demo"
      className="rounded-[2rem] border-border/60 bg-gradient-to-b from-background via-background to-muted/30 shadow-sm"
    >
      <StorySeries
        ariaLabel="Story sequence scenes"
        viewportClassName="h-[30rem] md:h-[72vh]"
        className="rounded-[1.75rem] border border-border/60 bg-background/80 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.45)]"
      >
        {scenes.map((scene, index) => {
          const accentBackground = toAlphaColor(scene.color, 0.14);
          const accentBorder = toAlphaColor(scene.color, 0.34);
          const accentGlow = toAlphaColor(scene.color, 0.18);

          return (
            <PackageStoryScene
              key={scene.id}
              id={scene.id}
              title={scene.title}
              menuLabel={String(index + 1).padStart(2, '0')}
              eyebrow={`Scene ${index + 1}`}
              className="p-0"
            >
              <div className="space-y-5">
                <div
                  className="inline-flex items-center gap-3 rounded-full border px-3 py-1 text-xs uppercase tracking-[0.18em]"
                  style={{
                    backgroundColor: accentBackground,
                    borderColor: accentBorder,
                    boxShadow: `0 0 0 1px ${accentGlow}`,
                  }}
                >
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: scene.color }}
                    aria-hidden="true"
                  />
                  Internal Progression {scene.progressionStart}-
                  {scene.progressionEnd}
                </div>

                <p>{scene.description}</p>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div
                    className="rounded-[1.5rem] border p-4"
                    style={{
                      background: `linear-gradient(135deg, ${accentBackground}, transparent 70%)`,
                      borderColor: accentBorder,
                    }}
                  >
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      Focus Vector
                    </p>
                    <p className="mt-2 font-mono text-sm text-foreground">
                      {formatPosition(scene.position)}
                    </p>
                  </div>

                  <div
                    className="rounded-[1.5rem] border p-4"
                    style={{
                      background: `linear-gradient(135deg, ${accentGlow}, transparent 70%)`,
                      borderColor: accentBorder,
                    }}
                  >
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      Scene Scale
                    </p>
                    <p className="mt-2 text-sm text-foreground">
                      {(scene.scale ?? 1).toFixed(2)}x
                    </p>
                  </div>
                </div>
              </div>
            </PackageStoryScene>
          );
        })}
      </StorySeries>
    </StoryContainer>
  );
}
