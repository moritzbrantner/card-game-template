import path from 'node:path';

import { app, BrowserWindow, Menu, dialog, ipcMain } from 'electron';

import {
  createCommandsService,
  type CommandDefinition,
} from '@moritzbrantner/electron-commands/main';
import {
  createDocumentsService,
  type DocumentDialogAdapter,
} from '@moritzbrantner/electron-documents/main';
import { createJsonStore } from '@moritzbrantner/electron-json-store/main';
import { createPreferencesService } from '@moritzbrantner/electron-preferences/main';
import { createWindowStateManager } from '@moritzbrantner/electron-window-state/main';
import type { StoredWindowStateMap } from '@moritzbrantner/electron-window-state/shared';

import { desktopDocumentSerializer } from '../shared/document-serializer';
import {
  defaultDesktopPreferences,
  isDesktopPreferences,
  type DesktopPreferences,
} from '../shared/preferences';

interface StoredRecentDocumentsState {
  items: Array<{
    filePath: string;
    lastOpenedAt: string;
    name: string;
  }>;
  lastOpenedPath: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object');
}

function isStoredRecentDocumentsState(
  value: unknown,
): value is StoredRecentDocumentsState {
  if (!isRecord(value) || !Array.isArray(value.items)) {
    return false;
  }

  return (
    (value.lastOpenedPath === null ||
      typeof value.lastOpenedPath === 'string') &&
    value.items.every((item) => {
      if (!isRecord(item)) {
        return false;
      }

      return (
        typeof item.filePath === 'string' &&
        typeof item.lastOpenedAt === 'string' &&
        typeof item.name === 'string'
      );
    })
  );
}

function isStoredWindowStateMap(value: unknown): value is StoredWindowStateMap {
  if (!isRecord(value)) {
    return false;
  }

  return Object.values(value).every((windowStateValue) => {
    if (!isRecord(windowStateValue) || !isRecord(windowStateValue.bounds)) {
      return false;
    }

    return (
      typeof windowStateValue.bounds.width === 'number' &&
      typeof windowStateValue.bounds.height === 'number' &&
      typeof windowStateValue.isFullScreen === 'boolean' &&
      typeof windowStateValue.isMaximized === 'boolean'
    );
  });
}

function getStoragePath(fileName: string) {
  return path.join(app.getPath('userData'), 'moritzbrantner', fileName);
}

async function navigateToHash(
  browserWindow: BrowserWindow | null,
  hash: string,
) {
  if (!browserWindow || browserWindow.isDestroyed()) {
    return;
  }

  await browserWindow.webContents.executeJavaScript(
    `window.location.hash = ${JSON.stringify(hash)};`,
    true,
  );
}

function createDocumentDialogAdapter(
  storagePath: string,
): DocumentDialogAdapter {
  const e2eDocumentPath = path.join(storagePath, 'e2e-document.desktop.json');

  if (process.env.PLAYWRIGHT_E2E === '1') {
    return {
      async showOpenDialog() {
        return {
          canceled: false,
          filePaths: [e2eDocumentPath],
        };
      },
      async showSaveDialog(_browserWindow, currentFilePath) {
        return {
          canceled: false,
          filePath: currentFilePath ?? e2eDocumentPath,
        };
      },
      async showUnsavedChangesDialog() {
        return 'save';
      },
    };
  }

  return {
    showOpenDialog(browserWindow) {
      return dialog.showOpenDialog(browserWindow, {
        filters: [
          {
            extensions: ['desktop.json', 'json'],
            name: 'Desktop documents',
          },
        ],
        properties: ['openFile'],
      });
    },
    showSaveDialog(browserWindow, currentFilePath, suggestedFileName) {
      return dialog.showSaveDialog(browserWindow, {
        defaultPath:
          currentFilePath ??
          path.join(app.getPath('documents'), suggestedFileName),
        filters: [
          {
            extensions: ['desktop.json'],
            name: 'Desktop documents',
          },
        ],
      });
    },
    async showUnsavedChangesDialog(browserWindow) {
      const result = await dialog.showMessageBox(browserWindow, {
        buttons: ['Save', 'Discard', 'Cancel'],
        cancelId: 2,
        defaultId: 0,
        message: 'You have unsaved changes.',
        noLink: true,
        detail: 'Save changes before continuing?',
        type: 'warning',
      });

      if (result.response === 0) {
        return 'save';
      }

      if (result.response === 1) {
        return 'discard';
      }

      return 'cancel';
    },
  };
}

