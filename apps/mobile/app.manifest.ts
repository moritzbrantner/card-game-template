export const appManifest = {
  appId: 'mobile',
  slug: 'mobile',
  displayName: 'Mobile',
  platform: 'mobile',
  packageName: 'mobile',
  entryWorkspace: 'apps/mobile',
  releaseCadence: 'independent',
  sharedPackages: [
    '@repo/auth-contract',
    '@repo/game-catalog',
    '@repo/game-contracts',
    '@repo/game-engine',
    '@repo/multiplayer-contract',
  ],
  featureFlags: ['accounts', 'touch-play', 'match-history', 'multiplayer'],
  deployment: {
    runtime: 'expo',
    scheme: 'mobile',
  },
} as const;
