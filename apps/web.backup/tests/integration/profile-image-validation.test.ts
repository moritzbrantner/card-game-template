import { describe, expect, it } from 'vitest';

import { validateImageUpload } from '@/src/profile/image-validation';

function makePng(width: number, height: number) {
  const bytes = new Uint8Array(24);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  bytes.set([0x00, 0x00, 0x00, 0x0d], 8);
  bytes.set([0x49, 0x48, 0x44, 0x52], 12);
  bytes[16] = (width >> 24) & 0xff;
  bytes[17] = (width >> 16) & 0xff;
  bytes[18] = (width >> 8) & 0xff;
  bytes[19] = width & 0xff;
  bytes[20] = (height >> 24) & 0xff;
  bytes[21] = (height >> 16) & 0xff;
  bytes[22] = (height >> 8) & 0xff;
  bytes[23] = height & 0xff;
  return bytes;
}

function makeJpeg(width: number, height: number) {
  return new Uint8Array([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01,
    0x00, 0x00, 0xff, 0xc0, 0x00, 0x11, 0x08, (height >> 8) & 0xff, height & 0xff, (width >> 8) & 0xff, width & 0xff,
    0x03, 0x01, 0x11, 0x00, 0x02, 0x11, 0x00, 0x03, 0x11, 0x00, 0xff, 0xd9,
  ]);
}

describe('validateImageUpload', () => {
  it('accepts a png with valid dimensions and size', async () => {
    const file = new File([makePng(256, 256)], 'avatar.png', { type: 'image/png' });

    const result = await validateImageUpload(file);

    expect(result.width).toBe(256);
    expect(result.height).toBe(256);
    expect(result.bytes.length).toBeGreaterThan(0);
  });

  it('accepts a jpeg with valid dimensions and size', async () => {
    const file = new File([makeJpeg(200, 300)], 'avatar.jpg', { type: 'image/jpeg' });

    const result = await validateImageUpload(file);

    expect(result.width).toBe(200);
    expect(result.height).toBe(300);
    expect(result.bytes.length).toBeGreaterThan(0);
  });

  it('rejects dimensions outside allowed range', async () => {
    const file = new File([makePng(1024, 1024)], 'big.png', { type: 'image/png' });

    await expect(validateImageUpload(file)).rejects.toThrow('Image dimensions must be between 64x64 and 512x512.');
  });

  it('rejects unsupported mime type', async () => {
    const file = new File([new Uint8Array([0x47, 0x49, 0x46])], 'avatar.gif', { type: 'image/gif' });

    await expect(validateImageUpload(file)).rejects.toThrow('Only PNG and JPEG images are supported.');
  });
});
