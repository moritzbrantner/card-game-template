export const commandsChannels = {
  list: 'moritzbrantner:commands:list',
  run: 'moritzbrantner:commands:run',
} as const;

export interface CommandState {
  accelerator?: string;
  enabled: boolean;
  id: string;
}

export interface CommandsBridge {
  list(): Promise<CommandState[]>;
  run(commandId: string): Promise<void>;
}
