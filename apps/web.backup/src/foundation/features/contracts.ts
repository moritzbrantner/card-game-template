import type { ContentCollection } from '@/src/content/contracts';
import type { FoundationFeatureKey } from '@/src/app-config/feature-keys';

export type FoundationFeatureModule = {
  featureKey: FoundationFeatureKey;
  requiredMessageNamespaces: readonly string[];
  requiredContentCollections: readonly ContentCollection[];
};
