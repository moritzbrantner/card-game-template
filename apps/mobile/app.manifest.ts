export const appManifest = {
  appId: 'mobile',
  slug: 'mobile',
  displayName: 'Mobile',
  platform: 'mobile',
  packageName: 'mobile',
  entryWorkspace: 'apps/mobile',
  releaseCadence: 'independent',
  sharedPackages: ['@repo/upload-playbook'],
  featureFlags: ['tabs', 'profiles', 'uploads'],
  deployment: {
    runtime: 'expo',
    scheme: 'mobile',
  },
} as const;
