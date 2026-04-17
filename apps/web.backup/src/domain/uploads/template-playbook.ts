export type UploadGuide = {
  platform: 'web' | 'mobile' | 'desktop';
  title: string;
  picker: string;
  queue: string;
  storage: string;
  notes: string[];
};

export type UploadLifecycleStep = {
  title: string;
  detail: string;
};

export type UploadTypeGroup = {
  title: string;
  examples: string;
  handling: string;
};

export type UploadKind = 'image' | 'document' | 'audio' | 'video' | 'data' | 'archive' | 'other';

const extensionGroups: Record<UploadKind, string[]> = {
  image: ['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif'],
  document: ['pdf', 'doc', 'docx', 'txt', 'md'],
  audio: ['mp3', 'wav', 'm4a', 'ogg'],
  video: ['mp4', 'mov', 'webm', 'avi'],
  data: ['csv', 'json', 'xml'],
  archive: ['zip', 'tar', 'gz'],
  other: [],
};

export const uploadGuides: UploadGuide[] = [
  {
    platform: 'web',
    title: 'Browser-first intake',
    picker: 'Use the native file picker or drag and drop for quick, low-friction intake.',
    queue: 'Normalize files immediately so validation, previews, and progress tracking share one queue shape.',
    storage: 'Presign uploads when files are large and keep browser requests short-lived.',
    notes: [
      'Debounce expensive validation if users can drop many files at once.',
      'Guard against unsafe MIME values by checking both extension and browser-reported type.',
    ],
  },
  {
    platform: 'mobile',
    title: 'Camera roll and capture flows',
    picker: 'Support camera capture, document scanning, and photo-library selection.',
    queue: 'Expect intermittent connectivity and persist draft uploads locally when possible.',
    storage: 'Resume large uploads and compress media when quality requirements allow it.',
    notes: [
      'Permission prompts and background upload limits shape the UX more than on web.',
      'Chunk uploads when network quality is unpredictable.',
    ],
  },
  {
    platform: 'desktop',
    title: 'Heavy-duty file handling',
    picker: 'Desktop apps often need directory selection, multi-window drag sources, and large file batches.',
    queue: 'Show richer metadata early because users are more likely to upload complex payloads.',
    storage: 'Checksum before transfer and support resumable jobs for very large files.',
    notes: [
      'Background workers help when indexing or transforming files before upload.',
      'Users expect stronger retry controls and clearer queue ownership.',
    ],
  },
];

export const uploadLifecycle: UploadLifecycleStep[] = [
  {
    title: 'Ingest',
    detail: 'Accept files from the picker or drag target and capture stable metadata immediately.',
  },
  {
    title: 'Classify',
    detail: 'Derive a coarse file kind so validation, previews, and storage policies stay predictable.',
  },
  {
    title: 'Validate',
    detail: 'Enforce size, type, and business rules before uploading to avoid wasted bandwidth.',
  },
  {
    title: 'Transfer',
    detail: 'Upload through a short-lived server action or a presigned direct-to-storage flow.',
  },
  {
    title: 'Finalize',
    detail: 'Persist the storage reference and surface retry or cleanup paths for failed items.',
  },
];

export const uploadTypeGroups: UploadTypeGroup[] = [
  {
    title: 'Images',
    examples: 'PNG, JPEG, WebP, SVG',
    handling: 'Preview inline, extract dimensions early, and run stricter validation for avatars or generated assets.',
  },
  {
    title: 'Documents',
    examples: 'PDF, DOCX, TXT, Markdown',
    handling: 'Keep original names, index text when needed, and separate preview generation from upload success.',
  },
  {
    title: 'Media',
    examples: 'MP3, WAV, MP4, MOV',
    handling: 'Favor resumable uploads and background processing because files can become large quickly.',
  },
  {
    title: 'Data files',
    examples: 'CSV, JSON, XML',
    handling: 'Validate structure before import so parsing errors fail fast and clearly.',
  },
];

export function inferUploadKind(fileName: string, mimeType: string): UploadKind {
  if (mimeType.startsWith('image/')) {
    return 'image';
  }
  if (mimeType.startsWith('audio/')) {
    return 'audio';
  }
  if (mimeType.startsWith('video/')) {
    return 'video';
  }
  if (
    mimeType.includes('json') ||
    mimeType.includes('csv') ||
    mimeType.includes('xml') ||
    mimeType.startsWith('text/')
  ) {
    return 'data';
  }
  if (mimeType.includes('pdf') || mimeType.includes('word') || mimeType.includes('document')) {
    return 'document';
  }
  if (mimeType.includes('zip') || mimeType.includes('compressed') || mimeType.includes('tar')) {
    return 'archive';
  }

  const extension = fileName.split('.').pop()?.toLowerCase() ?? '';

  for (const [kind, extensions] of Object.entries(extensionGroups) as Array<[UploadKind, string[]]>) {
    if (extensions.includes(extension)) {
      return kind;
    }
  }

  return 'other';
}

export function getUploadManagementHint(kind: UploadKind, sizeInBytes: number) {
  const sizeInMegabytes = sizeInBytes / (1024 * 1024);

  if (kind === 'video' || sizeInMegabytes >= 25) {
    return {
      label: 'Direct-to-storage',
      detail: 'Large files should skip your application server and upload through a presigned or resumable flow.',
    };
  }

  if (kind === 'image') {
    return {
      label: 'Preview early',
      detail: 'Images benefit from immediate previews plus dimension checks before the transfer starts.',
    };
  }

  if (kind === 'data') {
    return {
      label: 'Validate structure',
      detail: 'Data imports should parse headers or schema hints before they enter the persistent queue.',
    };
  }

  return {
    label: 'Queue and validate',
    detail: 'This file can usually move through the standard queue with basic type and size checks.',
  };
}

export function formatFileSize(sizeInBytes: number) {
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
