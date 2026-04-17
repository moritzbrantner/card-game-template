export type ClientProblemDetail = {
  title?: string;
  detail?: string;
  fieldErrors: Record<string, string[]>;
  fallbackText: string;
  formMessage?: string;
  message: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function normalizeFieldErrors(value: unknown) {
  if (!isRecord(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value)
      .map(([field, messages]) => {
        if (!Array.isArray(messages)) {
          return null;
        }

        const normalizedMessages = messages.filter((message): message is string => typeof message === 'string' && message.trim().length > 0);

        return normalizedMessages.length > 0 ? [field, normalizedMessages] : null;
      })
      .filter((entry): entry is [string, string[]] => entry !== null),
  );
}

function firstFieldError(fieldErrors: Record<string, string[]>) {
  for (const messages of Object.values(fieldErrors)) {
    const firstMessage = messages[0];

    if (firstMessage) {
      return firstMessage;
    }
  }

  return undefined;
}

async function readErrorBody(response: Response) {
  const rawBody = await response.text().catch(() => '');
  const trimmedBody = rawBody.trim();

  if (!trimmedBody) {
    return null;
  }

  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.includes('json') || trimmedBody.startsWith('{') || trimmedBody.startsWith('[')) {
    try {
      return JSON.parse(trimmedBody) as unknown;
    } catch {
      return trimmedBody;
    }
  }

  return trimmedBody;
}

export async function readProblemDetail(response: Response, fallbackText: string): Promise<ClientProblemDetail> {
  const body = await readErrorBody(response);
  const record = isRecord(body) ? body : null;
  const detail = typeof body === 'string' ? readString(body) : readString(record?.detail);
  const title = readString(record?.title);
  const legacyMessage = readString(record?.error) ?? readString(record?.message);
  const fieldErrors = normalizeFieldErrors(record?.fieldErrors);
  const formMessage = detail ?? legacyMessage ?? title;

  return {
    title,
    detail,
    fieldErrors,
    fallbackText,
    formMessage,
    message: formMessage ?? firstFieldError(fieldErrors) ?? fallbackText,
  };
}
