export const appManifest = {
  appId: 'desktop',
  slug: 'desktop',
  displayName: 'Desktop',
  platform: 'desktop',
  packageName: 'desktop',
  entryWorkspace: 'apps/desktop',
  releaseCadence: 'independent',
  sharedPackages: [
    '@repo/auth-contract',
    '@repo/game-catalog',
    '@repo/game-contracts',
    '@repo/game-engine',
    '@repo/multiplayer-contract',
  ],
  featureFlags: ['accounts', 'local-play', 'match-history', 'multiplayer'],
  deployment: {
    runtime: 'electron',
    entrypoint: '.vite/build/main.js',
  },
} as const;
