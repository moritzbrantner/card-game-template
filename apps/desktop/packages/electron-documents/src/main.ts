import { promises as fs } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

import type { BrowserWindow, IpcMain, WebContents } from 'electron';

import type { JsonStore } from '@moritzbrantner/electron-json-store/main';

import { documentsChannels, type DocumentState, type RecentDocument } from './shared.ts';

const require = createRequire(import.meta.url);

function cloneValue<TValue>(value: TValue): TValue {
  return structuredClone(value);
}

interface StoredRecentDocumentsState {
  items: RecentDocument[];
  lastOpenedPath: string | null;
}

interface LoadedDocument {
  content: string;
}

export interface DocumentSerializer {
  deserialize(raw: string, filePath: string): LoadedDocument;
  extension: string;
  name: string;
  serialize(value: LoadedDocument): string;
}

export interface DocumentDialogAdapter {
  showOpenDialog(browserWindow: BrowserWindow): Promise<{
    canceled: boolean;
    filePaths: string[];
  }>;
  showSaveDialog(
    browserWindow: BrowserWindow,
    currentFilePath: string | null,
    suggestedFileName: string,
  ): Promise<{
    canceled: boolean;
    filePath?: string;
  }>;
  showUnsavedChangesDialog(browserWindow: BrowserWindow): Promise<'cancel' | 'discard' | 'save'>;
}

export interface DocumentsServiceOptions {
  defaultContent?: string;
  dialogAdapter: DocumentDialogAdapter;
  getBroadcastTargets: () => WebContents[];
  initialFileName?: string;
  recentStore: JsonStore<StoredRecentDocumentsState>;
  serializer: DocumentSerializer;
}

interface InternalDocumentState {
  content: string;
  filePath: string | null;
  lastSavedAt: string | null;
  lastSavedContent: string;
  statusMessage: string;
}

function deriveDisplayName(filePathValue: string | null) {
  if (!filePathValue) {
    return 'Untitled';
  }

  return path.basename(filePathValue);
}

