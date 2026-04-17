import type { CommandsBridge } from '@moritzbrantner/electron-commands/renderer';
import type { DocumentsBridge } from '@moritzbrantner/electron-documents/renderer';
import type { PreferencesBridge } from '@moritzbrantner/electron-preferences/renderer';

import type { DesktopPreferences } from './platform/shared/preferences';

declare global {
  interface Window {
    desktop: {
      commands: CommandsBridge;
      documents: DocumentsBridge;
      preferences: PreferencesBridge<DesktopPreferences>;
    };
  }
}

export {};
