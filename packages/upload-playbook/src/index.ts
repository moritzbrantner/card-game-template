export type UploadPlatform = 'web' | 'desktop' | 'mobile';
export type UploadKind =
  | 'image'
  | 'document'
  | 'audio'
  | 'video'
  | 'archive'
  | 'data'
  | 'other';

export type UploadGuide = {
  platform: UploadPlatform;
  title: string;
  picker: string;
  queue: string;
  storage: string;
  notes: string[];
};

export type UploadTypeGroup = {
  title: string;
  examples: string;
  handling: string;
};

export type UploadLifecycleStep = {
  title: string;
  detail: string;
};

export type UploadManagementHint = {
  label: string;
  detail: string;
};

const platformGuides: Record<UploadPlatform, UploadGuide> = {
  web: {
    platform: 'web',
    title: 'Browser intake',
    picker:
      'Use a file input for deterministic selection, then layer drag-and-drop or paste events on top for convenience.',
    queue:
      'Keep a normalized queue in component state so previews, validation errors, and retry states all read from one place.',
    storage:
      'Store only lightweight metadata in memory first, then move resumable jobs into IndexedDB or a backend session if they must survive reloads.',
    notes: [
      'Images can preview immediately with object URLs while the original file uploads in the background.',
      'Large video or archive files should switch to chunked transport before they leave the browser.',
    ],
  },
  desktop: {
    platform: 'desktop',
    title: 'Electron intake',
    picker:
      'Electron can reuse the browser file input, but production apps often bridge to dialog.showOpenDialog for tighter OS integration.',
    queue:
      'Normalize renderer events into a queue that can hand off hashing, scanning, or filesystem work to the main process when needed.',
    storage:
      'Desktop apps can persist draft uploads on disk, which makes retry and resume behavior easier than in a transient browser tab.',
    notes: [
      'OS drag-and-drop usually arrives with richer filesystem metadata than the browser version.',
      'The renderer should own presentation, while the main process owns privileged filesystem access.',
    ],
  },
  mobile: {
    platform: 'mobile',
    title: 'Native intake',
    picker:
      'Mobile flows usually start from the document picker, camera roll, camera capture, or share sheet rather than a browser file input.',
    queue:
      'Convert native picker results into the same normalized queue shape used elsewhere so uploads, retries, and badges stay consistent.',
    storage:
      'Background transfer is app-specific, so the queue should be serializable and safe to restore after the app is suspended or reopened.',
    notes: [
      'Offline-first behavior matters more on mobile because the app may be paused at any time.',
      'Thumbnails, progress, and retry affordances need to work with partial connectivity and app restarts.',
    ],
  },
};

export const uploadTypeGroups: UploadTypeGroup[] = [
  {
    title: 'Images',
    examples: 'png, jpg, heic, svg',
    handling: 'Preview locally, preserve EXIF only when needed, and upload the original asset separately from generated thumbnails.',
  },
  {
    title: 'Documents',
    examples: 'pdf, docx, txt, md',
    handling: 'Validate size and mime type early, then queue OCR or text indexing after the binary lands.',
  },
  {
    title: 'Media',
    examples: 'mp3, wav, mp4, mov',
    handling: 'Stream or chunk large binaries and surface background processing states such as transcoding.',
  },
  {
    title: 'Structured data',
    examples: 'csv, json, zip',
    handling: 'Parse enough metadata before upload to reject malformed imports and route archives through extra inspection.',
  },
];

export const uploadLifecycle: UploadLifecycleStep[] = [
  {
    title: 'Collect',
    detail:
      'Capture the raw selection event from the platform picker, drag target, share sheet, or camera hand-off.',
  },
  {
    title: 'Normalize',
    detail:
      'Reduce every result into one queue shape with a stable id, name, size, kind, source, and current status.',
  },
  {
    title: 'Validate',
    detail:
      'Check accepted types, infer a handling strategy, and flag anything that needs chunking, scanning, or schema validation.',
  },
  {
    title: 'Persist',
    detail:
      'Store enough queue state to retry uploads, restore interrupted work, and show accurate progress after navigation changes.',
  },
  {
    title: 'Transfer',
    detail:
      'Hand the normalized item to the upload transport layer and update the queue with progress, success, or retry metadata.',
  },
];