export function createDocumentsService(options: DocumentsServiceOptions) {
  const defaultContent = options.defaultContent ?? '';
  const initialFileName = options.initialFileName ?? `Untitled.${options.serializer.extension}`;

  let state: InternalDocumentState = {
    content: defaultContent,
    filePath: null,
    lastSavedAt: null,
    lastSavedContent: defaultContent,
    statusMessage: 'Ready',
  };

  async function buildPublicState(): Promise<DocumentState> {
    const recentDocuments = (await options.recentStore.load()).items;

    return {
      content: state.content,
      displayName: deriveDisplayName(state.filePath),
      filePath: state.filePath,
      isDirty: state.content !== state.lastSavedContent,
      lastSavedAt: state.lastSavedAt,
      recentDocuments: cloneValue(recentDocuments),
      statusMessage: state.statusMessage,
    };
  }

  async function broadcast() {
    const publicState = await buildPublicState();

    options.getBroadcastTargets().forEach((target) => {
      if (!target.isDestroyed()) {
        target.send(documentsChannels.stateDidChange, cloneValue(publicState));
      }
    });
  }

  async function rememberRecent(filePathValue: string) {
    const timestamp = new Date().toISOString();

    await options.recentStore.update((current) => {
      const nextItem: RecentDocument = {
        filePath: filePathValue,
        lastOpenedAt: timestamp,
        name: path.basename(filePathValue),
      };
      const remainingItems = current.items.filter((item) => item.filePath !== filePathValue);

      return {
        items: [nextItem].concat(remainingItems).slice(0, 8),
        lastOpenedPath: filePathValue,
      };
    });
  }

  async function persistToPath(filePathValue: string) {
    const serialized = options.serializer.serialize({ content: state.content });

    await fs.mkdir(path.dirname(filePathValue), { recursive: true });
    await fs.writeFile(filePathValue, serialized, 'utf8');

    state = {
      content: state.content,
      filePath: filePathValue,
      lastSavedAt: new Date().toISOString(),
      lastSavedContent: state.content,
      statusMessage: `Saved ${path.basename(filePathValue)}`,
    };

    await rememberRecent(filePathValue);
    await broadcast();
  }

  async function maybeConfirmLosingChanges(browserWindow: BrowserWindow | null) {
    if (!browserWindow || state.content === state.lastSavedContent) {
      return true;
    }

    const decision = await options.dialogAdapter.showUnsavedChangesDialog(browserWindow);

    if (decision === 'cancel') {
      state = {
        ...state,
        statusMessage: 'Canceled',
      };
      await broadcast();
      return false;
    }

    if (decision === 'save') {
      await save(browserWindow);
      return state.content === state.lastSavedContent;
    }

    return true;
  }

  async function loadFile(filePathValue: string) {
    const raw = await fs.readFile(filePathValue, 'utf8');
    const loaded = options.serializer.deserialize(raw, filePathValue);

    state = {
      content: loaded.content,
      filePath: filePathValue,
      lastSavedAt: new Date().toISOString(),
      lastSavedContent: loaded.content,
      statusMessage: `Opened ${path.basename(filePathValue)}`,
    };

    await rememberRecent(filePathValue);
    await broadcast();
  }

  async function getState() {
    return buildPublicState();
  }

  async function listRecent() {
    return (await buildPublicState()).recentDocuments;
  }

  async function newDocument(browserWindow: BrowserWindow | null) {
    const canContinue = await maybeConfirmLosingChanges(browserWindow);

    if (!canContinue) {
      return;
    }

    state = {
      content: defaultContent,
      filePath: null,
      lastSavedAt: null,
      lastSavedContent: defaultContent,
      statusMessage: 'Started a new document',
    };
    await broadcast();
  }

  async function open(browserWindow: BrowserWindow | null) {
    if (!browserWindow) {
      return;
    }

    const canContinue = await maybeConfirmLosingChanges(browserWindow);

    if (!canContinue) {
      return;
    }

    const result = await options.dialogAdapter.showOpenDialog(browserWindow);

    if (result.canceled || result.filePaths.length === 0) {
      state = {
        ...state,
        statusMessage: 'Open canceled',
      };
      await broadcast();
      return;
    }

    await loadFile(result.filePaths[0]);
  }

  async function openRecent(filePathValue: string, browserWindow: BrowserWindow | null) {
    const canContinue = await maybeConfirmLosingChanges(browserWindow);

    if (!canContinue) {
      return;
    }

    await loadFile(filePathValue);
  }

  async function save(browserWindow: BrowserWindow | null) {
    if (state.filePath) {
      await persistToPath(state.filePath);
      return;
    }

    await saveAs(browserWindow);
  }

  async function saveAs(browserWindow: BrowserWindow | null) {
    if (!browserWindow) {
      return;
    }

    const result = await options.dialogAdapter.showSaveDialog(
      browserWindow,
      state.filePath,
      initialFileName,
    );

    if (result.canceled || !result.filePath) {
      state = {
        ...state,
        statusMessage: 'Save canceled',
      };
      await broadcast();
      return;
    }

    await persistToPath(result.filePath);
  }

  async function updateDraft(content: string) {
    state = {
      ...state,
      content,
      statusMessage:
        content === state.lastSavedContent ? 'All changes saved' : 'Unsaved changes',
    };
    await broadcast();
  }

  async function confirmBeforeClose(browserWindow: BrowserWindow) {
    return maybeConfirmLosingChanges(browserWindow);
  }

  async function reopenLastDocument(browserWindow: BrowserWindow | null) {
    const recentState = await options.recentStore.load();

    if (!recentState.lastOpenedPath) {
      return false;
    }

    try {
      await openRecent(recentState.lastOpenedPath, browserWindow);
      return true;
    } catch (_error) {
      return false;
    }
  }

  function installIpc(ipcMain: IpcMain) {
    const { BrowserWindow: ElectronBrowserWindow } = require('electron') as typeof import('electron');

    ipcMain.handle(documentsChannels.getState, async () => getState());
    ipcMain.handle(documentsChannels.listRecent, async () => listRecent());
    ipcMain.handle(documentsChannels.newDocument, async (event) => {
      await newDocument(ElectronBrowserWindow.fromWebContents(event.sender));
    });
    ipcMain.handle(documentsChannels.open, async (event) => {
      await open(ElectronBrowserWindow.fromWebContents(event.sender));
    });
    ipcMain.handle(documentsChannels.openRecent, async (event, filePathValue: string) => {
      await openRecent(filePathValue, ElectronBrowserWindow.fromWebContents(event.sender));
    });
    ipcMain.handle(documentsChannels.save, async (event) => {
      await save(ElectronBrowserWindow.fromWebContents(event.sender));
    });
    ipcMain.handle(documentsChannels.saveAs, async (event) => {
      await saveAs(ElectronBrowserWindow.fromWebContents(event.sender));
    });
    ipcMain.handle(documentsChannels.updateDraft, async (_event, content: string) => {
      await updateDraft(content);
    });

    return () => {
      ipcMain.removeHandler(documentsChannels.getState);
      ipcMain.removeHandler(documentsChannels.listRecent);
      ipcMain.removeHandler(documentsChannels.newDocument);
      ipcMain.removeHandler(documentsChannels.open);
      ipcMain.removeHandler(documentsChannels.openRecent);
      ipcMain.removeHandler(documentsChannels.save);
      ipcMain.removeHandler(documentsChannels.saveAs);
      ipcMain.removeHandler(documentsChannels.updateDraft);
    };
  }

  return {
    confirmBeforeClose,
    getState,
    installIpc,
    listRecent,
    newDocument,
    open,
    openRecent,
    reopenLastDocument,
    save,
    saveAs,
    updateDraft,
  };
}