export function createDesktopPlatform(
  resolveMainWindow: () => BrowserWindow | null,
) {
  const storageRoot = path.join(app.getPath('userData'), 'moritzbrantner');
  const preferencesStore = createJsonStore<DesktopPreferences>({
    defaultValue: defaultDesktopPreferences,
    filePath: getStoragePath('preferences.json'),
    resetOnError: true,
    validate: isDesktopPreferences,
    version: 1,
  });
  const recentDocumentsStore = createJsonStore<StoredRecentDocumentsState>({
    defaultValue: {
      items: [],
      lastOpenedPath: null,
    },
    filePath: getStoragePath('documents.json'),
    resetOnError: true,
    validate: isStoredRecentDocumentsState,
    version: 1,
  });
  const windowStateStore = createJsonStore<StoredWindowStateMap>({
    defaultValue: {},
    filePath: getStoragePath('window-state.json'),
    resetOnError: true,
    validate: isStoredWindowStateMap,
    version: 1,
  });

  const preferences = createPreferencesService<DesktopPreferences>({
    defaultValue: defaultDesktopPreferences,
    getBroadcastTargets: () =>
      BrowserWindow.getAllWindows().map(
        (browserWindow) => browserWindow.webContents,
      ),
    store: preferencesStore,
    validate: isDesktopPreferences,
  });

  const documents = createDocumentsService({
    defaultContent:
      'Write here. Save with CmdOrCtrl+S and reopen from the recent files list.',
    dialogAdapter: createDocumentDialogAdapter(storageRoot),
    getBroadcastTargets: () =>
      BrowserWindow.getAllWindows().map(
        (browserWindow) => browserWindow.webContents,
      ),
    initialFileName: 'Untitled.desktop.json',
    recentStore: recentDocumentsStore,
    serializer: desktopDocumentSerializer,
  });

  const commandDefinitions: CommandDefinition[] = [
    {
      accelerator: 'CmdOrCtrl+,',
      execute: async ({ window }) => {
        await navigateToHash(window ?? resolveMainWindow(), '#/settings');
      },
      id: 'app.openPreferences',
      label: 'Preferences',
    },
    {
      accelerator: 'CmdOrCtrl+N',
      execute: async ({ window }) => {
        const targetWindow = window ?? resolveMainWindow();
        await documents.newDocument(targetWindow);
        await navigateToHash(targetWindow, '#/documents');
      },
      id: 'document.new',
      label: 'New Document',
    },
    {
      accelerator: 'CmdOrCtrl+O',
      execute: async ({ window }) => {
        const targetWindow = window ?? resolveMainWindow();
        await documents.open(targetWindow);
        await navigateToHash(targetWindow, '#/documents');
      },
      id: 'document.open',
      label: 'Open…',
    },
    {
      accelerator: 'CmdOrCtrl+S',
      execute: async ({ window }) => {
        const targetWindow = window ?? resolveMainWindow();
        await documents.save(targetWindow);
        await navigateToHash(targetWindow, '#/documents');
      },
      id: 'document.save',
      label: 'Save',
    },
    {
      accelerator: 'CmdOrCtrl+Shift+S',
      execute: async ({ window }) => {
        const targetWindow = window ?? resolveMainWindow();
        await documents.saveAs(targetWindow);
        await navigateToHash(targetWindow, '#/documents');
      },
      id: 'document.saveAs',
      label: 'Save As…',
    },
  ];

  const commands = createCommandsService({
    definitions: commandDefinitions,
    getWindowForState: resolveMainWindow,
  });

  const windowState = createWindowStateManager({
    store: windowStateStore,
  });

  preferences.installIpc(ipcMain);
  commands.installIpc(ipcMain);
  documents.installIpc(ipcMain);

  function installMenu() {
    const template = [
      {
        label: 'File',
        submenu: [
          commands.createMenuItem('document.new'),
          commands.createMenuItem('document.open'),
          { type: 'separator' as const },
          commands.createMenuItem('document.save'),
          commands.createMenuItem('document.saveAs'),
          { type: 'separator' as const },
          commands.createMenuItem('app.openPreferences'),
          { role: 'quit' as const },
        ],
      },
      {
        label: 'Edit',
        submenu: [
          { role: 'undo' as const },
          { role: 'redo' as const },
          { type: 'separator' as const },
          { role: 'cut' as const },
          { role: 'copy' as const },
          { role: 'paste' as const },
          { role: 'selectAll' as const },
        ],
      },
      {
        label: 'View',
        submenu: [
          { role: 'reload' as const },
          { role: 'forceReload' as const },
          { role: 'toggleDevTools' as const },
          { type: 'separator' as const },
          { role: 'togglefullscreen' as const },
        ],
      },
      {
        label: 'Window',
        submenu: [{ role: 'minimize' as const }, { role: 'close' as const }],
      },
      {
        label: 'Help',
        submenu: [
          {
            enabled: false,
            label: 'Project link not configured yet',
          },
        ],
      },
    ];

    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
  }

  async function maybeReopenLastDocument(browserWindow: BrowserWindow) {
    const documentPreferences = await preferences.get('documents');

    if (!documentPreferences.reopenLastDocument) {
      return;
    }

    const reopened = await documents.reopenLastDocument(browserWindow);

    if (reopened) {
      await navigateToHash(browserWindow, '#/documents');
    }
  }

  async function shouldOpenDevToolsOnLaunch() {
    if (process.env.PLAYWRIGHT_E2E === '1') {
      return false;
    }

    const developerPreferences = await preferences.get('developer');
    return developerPreferences.openDevToolsOnLaunch;
  }

  return {
    commands,
    documents,
    installMenu,
    maybeReopenLastDocument,
    preferences,
    shouldOpenDevToolsOnLaunch,
    windowState,
  };
}
