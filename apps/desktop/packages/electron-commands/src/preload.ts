import type { IpcRenderer } from 'electron';

import type { CommandsBridge } from './shared.ts';
import { commandsChannels } from './shared.ts';

export function createCommandsBridge(ipcRenderer: IpcRenderer): CommandsBridge {
  return {
    async list() {
      return ipcRenderer.invoke(commandsChannels.list);
    },
    async run(commandId: string) {
      await ipcRenderer.invoke(commandsChannels.run, commandId);
    },
  };
}
