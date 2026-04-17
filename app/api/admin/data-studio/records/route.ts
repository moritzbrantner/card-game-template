import dbSchema from '@/db-schema.json';
import { secureRoute } from '@/src/api/route-security';
import { getDb } from '@/src/db/client';
import { writableTableMap } from '@/src/dynamic-db/config';
import { normalizeFieldValue, parseDbSchemaDocument } from '@/src/dynamic-db/schema';

export async function POST(request: Request) {
  const guard = await secureRoute({
    request,
    action: 'admin.dataStudio.createRecord',
    requiredFeatureKey: 'admin.dataStudio',
    requiredPermission: 'admin.dataStudio.write',
  });

  if (!guard.ok) {
    return guard.response;
  }

  const formData = await request.formData();
  const tableName = formData.get('tableName');

  if (typeof tableName !== 'string' || !(tableName in writableTableMap)) {
    return guard.json({ ok: false, message: 'Unknown table name. Update db-schema.json or writable table map.' }, { status: 400 });
  }

  const parsedSchema = parseDbSchemaDocument(dbSchema);
  const schemaTable = parsedSchema.tables.find((table) => table.name === tableName);

  if (!schemaTable) {
    return guard.json({ ok: false, message: `Table ${tableName} is not defined in db-schema.json.` }, { status: 400 });
  }

  const row: Record<string, unknown> = {};

  for (const field of schemaTable.fields) {
    const normalized = normalizeFieldValue(field.type, formData.get(field.name), field.format);

    if (field.required && (normalized === null || normalized === undefined)) {
      return guard.json({ ok: false, message: `Field ${field.label} is required.` }, { status: 400 });
    }

    if (normalized !== null && normalized !== undefined) {
      row[field.name] = normalized;
    }
  }

  if (Object.keys(row).length === 0) {
    return guard.json({ ok: false, message: 'No values were provided.' }, { status: 400 });
  }

  try {
    const db = getDb();
    const targetTable = writableTableMap[tableName as keyof typeof writableTableMap];
    await db.insert(targetTable).values(row as never);

    return guard.json({ ok: true, message: `${tableName} record created successfully.` }, { metadata: { tableName } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error while creating record.';
    return guard.json({ ok: false, message }, { status: 500 });
  }
}
