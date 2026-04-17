'use client';

import NextImage from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

import { Button } from '@/components/ui/button';
import { imageConstraints } from '@/src/profile/image-validation';

const CROP_FRAME_SIZE_PX = 240;
const OUTPUT_SIZE_PX = imageConstraints.maxDimensionPx;

type ProfileImageCropperProps = {
  file: File;
  labels: {
    title: string;
    description: string;
    zoom: string;
    cancel: string;
    apply: string;
  };
  onCancel: () => void;
  onApply: (file: File, previewUrl: string) => void;
};

type CropGeometry = {
  width: number;
  height: number;
  minScale: number;
};

type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  startOffsetX: number;
  startOffsetY: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function clampOffset(offset: number, renderedSize: number) {
  const maxOffset = Math.max(0, (renderedSize - CROP_FRAME_SIZE_PX) / 2);
  return clamp(offset, -maxOffset, maxOffset);
}

function fileNameForCrop(name: string, mimeType: string) {
  const baseName = name.replace(/\.[^.]+$/, '') || 'profile-picture';
  const extension = mimeType === 'image/png' ? 'png' : 'jpg';
  return `${baseName}-cropped.${extension}`;
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Could not export cropped image.'));
        return;
      }

      resolve(blob);
    }, type, quality);
  });
}

function drawCroppedImage(
  image: HTMLImageElement,
  geometry: CropGeometry,
  zoom: number,
  offsetX: number,
  offsetY: number,
) {
  const scale = geometry.minScale * zoom;
  const renderedWidth = geometry.width * scale;
  const renderedHeight = geometry.height * scale;
  const imageLeft = CROP_FRAME_SIZE_PX / 2 - renderedWidth / 2 + offsetX;
  const imageTop = CROP_FRAME_SIZE_PX / 2 - renderedHeight / 2 + offsetY;
  const sourceX = clamp((-imageLeft / renderedWidth) * geometry.width, 0, geometry.width);
  const sourceY = clamp((-imageTop / renderedHeight) * geometry.height, 0, geometry.height);
  const sourceWidth = clamp((CROP_FRAME_SIZE_PX / renderedWidth) * geometry.width, 1, geometry.width - sourceX);
  const sourceHeight = clamp((CROP_FRAME_SIZE_PX / renderedHeight) * geometry.height, 1, geometry.height - sourceY);
  const canvas = document.createElement('canvas');

  canvas.width = OUTPUT_SIZE_PX;
  canvas.height = OUTPUT_SIZE_PX;

  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Could not access canvas context.');
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, OUTPUT_SIZE_PX, OUTPUT_SIZE_PX);

  return canvas;
}

