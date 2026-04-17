import type { DocumentSerializer } from '@moritzbrantner/electron-documents/main';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object');
}

export const desktopDocumentSerializer: DocumentSerializer = {
  deserialize(raw: string, filePath: string) {
    const parsed = JSON.parse(raw) as unknown;

    if (!isRecord(parsed) || typeof parsed.content !== 'string') {
      throw new Error(`Invalid document payload in ${filePath}`);
    }

    return {
      content: parsed.content,
    };
  },
  extension: 'desktop.json',
  name: 'Desktop scratch document',
  serialize(value) {
    return `${JSON.stringify({ content: value.content, version: 1 }, null, 2)}\n`;
  },
};
