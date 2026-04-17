export const appManifest = {
  appId: 'web',
  slug: 'web',
  displayName: 'Web',
  platform: 'web',
  packageName: 'next-template',
  entryWorkspace: 'apps/web',
  releaseCadence: 'independent',
  sharedPackages: ['@repo/upload-playbook'],
  featureFlags: ['auth', 'profiles', 'uploads'],
  deployment: {
    runtime: 'nextjs',
    target: 'node',
  },
} as const;
