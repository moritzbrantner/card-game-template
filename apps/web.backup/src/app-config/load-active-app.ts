import configuredApp from '../../app.config';
import type { AppManifest } from '@/src/app-config/contracts';

export function loadActiveApp(): AppManifest {
  return configuredApp;
}
