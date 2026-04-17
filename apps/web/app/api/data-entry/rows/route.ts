import { secureRoute } from '@/src/api/route-security';
import { getDb } from '@/src/db/client';
import { profiles, securityAuditLogs, securityRateLimitCounters, users } from '@/src/db/schema';
import { canWriteTable } from '@/src/domain/data-entry/table-permissions';
import { isManagedTable } from '@/src/domain/data-entry/use-cases';
import { isFeatureEnabled } from '@/src/foundation/features/runtime';
import { getFallbackProfileTag } from '@/src/profile/tags';

export async function POST(request: Request) {
  if (!isFeatureEnabled('workspace.dataEntry')) {
    return new Response('Not found', { status: 404 });
  }

  const guard = await secureRoute({
    request,
    action: 'workspace.dataEntry.createRow',
    requireAuth: true,
  });

  if (!guard.ok) {
    return guard.response;
  }

  const userId = guard.session!.user.id;
  const role = guard.session!.user.role;
  const formData = await request.formData();
  const rawTable = formData.get('table');

  if (typeof rawTable !== 'string' || !isManagedTable(rawTable)) {
    return guard.json({ error: 'A target table is required.' }, { status: 400 });
  }

  const table = rawTable;

  if (!canWriteTable(role, table)) {
    return guard.json({ error: `Your role does not have write access to ${table}.` }, { status: 403 });
  }

  const db = getDb();

  try {
    if (table === 'Profile') {
      const bio = toNullableString(formData.get('bio'));
      const locale = toNullableString(formData.get('locale'));
      const timezone = toNullableString(formData.get('timezone'));

      await db.insert(profiles).values({
        id: crypto.randomUUID(),
        userId,
        bio,
        locale,
        timezone,
      });

      return guard.json({ success: 'Profile row created.' }, { metadata: { table } });
    }

    if (table === 'User') {
      const email = toNullableString(formData.get('email'));
      const name = toNullableString(formData.get('name'));
      const newRole = formData.get('role');
      const normalizedRole = newRole === 'ADMIN' ? 'ADMIN' : 'USER';

      if (!email) {
        return guard.json({ error: 'Email is required for User rows.' }, { status: 400 });
      }

      const newUserId = crypto.randomUUID();

      await db.insert(users).values({
        id: newUserId,
        email,
        tag: getFallbackProfileTag(newUserId),
        name,
        role: normalizedRole,
      });

      return guard.json({ success: 'User row created.' }, { metadata: { table } });
    }

    if (table === 'SecurityAuditLog') {
      const action = toNullableString(formData.get('action'));
      const outcome = toNullableString(formData.get('outcome'));
      const statusCode = Number(formData.get('statusCode'));
      const metadata = toNullableString(formData.get('metadata'));

      if (!action || !outcome || Number.isNaN(statusCode)) {
        return guard.json({ error: 'Action, outcome, and a numeric status code are required.' }, { status: 400 });
      }

      const parsedMetadata = parseMetadata(metadata);
      if (!parsedMetadata.ok) {
        return guard.json({ error: parsedMetadata.error }, { status: 400 });
      }

      await db.insert(securityAuditLogs).values({
        id: crypto.randomUUID(),
        actorId: userId,
        action,
        outcome,
        statusCode,
        metadata: parsedMetadata.value,
      });

      return guard.json({ success: 'SecurityAuditLog row created.' }, { metadata: { table } });
    }

    if (table === 'SecurityRateLimitCounter') {
      const key = toNullableString(formData.get('key'));
      const count = Number(formData.get('count'));
      const resetAtRaw = toNullableString(formData.get('resetAt'));

      if (!key || Number.isNaN(count) || !resetAtRaw) {
        return guard.json({ error: 'Key, count, and resetAt are required.' }, { status: 400 });
      }

      const resetAt = new Date(resetAtRaw);
      if (Number.isNaN(resetAt.getTime())) {
        return guard.json({ error: 'resetAt must be a valid date.' }, { status: 400 });
      }

      await db.insert(securityRateLimitCounters).values({
        key,
        count,
        resetAt,
      });

      return guard.json({ success: 'SecurityRateLimitCounter row created.' }, { metadata: { table } });
    }

    return guard.json({ error: 'Unsupported table.' }, { status: 400 });
  } catch {
    return guard.json({ error: 'Unable to insert row. Check values and constraints.' }, { status: 500 });
  }
}

function toNullableString(value: FormDataEntryValue | null): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseMetadata(rawMetadata: string | null):
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; error: string } {
  if (!rawMetadata) {
    return { ok: true, value: {} };
  }

  try {
    const parsed = JSON.parse(rawMetadata) as unknown;

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ok: false, error: 'Metadata must be a JSON object.' };
    }

    return { ok: true, value: parsed as Record<string, unknown> };
  } catch {
    return { ok: false, error: 'Metadata must be valid JSON.' };
  }
}
