import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { EventEmitter } from 'node:events';

import { createCommandsService } from '../../packages/electron-commands/src/main.ts';
import { createDocumentsService } from '../../packages/electron-documents/src/main.ts';
import { createJsonStore } from '../../packages/electron-json-store/src/main.ts';
import { createPreferencesService } from '../../packages/electron-preferences/src/main.ts';
import { createWindowStateManager } from '../../packages/electron-window-state/src/main.ts';

await test('json store loads defaults, validates, migrates, and writes atomically', async () => {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), 'desktop-json-store-'),
  );
  const defaults = { enabled: true, theme: 'system' };
  const filePath = path.join(directory, 'preferences.json');

  const store = createJsonStore({
    defaultValue: defaults,
    filePath,
    migrations: {
      0: (value) => {
        const legacy = value as { theme: string };
        return {
          enabled: true,
          theme: legacy.theme,
        };
      },
    },
    validate: (value): value is typeof defaults =>
      Boolean(
        value &&
        typeof value === 'object' &&
        typeof (value as typeof defaults).enabled === 'boolean' &&
        typeof (value as typeof defaults).theme === 'string',
      ),
    version: 1,
  });

  assert.deepEqual(await store.load(), defaults);

  await writeFile(
    filePath,
    JSON.stringify({ data: { theme: 'dark' }, version: 0 }),
    'utf8',
  );
  const migratedStore = createJsonStore({
    defaultValue: defaults,
    filePath,
    migrations: {
      0: (value) => {
        const legacy = value as { theme: string };
        return {
          enabled: true,
          theme: legacy.theme,
        };
      },
    },
    validate: (value): value is typeof defaults =>
      Boolean(
        value &&
        typeof value === 'object' &&
        typeof (value as typeof defaults).enabled === 'boolean' &&
        typeof (value as typeof defaults).theme === 'string',
      ),
    version: 1,
  });

  assert.deepEqual(await migratedStore.load(), {
    enabled: true,
    theme: 'dark',
  });

  await migratedStore.save({ enabled: false, theme: 'light' });
  const persisted = JSON.parse(await readFile(filePath, 'utf8'));
  assert.deepEqual(persisted.data, { enabled: false, theme: 'light' });
  await assert.rejects(async () => {
    await writeFile(
      filePath,
      JSON.stringify({ data: { broken: true }, version: 1 }),
      'utf8',
    );
    const invalidStore = createJsonStore({
      defaultValue: defaults,
      filePath,
      validate: (value): value is typeof defaults =>
        Boolean(
          value &&
          typeof value === 'object' &&
          typeof (value as typeof defaults).enabled === 'boolean' &&
          typeof (value as typeof defaults).theme === 'string',
        ),
      version: 1,
    });
    await invalidStore.load();
  }, /Invalid persisted data/);
  await assert.rejects(() => stat(`${filePath}.tmp`));
  await rm(directory, { force: true, recursive: true });
});

await test('preferences service supports get, set, reset, validation, and subscriptions', async () => {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), 'desktop-preferences-'),
  );
  const filePath = path.join(directory, 'preferences.json');
  const defaults = {
    appearance: { theme: 'system' as const },
    developer: { openDevToolsOnLaunch: false },
    documents: { reopenLastDocument: false },
  };
  const broadcastCalls = [];
  const store = createJsonStore({
    defaultValue: defaults,
    filePath,
    validate: (value): value is typeof defaults =>
      Boolean(
        value &&
        typeof value === 'object' &&
        typeof (value as typeof defaults).appearance?.theme === 'string' &&
        typeof (value as typeof defaults).developer?.openDevToolsOnLaunch ===
          'boolean' &&
        typeof (value as typeof defaults).documents?.reopenLastDocument ===
          'boolean',
      ),
    version: 1,
  });
  const preferences = createPreferencesService({
    defaultValue: defaults,
    getBroadcastTargets: () =>
      [
        {
          isDestroyed: () => false,
          send: (_channel: string, snapshot: typeof defaults) => {
            broadcastCalls.push(snapshot);
          },
        },
      ] as never,
    store,
    validate: (value): value is typeof defaults =>
      Boolean(
        value &&
        typeof value === 'object' &&
        typeof (value as typeof defaults).appearance?.theme === 'string' &&
        typeof (value as typeof defaults).developer?.openDevToolsOnLaunch ===
          'boolean' &&
        typeof (value as typeof defaults).documents?.reopenLastDocument ===
          'boolean',
      ),
  });

  const updates = [];
  preferences.subscribe((snapshot) => {
    updates.push(snapshot);
  });

  await preferences.set('appearance', { theme: 'dark' });
  assert.deepEqual(await preferences.get('appearance'), { theme: 'dark' });
  assert.equal(updates.at(-1)?.appearance.theme, 'dark');
  assert.equal(broadcastCalls.at(-1)?.appearance.theme, 'dark');

  await assert.rejects(async () => {
    await preferences.set('developer', {
      openDevToolsOnLaunch: 'yes',
    } as never);
  }, /Invalid preferences update/);

  const resetPreferences = await preferences.reset();
  assert.deepEqual(resetPreferences, defaults);
  await rm(directory, { force: true, recursive: true });
});

