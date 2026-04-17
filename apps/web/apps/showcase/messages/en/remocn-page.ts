export const remocnPage = {
  eyebrow: 'Registry components',
  subeyebrow: 'Installed from remocn.dev with the CLI',
  title: 'A remocn showcase route inside the existing app shell.',
  description:
    'This page embeds remocn primitives directly in the Next.js App Router app. The components were pulled from the official registry and rendered in-browser with the Remotion player.',
  supportingCopy:
    'remocn is documented for Remotion projects first. In this repo, the same building blocks are mounted as interactive previews so you can evaluate the motion language without leaving the app.',
  actions: {
    catalog: 'Open component catalog',
    installation: 'Open installation guide',
  },
  stats: {
    components: 'Registry components imported with shadcn',
    registryFlow: 'Registry install flow reused from the docs',
    browserPreview: 'Browser-rendered previews powered by @remotion/player',
  },
  cards: {
    terminal: {
      eyebrow: 'UI Block',
      title: 'TerminalSimulator',
      description: 'A CLI-style install preview that makes the registry workflow feel tangible instead of theoretical.',
    },
    blur: {
      eyebrow: 'Typography',
      title: 'BlurReveal',
      description: 'A heavy-to-sharp text reveal that works well for hero copy, intros, and product names.',
    },
    matrix: {
      eyebrow: 'Typography',
      title: 'MatrixDecode',
      description: 'A decoding text treatment with a technical edge, useful for launch sequences and status states.',
    },
    spotlight: {
      eyebrow: 'Environment & lighting',
      title: 'SpotlightCard',
      description: 'A synthetic cursor drags a soft radial light over a card surface and makes the border breathe.',
    },
  },
  install: {
    title: 'CLI command',
    description:
      'These are the remocn components added to this repo through the registry flow. The page then wraps them with the browser player rather than a standalone video composition.',
  },
  integration: {
    title: 'Integration notes',
    pointOne: 'The registry components themselves came in through the official shadcn-compatible CLI.',
    pointTwo: 'Because this repository is a website, not a dedicated Remotion project, the previews run through @remotion/player.',
    pointThree: 'The route stays localized and lives inside the existing navigation shell instead of creating a separate demo app.',
  },
};
