import type { IpcRenderer } from 'electron';

import type { DocumentsBridge } from './shared.ts';
import { documentsChannels } from './shared.ts';

export function createDocumentsBridge(ipcRenderer: IpcRenderer): DocumentsBridge {
  return {
    async getState() {
      return ipcRenderer.invoke(documentsChannels.getState);
    },
    async listRecent() {
      return ipcRenderer.invoke(documentsChannels.listRecent);
    },
    async newDocument() {
      await ipcRenderer.invoke(documentsChannels.newDocument);
    },
    async open() {
      await ipcRenderer.invoke(documentsChannels.open);
    },
    async openRecent(filePath: string) {
      await ipcRenderer.invoke(documentsChannels.openRecent, filePath);
    },
    async save() {
      await ipcRenderer.invoke(documentsChannels.save);
    },
    async saveAs() {
      await ipcRenderer.invoke(documentsChannels.saveAs);
    },
    subscribe(listener) {
      const wrappedListener = (_event: unknown, state: Parameters<typeof listener>[0]) => {
        listener(state);
      };

      ipcRenderer.on(documentsChannels.stateDidChange, wrappedListener);

      return () => {
        ipcRenderer.removeListener(documentsChannels.stateDidChange, wrappedListener);
      };
    },
    async updateDraft(content: string) {
      await ipcRenderer.invoke(documentsChannels.updateDraft, content);
    },
  };
}
