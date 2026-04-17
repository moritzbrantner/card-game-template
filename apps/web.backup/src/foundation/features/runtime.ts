import { loadActiveApp } from '@/src/app-config/load-active-app';
import type { AppManifest } from '@/src/app-config/contracts';
import type { FoundationFeatureKey } from '@/src/app-config/feature-keys';

export function isFeatureEnabled(featureKey: FoundationFeatureKey, manifest: AppManifest = loadActiveApp()) {
  return manifest.enabledFeatures[featureKey] === true;
}