export const mobileUploadPresets = [
  {
    id: 'camera-roll',
    label: 'Add photo library sample',
    fileName: 'launch-photo.heic',
    mimeType: 'image/heic',
    sizeInBytes: 4_800_512,
    source: 'photo library',
  },
  {
    id: 'document-picker',
    label: 'Add document sample',
    fileName: 'spec-sheet.pdf',
    mimeType: 'application/pdf',
    sizeInBytes: 1_420_120,
    source: 'document picker',
  },
  {
    id: 'share-sheet',
    label: 'Add share sheet sample',
    fileName: 'voice-note.m4a',
    mimeType: 'audio/mp4',
    sizeInBytes: 9_210_144,
    source: 'share sheet',
  },
] as const;

export function getUploadGuide(platform: UploadPlatform): UploadGuide {
  return platformGuides[platform];
}

export function getAllUploadGuides(): UploadGuide[] {
  return Object.values(platformGuides);
}

export function inferUploadKind(fileName: string, mimeType = ''): UploadKind {
  const normalizedName = fileName.toLowerCase();
  const normalizedType = mimeType.toLowerCase();

  if (normalizedType.startsWith('image/') || /\.(png|jpe?g|gif|webp|heic|svg)$/.test(normalizedName)) {
    return 'image';
  }

  if (normalizedType.startsWith('audio/') || /\.(mp3|wav|m4a|aac|ogg)$/.test(normalizedName)) {
    return 'audio';
  }

  if (normalizedType.startsWith('video/') || /\.(mp4|mov|webm|mkv)$/.test(normalizedName)) {
    return 'video';
  }

  if (
    normalizedType.includes('pdf') ||
    normalizedType.includes('word') ||
    normalizedType.startsWith('text/') ||
    /\.(pdf|docx?|txt|md|rtf)$/.test(normalizedName)
  ) {
    return 'document';
  }

  if (
    normalizedType.includes('json') ||
    normalizedType.includes('csv') ||
    /\.(json|csv|tsv)$/.test(normalizedName)
  ) {
    return 'data';
  }

  if (
    normalizedType.includes('zip') ||
    normalizedType.includes('tar') ||
    /\.(zip|tar|gz|rar)$/.test(normalizedName)
  ) {
    return 'archive';
  }

  return 'other';
}

export function getUploadManagementHint(
  kind: UploadKind,
  sizeInBytes: number,
): UploadManagementHint {
  if (kind === 'video' || kind === 'archive' || sizeInBytes >= 20 * 1024 * 1024) {
    return {
      label: 'Chunk before transfer',
      detail: 'Large binaries should stream in parts so retries can resume instead of restarting from zero.',
    };
  }

  if (kind === 'image') {
    return {
      label: 'Preview immediately',
      detail: 'Generate a lightweight local preview first and keep the original binary for the final upload.',
    };
  }

  if (kind === 'document') {
    return {
      label: 'Scan and index',
      detail: 'Documents usually need text extraction, virus scanning, or search indexing after the upload completes.',
    };
  }

  if (kind === 'data') {
    return {
      label: 'Validate schema',
      detail: 'Structured imports should be parsed early so broken rows fail before they hit downstream systems.',
    };
  }

  return {
    label: 'Queue for review',
    detail: 'Keep the file in a normalized queue until the app decides how to validate and store it.',
  };
}

export function formatFileSize(sizeInBytes: number): string {
  if (sizeInBytes < 1024) {
    return `${sizeInBytes} B`;
  }

  if (sizeInBytes < 1024 * 1024) {
    return `${(sizeInBytes / 1024).toFixed(1)} KB`;
  }

  if (sizeInBytes < 1024 * 1024 * 1024) {
    return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${(sizeInBytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
