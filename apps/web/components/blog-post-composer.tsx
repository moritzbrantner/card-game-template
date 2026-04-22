'use client';

import { useEffect, useEffectEvent, useRef, useState } from 'react';

import { useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  createLocalBlogDraft,
  deleteLocalBlogDraft,
  listLocalBlogDraftsForUser,
  saveLocalBlogDraft,
} from '@/src/local-first/blog/drafts';
import { flushBlogPublishOutbox, queueBlogDraftForPublish } from '@/src/local-first/blog/outbox';
import type { BlogDraftStatus, LocalBlogDraft } from '@/src/local-first/blog/types';
import { useLiveQueryValue } from '@/src/local-first/blog/use-live-query';

type BlogPostComposerProps = {
  userId: string;
  locale: string;
  labels: {
    title: string;
    titlePlaceholder: string;
    content: string;
    contentPlaceholder: string;
    draftsTitle: string;
    draftsEmpty: string;
    untitledDraft: string;
    emptyEditor: string;
    publishedReadonly: string;
    newDraft: string;
    deleteDraft: string;
    publish: string;
    savedLocally: string;
    queuedToPublish: string;
    publishing: string;
    publishFailed: string;
    published: string;
    genericError: string;
  };
};

function resolveDraftStatusLabel(status: BlogDraftStatus, labels: BlogPostComposerProps['labels']) {
  switch (status) {
    case 'queued_publish':
      return labels.queuedToPublish;
    case 'publishing':
      return labels.publishing;
    case 'publish_failed':
      return labels.publishFailed;
    case 'published':
      return labels.published;
    case 'draft':
    default:
      return labels.savedLocally;
  }
}

function getDraftDisplayTitle(draft: LocalBlogDraft, fallbackTitle: string) {
  const trimmedTitle = draft.title.trim();
  return trimmedTitle.length > 0 ? trimmedTitle : fallbackTitle;
}