await test('commands service rejects duplicates and disabled commands', async () => {
  assert.throws(
    () =>
      createCommandsService({
        definitions: [
          {
            execute: () => undefined,
            id: 'duplicate',
            label: 'Duplicate',
          },
          {
            execute: () => undefined,
            id: 'duplicate',
            label: 'Duplicate again',
          },
        ],
      }),
    /Duplicate command id/,
  );

  assert.throws(
    () =>
      createCommandsService({
        definitions: [
          {
            accelerator: 'CmdOrCtrl+S',
            execute: () => undefined,
            id: 'save-a',
            label: 'Save A',
          },
          {
            accelerator: 'CmdOrCtrl+S',
            execute: () => undefined,
            id: 'save-b',
            label: 'Save B',
          },
        ],
      }),
    /Duplicate command accelerator/,
  );

  const service = createCommandsService({
    definitions: [
      {
        execute: () => undefined,
        id: 'disabled',
        isEnabled: () => false,
        label: 'Disabled',
      },
    ],
  });

  await assert.rejects(
    async () => service.run('disabled'),
    /Command is disabled/,
  );

  let ranSave = false;
  const hotkeyService = createCommandsService({
    definitions: [
      {
        accelerator: 'CmdOrCtrl+S',
        execute: () => {
          ranSave = true;
        },
        id: 'save',
        label: 'Save',
      },
    ],
  });

  const browserWindowStub = {
    webContents: new EventEmitter(),
  };
  hotkeyService.attachToWindow(browserWindowStub as never);
  browserWindowStub.webContents.emit(
    'before-input-event',
    { preventDefault() {} },
    { control: true, key: 's' },
  );
  assert.equal(ranSave, true);
});

