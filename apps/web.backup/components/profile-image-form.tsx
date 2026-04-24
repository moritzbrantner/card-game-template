'use client';

import Image from 'next/image';
import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';

import { ProfileImageCropper } from '@/components/profile-image-cropper';
import { Button } from '@/components/ui/button';
import { useRouter } from '@/i18n/navigation';
import { readProblemDetail } from '@/src/http/problem-client';
import { imageConstraints } from '@/src/profile/image-validation';

type ProfileImageFormProps = {
  currentImage: string | null;
  labels: {
    upload: string;
    uploading: string;
    remove: string;
    chooseImage: string;
    hint: string;
    success: string;
    empty: string;
    alt: string;
    cropTitle: string;
    cropDescription: string;
    cropZoom: string;
    cropCancel: string;
    cropApply: string;
    ready: string;
  };
};

export function ProfileImageForm({
  currentImage,
  labels,
}: ProfileImageFormProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [draftFile, setDraftFile] = useState<File | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [state, setState] = useState<{ error?: string; success?: boolean }>({});

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedFile) {
      setState({ error: 'Please choose and crop an image before uploading.' });
      return;
    }

    setPending(true);
    setState({});
    const formData = new FormData();
    formData.set('image', selectedFile);

    const response = await fetch('/api/profile/image', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const problem = await readProblemDetail(
        response,
        'Unable to update profile picture right now. Please try again.',
      );
      setState({ error: problem.message });
      setPending(false);
      return;
    }

    setState({ success: true });
    setDraftFile(null);
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setPending(false);
    router.refresh();
  }

  async function handleRemove() {
    setPending(true);
    setState({});

    const response = await fetch('/api/profile/image/remove', {
      method: 'POST',
    });

    if (!response.ok) {
      const problem = await readProblemDetail(
        response,
        'Unable to update profile picture right now. Please try again.',
      );
      setState({ error: problem.message });
      setPending(false);
      return;
    }

    setPending(false);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setDraftFile(null);
    setSelectedFile(null);
    router.refresh();
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0] ?? null;

    if (!file) {
      return;
    }

    setState({});
    setDraftFile(file);
  }

  function handleCropApply(file: File, nextPreviewUrl: string) {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(file);
    setPreviewUrl(nextPreviewUrl);
    setDraftFile(null);
    setState({});
  }

  const imageToRender = previewUrl ?? currentImage;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative h-24 w-24 overflow-hidden rounded-full border border-zinc-300 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900">
          {imageToRender ? (
            <Image
              src={imageToRender}
              alt={labels.alt}
              fill
              sizes="96px"
              unoptimized
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-zinc-500">
              {labels.empty}
            </div>
          )}
        </div>

        {currentImage ? (
          <Button
            type="button"
            variant="ghost"
            onClick={() => void handleRemove()}
            disabled={pending}
          >
            {labels.remove}
          </Button>
        ) : null}
      </div>

      <form onSubmit={handleUpload} className="space-y-3">
        <div className="space-y-2">
          <label htmlFor="image" className="text-sm font-medium">
            {labels.chooseImage}
          </label>
          <input
            id="image"
            name="image"
            type="file"
            accept="image/png,image/jpeg"
            className="block w-full rounded-md border border-zinc-300 p-2 text-sm dark:border-zinc-700"
            onChange={handleFileChange}
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {labels.hint}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {`Max ${(imageConstraints.maxUploadBytes / (1024 * 1024)).toFixed(0)}MB · ${imageConstraints.minDimensionPx}-${imageConstraints.maxDimensionPx}px`}
          </p>
          {selectedFile ? (
            <p className="text-xs text-emerald-600 dark:text-emerald-400">
              {labels.ready}
            </p>
          ) : null}
        </div>

        {draftFile ? (
          <ProfileImageCropper
            file={draftFile}
            labels={{
              title: labels.cropTitle,
              description: labels.cropDescription,
              zoom: labels.cropZoom,
              cancel: labels.cropCancel,
              apply: labels.cropApply,
            }}
            onCancel={() => setDraftFile(null)}
            onApply={handleCropApply}
          />
        ) : null}

        <Button type="submit" disabled={pending || !selectedFile}>
          {pending ? labels.uploading : labels.upload}
        </Button>

        {state.error ? (
          <p className="text-sm text-red-600 dark:text-red-400">
            {state.error}
          </p>
        ) : null}
        {state.success ? (
          <p className="text-sm text-emerald-600 dark:text-emerald-400">
            {labels.success}
          </p>
        ) : null}
      </form>
    </div>
  );
}
