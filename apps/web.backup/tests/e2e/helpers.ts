import { deflateSync } from 'node:zlib';

import { expect, type Page } from '@playwright/test';

import { TEST_USERS } from '@/src/testing/test-users';

const DEFAULT_MAILPIT_BASE_URL = 'http://127.0.0.1:8025';
const DEFAULT_E2E_BASE_URL = 'http://127.0.0.1:3006';
const DEFAULT_INTERNAL_CRON_SECRET = 'e2e-internal-cron-secret';

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const CRC32_TABLE = new Uint32Array(256);

for (let index = 0; index < CRC32_TABLE.length; index += 1) {
  let value = index;

  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }

  CRC32_TABLE[index] = value >>> 0;
}

export async function waitForAppHydration(page: Page) {
  await page.waitForFunction(() => document.documentElement.dataset.appHydrated === 'true');
}

export async function waitForServiceWorkerReady(page: Page) {
  await page.waitForFunction(() => document.documentElement.dataset.serviceWorker === 'ready');
}

export async function dismissConsentBanner(page: Page) {
  const necessaryOnlyButton = page.getByRole('button', { name: 'Necessary only' });

  for (let attempt = 0; attempt < 6; attempt += 1) {
    if (!(await necessaryOnlyButton.isVisible({ timeout: 500 }).catch(() => false))) {
      await page.waitForTimeout(250);
      continue;
    }

    await necessaryOnlyButton.click();
    await expect(necessaryOnlyButton).toBeHidden();
    return;
  }
}

export async function acceptAllConsent(page: Page) {
  const acceptAllButton = page.getByRole('button', { name: 'Accept all' });

  for (let attempt = 0; attempt < 6; attempt += 1) {
    if (!(await acceptAllButton.isVisible({ timeout: 500 }).catch(() => false))) {
      await page.waitForTimeout(250);
      continue;
    }

    await acceptAllButton.click();
    await expect(acceptAllButton).toBeHidden();
    return;
  }
}

export async function gotoAndWaitForHydration(
  page: Page,
  path: string,
  options?: { consent?: 'necessary-only' | 'accept-all' | 'leave' },
) {
  await page.goto(path);
  await waitForAppHydration(page);

  if (options?.consent === 'leave') {
    return;
  }

  if (options?.consent === 'accept-all') {
    await acceptAllConsent(page);
    return;
  }

  await dismissConsentBanner(page);
}

export async function expectStatusMessage(page: Page, text: string) {
  await expect(page.getByRole('status')).toContainText(text);
}

export function getSeededUser(email: string) {
  const user = TEST_USERS.find((testUser) => testUser.email === email);

  if (!user) {
    throw new Error(`Expected seeded test user for ${email}`);
  }

  return user;
}