await test('documents service supports save, save as, open recent, dirty state, and cancelation', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'desktop-documents-'));
  const documentFilePath = path.join(directory, 'note.desktop.json');
  const recentFilePath = path.join(directory, 'second.desktop.json');
  const recentStore = createJsonStore({
    defaultValue: {
      items: [],
      lastOpenedPath: null,
    },
    filePath: path.join(directory, 'documents.json'),
    validate: (
      value,
    ): value is {
      items: Array<{ filePath: string; lastOpenedAt: string; name: string }>;
      lastOpenedPath: string | null;
    } =>
      Boolean(
        value &&
        typeof value === 'object' &&
        Array.isArray((value as { items: unknown[] }).items) &&
        ((value as { lastOpenedPath?: unknown }).lastOpenedPath === null ||
          typeof (value as { lastOpenedPath?: unknown }).lastOpenedPath ===
            'string'),
      ),
    version: 1,
  });
  const dialogAdapter = {
    async showOpenDialog() {
      return { canceled: false, filePaths: [recentFilePath] };
    },
    async showSaveDialog() {
      return { canceled: false, filePath: documentFilePath };
    },
    async showUnsavedChangesDialog() {
      return 'save' as const;
    },
  };
  const service = createDocumentsService({
    defaultContent: '',
    dialogAdapter,
    getBroadcastTargets: () => [],
    recentStore,
    serializer: {
      deserialize(raw: string) {
        const parsed = JSON.parse(raw) as { content: string };
        return { content: parsed.content };
      },
      extension: 'desktop.json',
      name: 'Desktop',
      serialize(value) {
        return JSON.stringify({ content: value.content });
      },
    },
  });

  await service.updateDraft('hello world');
  assert.equal((await service.getState()).isDirty, true);

  await service.saveAs(null as never);
  assert.equal((await service.getState()).filePath, null);

  await service.saveAs({} as never);
  assert.equal((await service.getState()).filePath, documentFilePath);
  assert.equal((await service.getState()).isDirty, false);

  await service.updateDraft('hello again');
  await service.save({} as never);
  assert.equal(
    JSON.parse(await readFile(documentFilePath, 'utf8')).content,
    'hello again',
  );

  await writeFile(
    recentFilePath,
    JSON.stringify({ content: 'from recent' }),
    'utf8',
  );
  await service.openRecent(recentFilePath, {} as never);
  assert.equal((await service.getState()).content, 'from recent');
  assert.equal((await service.listRecent()).length, 2);

  const cancelService = createDocumentsService({
    defaultContent: 'start',
    dialogAdapter: {
      async showOpenDialog() {
        return { canceled: true, filePaths: [] };
      },
      async showSaveDialog() {
        return { canceled: true };
      },
      async showUnsavedChangesDialog() {
        return 'cancel' as const;
      },
    },
    getBroadcastTargets: () => [],
    recentStore,
    serializer: {
      deserialize(raw: string) {
        const parsed = JSON.parse(raw) as { content: string };
        return { content: parsed.content };
      },
      extension: 'desktop.json',
      name: 'Desktop',
      serialize(value) {
        return JSON.stringify({ content: value.content });
      },
    },
  });

  await cancelService.updateDraft('dirty');
  await cancelService.newDocument({} as never);
  assert.equal((await cancelService.getState()).content, 'dirty');

  await rm(directory, { force: true, recursive: true });
});

await test('window state manager restores and persists bounds plus maximize/fullscreen flags', async () => {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), 'desktop-window-state-'),
  );
  const store = createJsonStore({
    defaultValue: {},
    filePath: path.join(directory, 'window-state.json'),
    validate: (value): value is Record<string, unknown> =>
      Boolean(value && typeof value === 'object'),
    version: 1,
  });
  const manager = createWindowStateManager({ debounceInMs: 5, store });

  assert.equal((await manager.getState('main')).bounds.width, 1120);

  class BrowserWindowStub extends EventEmitter {
    getBounds() {
      return { height: 640, width: 960, x: 20, y: 30 };
    }

    isFullScreen() {
      return true;
    }

    isMaximized() {
      return true;
    }
  }

  const browserWindow = new BrowserWindowStub();
  manager.track('main', browserWindow as never);
  browserWindow.emit('resize');

  await new Promise((resolve) => setTimeout(resolve, 15));
  const persisted = await manager.getState('main');

  assert.equal(persisted.bounds.width, 960);
  assert.equal(persisted.bounds.height, 640);
  assert.equal(persisted.isMaximized, true);
  assert.equal(persisted.isFullScreen, true);

  await rm(directory, { force: true, recursive: true });
});

await test('desktop private packages expose the expected app-private entrypoints', async () => {
  const packageChecks = [
    {
      path: '../../packages/electron-commands/package.json',
      exports: ['./main', './preload', './renderer', './shared'],
    },
    {
      path: '../../packages/electron-documents/package.json',
      exports: ['./main', './preload', './renderer', './shared'],
    },
    {
      path: '../../packages/electron-json-store/package.json',
      exports: ['./main', './shared'],
    },
    {
      path: '../../packages/electron-preferences/package.json',
      exports: ['./main', './preload', './renderer', './shared'],
    },
    {
      path: '../../packages/electron-window-state/package.json',
      exports: ['./main', './shared'],
    },
  ];

  for (const packageCheck of packageChecks) {
    const manifest = JSON.parse(
      await readFile(new URL(packageCheck.path, import.meta.url), 'utf8'),
    ) as {
      exports: Record<string, string>;
      private: boolean;
    };

    assert.equal(manifest.private, true);

    for (const exportPath of packageCheck.exports) {
      assert.equal(
        typeof manifest.exports[exportPath],
        'string',
        `${packageCheck.path} is missing ${exportPath}`,
      );
    }
  }
});
