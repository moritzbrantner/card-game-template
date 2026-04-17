const MAX_UPLOAD_BYTES = 1024 * 1024;
const MAX_IMAGE_DIMENSION_PX = 512;
const MIN_IMAGE_DIMENSION_PX = 64;
const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg"] as const;

export class ImageValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageValidationError";
  }
}

function parsePngDimensions(bytes: Uint8Array) {
  if (bytes.length < 24) {
    throw new ImageValidationError("Image is not a valid PNG file.");
  }

  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  const hasPngSignature = signature.every((expectedByte, index) => bytes[index] === expectedByte);

  if (!hasPngSignature) {
    throw new ImageValidationError("Image is not a valid PNG file.");
  }

  const width = (bytes[16] << 24) | (bytes[17] << 16) | (bytes[18] << 8) | bytes[19];
  const height = (bytes[20] << 24) | (bytes[21] << 16) | (bytes[22] << 8) | bytes[23];

  return { width, height };
}

function parseJpegDimensions(bytes: Uint8Array) {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    throw new ImageValidationError("Image is not a valid JPEG file.");
  }

  let offset = 2;
  while (offset + 1 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    while (bytes[offset] === 0xff) {
      offset += 1;
    }

    const marker = bytes[offset];
    offset += 1;

    if (marker === 0xd9 || marker === 0xda) {
      break;
    }

    if (offset + 1 >= bytes.length) {
      break;
    }

    const segmentLength = (bytes[offset] << 8) | bytes[offset + 1];
    if (segmentLength < 2) {
      throw new ImageValidationError("Image is not a valid JPEG file.");
    }

    const isSofMarker = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;

    if (isSofMarker) {
      if (offset + 6 >= bytes.length) {
        throw new ImageValidationError("Image is not a valid JPEG file.");
      }

      const height = (bytes[offset + 3] << 8) | bytes[offset + 4];
      const width = (bytes[offset + 5] << 8) | bytes[offset + 6];
      return { width, height };
    }

    offset += segmentLength;
  }

  throw new ImageValidationError("Could not read JPEG dimensions.");
}

function getDimensions(bytes: Uint8Array, mimeType: string) {
  if (mimeType === "image/png") {
    return parsePngDimensions(bytes);
  }

  if (mimeType === "image/jpeg") {
    return parseJpegDimensions(bytes);
  }

  throw new ImageValidationError("Only PNG and JPEG images are supported.");
}

function validateUploadMetadata(file: File) {
  if (!file.size) {
    throw new ImageValidationError("Please select an image file.");
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    throw new ImageValidationError("Image must be 1MB or smaller.");
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number])) {
    throw new ImageValidationError("Only PNG and JPEG images are supported.");
  }
}

export type ValidatedImageUpload = {
  bytes: Uint8Array;
  mimeType: string;
  width: number;
  height: number;
  size: number;
};

export async function validateImageUpload(file: File): Promise<ValidatedImageUpload> {
  validateUploadMetadata(file);

  const bytes = new Uint8Array(await file.arrayBuffer());
  const { width, height } = getDimensions(bytes, file.type);

  if (
    width < MIN_IMAGE_DIMENSION_PX ||
    height < MIN_IMAGE_DIMENSION_PX ||
    width > MAX_IMAGE_DIMENSION_PX ||
    height > MAX_IMAGE_DIMENSION_PX
  ) {
    throw new ImageValidationError(
      `Image dimensions must be between ${MIN_IMAGE_DIMENSION_PX}x${MIN_IMAGE_DIMENSION_PX} and ${MAX_IMAGE_DIMENSION_PX}x${MAX_IMAGE_DIMENSION_PX}.`,
    );
  }

  return {
    bytes,
    mimeType: file.type,
    width,
    height,
    size: file.size,
  };
}

export const imageConstraints = {
  maxUploadBytes: MAX_UPLOAD_BYTES,
  minDimensionPx: MIN_IMAGE_DIMENSION_PX,
  maxDimensionPx: MAX_IMAGE_DIMENSION_PX,
  allowedMimeTypes: ALLOWED_MIME_TYPES,
};
