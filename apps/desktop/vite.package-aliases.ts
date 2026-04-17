import path from 'node:path';

export const packageAliases = {
  '@moritzbrantner/electron-commands/main': path.resolve(
    __dirname,
    'packages/electron-commands/src/main.ts',
  ),
  '@moritzbrantner/electron-commands/preload': path.resolve(
    __dirname,
    'packages/electron-commands/src/preload.ts',
  ),
  '@moritzbrantner/electron-commands/renderer': path.resolve(
    __dirname,
    'packages/electron-commands/src/renderer.ts',
  ),
  '@moritzbrantner/electron-commands/shared': path.resolve(
    __dirname,
    'packages/electron-commands/src/shared.ts',
  ),
  '@moritzbrantner/electron-documents/main': path.resolve(
    __dirname,
    'packages/electron-documents/src/main.ts',
  ),
  '@moritzbrantner/electron-documents/preload': path.resolve(
    __dirname,
    'packages/electron-documents/src/preload.ts',
  ),
  '@moritzbrantner/electron-documents/renderer': path.resolve(
    __dirname,
    'packages/electron-documents/src/renderer.ts',
  ),
  '@moritzbrantner/electron-documents/shared': path.resolve(
    __dirname,
    'packages/electron-documents/src/shared.ts',
  ),
  '@moritzbrantner/electron-json-store/main': path.resolve(
    __dirname,
    'packages/electron-json-store/src/main.ts',
  ),
  '@moritzbrantner/electron-json-store/shared': path.resolve(
    __dirname,
    'packages/electron-json-store/src/shared.ts',
  ),
  '@moritzbrantner/electron-preferences/main': path.resolve(
    __dirname,
    'packages/electron-preferences/src/main.ts',
  ),
  '@moritzbrantner/electron-preferences/preload': path.resolve(
    __dirname,
    'packages/electron-preferences/src/preload.ts',
  ),
  '@moritzbrantner/electron-preferences/renderer': path.resolve(
    __dirname,
    'packages/electron-preferences/src/renderer.ts',
  ),
  '@moritzbrantner/electron-preferences/shared': path.resolve(
    __dirname,
    'packages/electron-preferences/src/shared.ts',
  ),
  '@moritzbrantner/electron-window-state/main': path.resolve(
    __dirname,
    'packages/electron-window-state/src/main.ts',
  ),
  '@moritzbrantner/electron-window-state/shared': path.resolve(
    __dirname,
    'packages/electron-window-state/src/shared.ts',
  ),
};
