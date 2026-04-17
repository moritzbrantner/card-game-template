'use client';

import { useRef, useState, type DragEvent } from 'react';

import {
  formatFileSize,
  getUploadManagementHint,
  inferUploadKind,
  uploadGuides,
  uploadLifecycle,
  uploadTypeGroups,
} from '@/src/domain/uploads/template-playbook';

import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type UploadQueueItem = {
  id: string;
  fileName: string;
  mimeType: string;
  sizeInBytes: number;
  kind: string;
  source: string;
  managementLabel: string;
  managementDetail: string;
};

type UploadPlaygroundProps = {
  copy: {
    heroTitle: string;
    heroDescription: string;
    queueTitle: string;
    queueDescription: string;
    empty: string;
    clearQueue: string;
    chooseFiles: string;
    acceptedTitle: string;
    lifecycleTitle: string;
  };
};

function buildQueueItems(fileList: FileList | File[], source: string): UploadQueueItem[] {
  return Array.from(fileList).map((file) => {
    const kind = inferUploadKind(file.name, file.type);
    const management = getUploadManagementHint(kind, file.size);

    return {
      id: `${file.name}-${file.size}-${crypto.randomUUID()}`,
      fileName: file.name,
      mimeType: file.type || 'unknown',
      sizeInBytes: file.size,
      kind,
      source,
      managementLabel: management.label,
      managementDetail: management.detail,
    };
  });
}

export function UploadPlayground({ copy }: UploadPlaygroundProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [queue, setQueue] = useState<UploadQueueItem[]>([]);

  function appendFiles(fileList: FileList | null, source: string) {
    if (!fileList?.length) {
      return;
    }

    setQueue((currentQueue) => [...buildQueueItems(fileList, source), ...currentQueue]);
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    appendFiles(event.dataTransfer.files, 'drag and drop');
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <label
          className="group flex min-h-80 cursor-pointer flex-col justify-between rounded-3xl border border-dashed border-zinc-300 bg-gradient-to-br from-zinc-50 to-zinc-100 p-6 transition-colors hover:border-zinc-500 dark:border-zinc-700 dark:from-zinc-950 dark:to-zinc-900 dark:hover:border-zinc-400"
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleDrop}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.txt,.md,.csv,.json,.xml,.zip"
            onChange={(event) => appendFiles(event.target.files, 'file input')}
          />

          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500 dark:text-zinc-400">
              Browser intake
            </p>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">{copy.heroTitle}</h2>
              <p className="max-w-xl text-sm leading-6 text-zinc-600 dark:text-zinc-300">{copy.heroDescription}</p>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Drop files here or use the browser picker. The queue below classifies each item and suggests an upload strategy.
            </p>
            <button
              type="button"
              className={buttonVariants({ className: 'w-fit' })}
              onClick={() => inputRef.current?.click()}
            >
              {copy.chooseFiles}
            </button>
          </div>
        </label>

        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle>{copy.queueTitle}</CardTitle>
            <CardDescription>{copy.queueDescription}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <button
              type="button"
              className={buttonVariants({ variant: 'ghost', size: 'sm' })}
              onClick={() => setQueue([])}
              disabled={queue.length === 0}
            >
              {copy.clearQueue}
            </button>

            {queue.length === 0 ? (
              <p className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
                {copy.empty}
              </p>
            ) : (
              <div className="space-y-3">
                {queue.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-medium text-zinc-950 dark:text-zinc-50">{item.fileName}</h3>
                        <p className="text-sm text-zinc-600 dark:text-zinc-300">
                          {item.kind} · {formatFileSize(item.sizeInBytes)} · {item.source}
                        </p>
                      </div>
                      <span className="rounded-full bg-zinc-900 px-3 py-1 text-xs font-medium text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900">
                        {item.managementLabel}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">{item.managementDetail}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                      MIME {item.mimeType}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {uploadGuides.map((guide) => (
          <Card key={guide.platform} className="rounded-3xl">
            <CardHeader>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500 dark:text-zinc-400">
                {guide.platform}
              </p>
              <CardTitle className="text-xl">{guide.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-zinc-600 dark:text-zinc-300">
              <p>{guide.picker}</p>
              <p>{guide.queue}</p>
              <p>{guide.storage}</p>
              <ul className="space-y-2">
                {guide.notes.map((note) => (
                  <li key={note} className="rounded-2xl bg-zinc-50 px-3 py-2 dark:bg-zinc-900">
                    {note}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle>{copy.acceptedTitle}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {uploadTypeGroups.map((group) => (
              <article key={group.title} className="rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-900">
                <h3 className="font-medium text-zinc-950 dark:text-zinc-50">{group.title}</h3>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{group.examples}</p>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">{group.handling}</p>
              </article>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle>{copy.lifecycleTitle}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {uploadLifecycle.map((step, index) => (
              <article key={step.title} className="rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-900">
                <h3 className="font-medium text-zinc-950 dark:text-zinc-50">
                  {index + 1}. {step.title}
                </h3>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">{step.detail}</p>
              </article>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