function formatDraftDate(locale: string, date: Date) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function BlogPostComposer({ userId, locale, labels }: BlogPostComposerProps) {
  const router = useRouter();
  const drafts = useLiveQueryValue(() => listLocalBlogDraftsForUser(userId), [userId], [] as LocalBlogDraft[]);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const [editorTitle, setEditorTitle] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [draftActionPending, setDraftActionPending] = useState(false);
  const [publishPending, setPublishPending] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const draftCreationRef = useRef<Promise<LocalBlogDraft> | null>(null);
  const outboxRunningRef = useRef(false);

  const activeDraft = drafts.find((draft) => draft.id === activeDraftId) ?? null;

  useEffect(() => {
    if (activeDraftId && drafts.some((draft) => draft.id === activeDraftId)) {
      return;
    }

    setActiveDraftId(drafts[0]?.id ?? null);
  }, [activeDraftId, drafts]);

  useEffect(() => {
    if (!activeDraft) {
      if (drafts.length === 0) {
        setEditorTitle('');
        setEditorContent('');
      }

      return;
    }

    setEditorTitle(activeDraft.title);
    setEditorContent(activeDraft.contentMarkdown);
  }, [activeDraft, drafts.length]);

  const runOutbox = useEffectEvent(async (currentUserId: string) => {
    if (outboxRunningRef.current) {
      return {
        processedCount: 0,
        publishedDraftIds: [],
      };
    }

    outboxRunningRef.current = true;

    try {
      const result = await flushBlogPublishOutbox({ userId: currentUserId });

      if (result.publishedDraftIds.length > 0) {
        router.refresh();
      }

      return result;
    } finally {
      outboxRunningRef.current = false;
    }
  });

  useEffect(() => {
    void runOutbox(userId);
  }, [userId]);

  useEffect(() => {
    function handleOnline() {
      void runOutbox(userId);
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        void runOutbox(userId);
      }
    }

    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [userId]);

  async function ensureDraft(nextTitle: string, nextContent: string) {
    if (activeDraftId) {
      return activeDraftId;
    }

    if (!nextTitle.trim() && !nextContent.trim()) {
      return null;
    }

    if (draftCreationRef.current) {
      const existingDraft = await draftCreationRef.current;
      return existingDraft.id;
    }

    const pendingDraft = createLocalBlogDraft({
      userId,
      locale,
      title: nextTitle,
      contentMarkdown: nextContent,
    }).then((draft) => {
      setActiveDraftId(draft.id);
      return draft;
    });

    draftCreationRef.current = pendingDraft;

    try {
      const draft = await pendingDraft;
      return draft.id;
    } finally {
      draftCreationRef.current = null;
    }
  }

  async function persistEditorNow(nextTitle: string, nextContent: string) {
    const draftId = await ensureDraft(nextTitle, nextContent);

    if (!draftId) {
      return null;
    }

    await saveLocalBlogDraft(draftId, {
      title: nextTitle,
      contentMarkdown: nextContent,
    });

    return draftId;
  }

  function handleTitleChange(nextTitle: string) {
    setLocalError(null);
    setEditorTitle(nextTitle);

    if (!activeDraftId) {
      void ensureDraft(nextTitle, editorContent);
      return;
    }

    if (activeDraft?.status === 'published' || activeDraft?.status === 'publishing') {
      return;
    }

    void saveLocalBlogDraft(activeDraftId, {
      title: nextTitle,
      contentMarkdown: editorContent,
    });
  }

  function handleContentChange(nextContent: string) {
    setLocalError(null);
    setEditorContent(nextContent);

    if (!activeDraftId) {
      void ensureDraft(editorTitle, nextContent);
      return;
    }

    if (activeDraft?.status === 'published' || activeDraft?.status === 'publishing') {
      return;
    }

    void saveLocalBlogDraft(activeDraftId, {
      title: editorTitle,
      contentMarkdown: nextContent,
    });
  }

  async function handleCreateDraft() {
    setLocalError(null);
    setDraftActionPending(true);

    try {
      const draft = await createLocalBlogDraft({
        userId,
        locale,
      });

      setActiveDraftId(draft.id);
      setEditorTitle('');
      setEditorContent('');
    } catch {
      setLocalError(labels.genericError);
    } finally {
      setDraftActionPending(false);
    }
  }

  async function handleDeleteDraft() {
    setLocalError(null);

    if (!activeDraftId) {
      setEditorTitle('');
      setEditorContent('');
      return;
    }

    setDraftActionPending(true);

    try {
      await deleteLocalBlogDraft(activeDraftId);
      setActiveDraftId(null);
      setEditorTitle('');
      setEditorContent('');
    } catch {
      setLocalError(labels.genericError);
    } finally {
      setDraftActionPending(false);
    }
  }

  async function handlePublish() {
    setLocalError(null);

    if (activeDraft?.status === 'published') {
      setLocalError(labels.publishedReadonly);
      return;
    }

    setPublishPending(true);

    try {
      const draftId = await persistEditorNow(editorTitle, editorContent);

      if (!draftId) {
        return;
      }

      await queueBlogDraftForPublish({
        userId,
        draftId,
      });

      await runOutbox(userId);
    } catch {
      setLocalError(labels.genericError);
    } finally {
      setPublishPending(false);
    }
  }

  const statusText = activeDraft ? resolveDraftStatusLabel(activeDraft.status, labels) : null;
  const detailText = activeDraft?.lastError ?? localError ?? (activeDraft?.status === 'published' ? labels.publishedReadonly : null);
  const inputsDisabled = activeDraft?.status === 'published' || activeDraft?.status === 'publishing';
  const hasEditorContent = editorTitle.trim().length > 0 || editorContent.trim().length > 0;

  return (
    <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
      <aside className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold tracking-tight">{labels.draftsTitle}</h3>
          <Button type="button" size="sm" variant="outline" onClick={() => void handleCreateDraft()} disabled={draftActionPending}>
            {labels.newDraft}
          </Button>
        </div>

        <div className="space-y-2">
          {drafts.length ? (
            drafts.map((draft) => {
              const isActive = draft.id === activeDraftId;

              return (
                <button
                  key={draft.id}
                  type="button"
                  onClick={() => {
                    setLocalError(null);
                    setActiveDraftId(draft.id);
                  }}
                  className={[
                    'w-full rounded-2xl border p-3 text-left transition-colors',
                    isActive
                      ? 'border-zinc-900 bg-zinc-100 dark:border-zinc-100 dark:bg-zinc-900'
                      : 'border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900',
                  ].join(' ')}
                >
                  <div className="space-y-1">
                    <p className="truncate text-sm font-medium">{getDraftDisplayTitle(draft, labels.untitledDraft)}</p>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">{resolveDraftStatusLabel(draft.status, labels)}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-500">{formatDraftDate(locale, draft.updatedAt)}</p>
                  </div>
                </button>
              );
            })
          ) : (
            <p className="rounded-2xl border border-dashed border-zinc-300 p-4 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
              {labels.draftsEmpty}
            </p>
          )}
        </div>
      </aside>

      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="blog-post-title">{labels.title}</Label>
            <Input
              id="blog-post-title"
              name="title"
              minLength={4}
              maxLength={120}
              placeholder={labels.titlePlaceholder}
              value={editorTitle}
              onChange={(event) => handleTitleChange(event.target.value)}
              disabled={inputsDisabled}
            />
          </div>

          <div className="flex items-end justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => void handleDeleteDraft()} disabled={draftActionPending || publishPending}>
              {labels.deleteDraft}
            </Button>
            <Button type="button" onClick={() => void handlePublish()} disabled={publishPending || draftActionPending || !hasEditorContent}>
              {publishPending || activeDraft?.status === 'publishing' ? labels.publishing : labels.publish}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="blog-post-content">{labels.content}</Label>
          <Textarea
            id="blog-post-content"
            name="content"
            minLength={20}
            maxLength={10000}
            placeholder={labels.contentPlaceholder}
            className="min-h-72"
            value={editorContent}
            onChange={(event) => handleContentChange(event.target.value)}
            disabled={inputsDisabled}
          />
        </div>

        <div className="space-y-1">
          <p role="status" className="text-sm text-zinc-700 dark:text-zinc-300">
            {statusText ?? labels.emptyEditor}
          </p>
          {detailText ? <p className="text-sm text-zinc-600 dark:text-zinc-400">{detailText}</p> : null}
        </div>
      </div>
    </div>
  );
}