export async function loginWithCredentials(page: Page, email: string, password: string) {
  await gotoAndWaitForHydration(page, '/en/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page).toHaveURL('/en/profile');
  await waitForAppHydration(page);
}

export async function logoutFromProfileMenu(page: Page) {
  await page.getByRole('button', { name: 'Open user menu' }).click();
  await page.getByRole('button', { name: 'Log out' }).click();
  await expect(page).toHaveURL('/en');
  await waitForAppHydration(page);
}

function toPngChunk(type: string, data: Uint8Array) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const lengthBuffer = Buffer.alloc(4);
  lengthBuffer.writeUInt32BE(data.byteLength, 0);

  const crcInput = Buffer.concat([typeBuffer, Buffer.from(data)]);
  let crc = 0xffffffff;

  for (const byte of crcInput) {
    crc = CRC32_TABLE[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
  }

  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE((crc ^ 0xffffffff) >>> 0, 0);

  return Buffer.concat([lengthBuffer, typeBuffer, Buffer.from(data), crcBuffer]);
}

export function createSolidPngBuffer(input: {
  width: number;
  height: number;
  rgba?: readonly [number, number, number, number];
}) {
  const { width, height } = input;
  const [red, green, blue, alpha] = input.rgba ?? [41, 121, 255, 255];
  const rawRows = Buffer.alloc(height * (1 + width * 4));

  for (let y = 0; y < height; y += 1) {
    const rowOffset = y * (1 + width * 4);
    rawRows[rowOffset] = 0;

    for (let x = 0; x < width; x += 1) {
      const pixelOffset = rowOffset + 1 + x * 4;
      rawRows[pixelOffset] = red;
      rawRows[pixelOffset + 1] = green;
      rawRows[pixelOffset + 2] = blue;
      rawRows[pixelOffset + 3] = alpha;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    PNG_SIGNATURE,
    toPngChunk('IHDR', ihdr),
    toPngChunk('IDAT', deflateSync(rawRows)),
    toPngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function getMailpitBaseURL() {
  return process.env.MAILPIT_BASE_URL ?? DEFAULT_MAILPIT_BASE_URL;
}

function getE2EBaseURL() {
  return process.env.E2E_BASE_URL ?? DEFAULT_E2E_BASE_URL;
}

function getInternalCronSecret() {
  return DEFAULT_INTERNAL_CRON_SECRET;
}

function getMessageList(payload: unknown) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;

    if (Array.isArray(record.messages)) {
      return record.messages;
    }

    if (Array.isArray(record.Messages)) {
      return record.Messages;
    }
  }

  return [];
}

function getMessageId(message: unknown) {
  if (!message || typeof message !== 'object') {
    return '';
  }

  const record = message as Record<string, unknown>;
  return typeof record.ID === 'string' ? record.ID : typeof record.id === 'string' ? record.id : '';
}

function messageMatches(message: unknown, input: { to: string; subject: string }) {
  if (!message || typeof message !== 'object') {
    return false;
  }

  const record = message as Record<string, unknown>;
  const subject = typeof record.Subject === 'string' ? record.Subject : typeof record.subject === 'string' ? record.subject : '';
  const recipients = Array.isArray(record.To) ? record.To : Array.isArray(record.to) ? record.to : [];

  const hasRecipient = recipients.some((recipient) => {
    if (!recipient || typeof recipient !== 'object') {
      return false;
    }

    const recipientRecord = recipient as Record<string, unknown>;
    return recipientRecord.Address === input.to || recipientRecord.address === input.to;
  });

  return hasRecipient && subject === input.subject;
}

async function getMailpitMessageRaw(messageId: string) {
  const response = await fetch(`${getMailpitBaseURL()}/api/v1/message/${messageId}/raw`);

  if (!response.ok) {
    throw new Error(`Unable to fetch Mailpit message ${messageId}.`);
  }

  return response.text();
}

export async function runQueuedJobs() {
  const response = await fetch(`${getE2EBaseURL()}/api/internal/jobs/run`, {
    method: 'POST',
    headers: {
      'x-internal-cron-secret': getInternalCronSecret(),
    },
  });

  if (!response.ok) {
    throw new Error('Unable to run queued jobs.');
  }
}

export async function clearMailpitMessages() {
  const response = await fetch(`${getMailpitBaseURL()}/api/v1/messages`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    throw new Error('Unable to clear Mailpit messages.');
  }
}

export async function waitForMailpitMessage(input: { to: string; subject: string; timeoutMs?: number }) {
  const timeoutMs = input.timeoutMs ?? 15_000;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    await runQueuedJobs();

    const response = await fetch(`${getMailpitBaseURL()}/api/v1/messages?limit=25`);

    if (!response.ok) {
      throw new Error('Unable to list Mailpit messages.');
    }

    const payload = (await response.json()) as unknown;
    const messages = getMessageList(payload);

    for (const message of messages) {
      const messageId = getMessageId(message);

      if (!messageId) {
        continue;
      }

      if (messageMatches(message, input)) {
        const raw = await getMailpitMessageRaw(messageId);
        return { id: messageId, raw };
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Timed out waiting for Mailpit message "${input.subject}" to ${input.to}.`);
}

export function extractFirstUrl(text: string) {
  const match = text.match(/https?:\/\/[^\s<>"')]+/);

  if (!match) {
    throw new Error('Expected at least one URL in message content.');
  }

  return match[0];
}
