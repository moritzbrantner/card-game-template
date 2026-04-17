export const documentsChannels = {
  getState: 'moritzbrantner:documents:get-state',
  listRecent: 'moritzbrantner:documents:list-recent',
  newDocument: 'moritzbrantner:documents:new',
  open: 'moritzbrantner:documents:open',
  openRecent: 'moritzbrantner:documents:open-recent',
  save: 'moritzbrantner:documents:save',
  saveAs: 'moritzbrantner:documents:save-as',
  stateDidChange: 'moritzbrantner:documents:state-did-change',
  updateDraft: 'moritzbrantner:documents:update-draft',
} as const;

export interface RecentDocument {
  filePath: string;
  lastOpenedAt: string;
  name: string;
}

export interface DocumentState {
  content: string;
  displayName: string;
  filePath: string | null;
  isDirty: boolean;
  lastSavedAt: string | null;
  recentDocuments: RecentDocument[];
  statusMessage: string;
}

export interface DocumentsBridge {
  getState(): Promise<DocumentState>;
  listRecent(): Promise<RecentDocument[]>;
  newDocument(): Promise<void>;
  open(): Promise<void>;
  openRecent(filePath: string): Promise<void>;
  save(): Promise<void>;
  saveAs(): Promise<void>;
  subscribe(listener: (state: DocumentState) => void): () => void;
  updateDraft(content: string): Promise<void>;
}