export function ProfileImageCropper({ file, labels, onCancel, onApply }: ProfileImageCropperProps) {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [geometry, setGeometry] = useState<CropGeometry | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const image = new window.Image();

    image.onload = () => {
      imageRef.current = image;
      setGeometry({
        width: image.naturalWidth,
        height: image.naturalHeight,
        minScale: Math.max(CROP_FRAME_SIZE_PX / image.naturalWidth, CROP_FRAME_SIZE_PX / image.naturalHeight),
      });
      setZoom(1);
      setOffsetX(0);
      setOffsetY(0);
      setError(null);
    };
    image.onerror = () => {
      setError('The selected file could not be loaded.');
      imageRef.current = null;
      setGeometry(null);
    };
    image.src = url;
    setPreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  const renderedDimensions = useMemo(() => {
    if (!geometry) {
      return null;
    }

    const scale = geometry.minScale * zoom;
    return {
      width: geometry.width * scale,
      height: geometry.height * scale,
    };
  }, [geometry, zoom]);

  useEffect(() => {
    if (!renderedDimensions) {
      return;
    }

    setOffsetX((current) => clampOffset(current, renderedDimensions.width));
    setOffsetY((current) => clampOffset(current, renderedDimensions.height));
  }, [renderedDimensions]);

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (!renderedDimensions) {
      return;
    }

    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startOffsetX: offsetX,
      startOffsetY: offsetY,
    };
    viewportRef.current?.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragRef.current || dragRef.current.pointerId !== event.pointerId || !renderedDimensions) {
      return;
    }

    const nextOffsetX = dragRef.current.startOffsetX + (event.clientX - dragRef.current.startX);
    const nextOffsetY = dragRef.current.startOffsetY + (event.clientY - dragRef.current.startY);

    setOffsetX(clampOffset(nextOffsetX, renderedDimensions.width));
    setOffsetY(clampOffset(nextOffsetY, renderedDimensions.height));
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) {
      return;
    }

    dragRef.current = null;
    viewportRef.current?.releasePointerCapture(event.pointerId);
  }

  async function handleApplyCrop() {
    if (!geometry || !imageRef.current) {
      return;
    }

    setExporting(true);
    setError(null);

    try {
      const croppedCanvas = drawCroppedImage(imageRef.current, geometry, zoom, offsetX, offsetY);
      let mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      let blob = await canvasToBlob(croppedCanvas, mimeType, 0.92);

      if (blob.size > imageConstraints.maxUploadBytes && mimeType === 'image/png') {
        const jpegCanvas = document.createElement('canvas');
        jpegCanvas.width = OUTPUT_SIZE_PX;
        jpegCanvas.height = OUTPUT_SIZE_PX;

        const context = jpegCanvas.getContext('2d');

        if (!context) {
          throw new Error('Could not access canvas context.');
        }

        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, OUTPUT_SIZE_PX, OUTPUT_SIZE_PX);
        context.drawImage(croppedCanvas, 0, 0);
        mimeType = 'image/jpeg';
        blob = await canvasToBlob(jpegCanvas, mimeType, 0.92);
      }

      if (blob.size > imageConstraints.maxUploadBytes) {
        throw new Error('Cropped image is still too large. Try zooming out a little more.');
      }

      const croppedFile = new File([blob], fileNameForCrop(file.name, mimeType), { type: mimeType });
      onApply(croppedFile, URL.createObjectURL(blob));
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Could not crop the selected image.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-4 rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-950/60">
      <div className="space-y-1">
        <p className="text-sm font-medium">{labels.title}</p>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">{labels.description}</p>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div
          ref={viewportRef}
          className="relative h-[240px] w-[240px] touch-none overflow-hidden rounded-[2rem] bg-zinc-900 shadow-inner"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {previewUrl && renderedDimensions ? (
            <div
              className="absolute"
              style={{
                width: renderedDimensions.width,
                height: renderedDimensions.height,
                left: `calc(50% - ${renderedDimensions.width / 2}px + ${offsetX}px)`,
                top: `calc(50% - ${renderedDimensions.height / 2}px + ${offsetY}px)`,
              }}
            >
              <div className="relative h-full w-full">
                <NextImage
                  src={previewUrl}
                  alt=""
                  fill
                  unoptimized
                  draggable={false}
                  sizes={`${Math.ceil(renderedDimensions.width)}px`}
                  className="pointer-events-none select-none object-fill"
                />
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-zinc-400">Loading…</div>
          )}
          <div className="pointer-events-none absolute inset-0 rounded-[2rem] border border-white/10" />
          <div className="pointer-events-none absolute inset-4 rounded-full border-2 border-white shadow-[0_0_0_999px_rgba(24,24,27,0.45)]" />
        </div>

        <div className="flex-1 space-y-4">
          <label className="block space-y-2 text-sm">
            <span className="font-medium">{labels.zoom}</span>
            <input
              type="range"
              min="1"
              max="3"
              step="0.01"
              value={zoom}
              onChange={(event) => setZoom(Number(event.currentTarget.value))}
              className="w-full"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="ghost" onClick={onCancel} disabled={exporting}>
              {labels.cancel}
            </Button>
            <Button type="button" onClick={() => void handleApplyCrop()} disabled={!geometry || exporting}>
              {labels.apply}
            </Button>
          </div>

          {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
        </div>
      </div>
    </div>
  );
}
