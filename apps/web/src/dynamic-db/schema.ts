export type DbSchemaFieldType = 'text' | 'textarea' | 'number' | 'boolean' | 'date';

export type DbSchemaField = {
  name: string;
  label: string;
  type: DbSchemaFieldType;
  required?: boolean;
  placeholder?: string;
  format?: 'json';
};

export type DbSchemaTable = {
  name: string;
  label: string;
  description?: string;
  fields: DbSchemaField[];
};

export type DbSchemaDocument = {
  tables: DbSchemaTable[];
};

function isFieldType(value: string): value is DbSchemaFieldType {
  return ['text', 'textarea', 'number', 'boolean', 'date'].includes(value);
}

export function parseDbSchemaDocument(value: unknown): DbSchemaDocument {
  if (!value || typeof value !== 'object' || !('tables' in value)) {
    throw new Error('Invalid db-schema.json: expected an object with a tables array.');
  }

  const rawTables = (value as { tables: unknown }).tables;
  if (!Array.isArray(rawTables)) {
    throw new Error('Invalid db-schema.json: tables must be an array.');
  }

  const tables = rawTables.map((table, tableIndex): DbSchemaTable => {
    if (!table || typeof table !== 'object') {
      throw new Error(`Invalid db-schema.json: table at index ${tableIndex} must be an object.`);
    }

    const rawTable = table as Record<string, unknown>;
    if (typeof rawTable.name !== 'string' || typeof rawTable.label !== 'string' || !Array.isArray(rawTable.fields)) {
      throw new Error(`Invalid db-schema.json: table at index ${tableIndex} is missing required fields.`);
    }

    const fields = rawTable.fields.map((field, fieldIndex): DbSchemaField => {
      if (!field || typeof field !== 'object') {
        throw new Error(`Invalid db-schema.json: field at table ${rawTable.name}, index ${fieldIndex} must be an object.`);
      }

      const rawField = field as Record<string, unknown>;
      if (typeof rawField.name !== 'string' || typeof rawField.label !== 'string' || typeof rawField.type !== 'string') {
        throw new Error(`Invalid db-schema.json: field at table ${rawTable.name}, index ${fieldIndex} is missing required properties.`);
      }

      if (!isFieldType(rawField.type)) {
        throw new Error(`Invalid db-schema.json: unsupported field type "${rawField.type}" in table ${rawTable.name}.`);
      }

      return {
        name: rawField.name,
        label: rawField.label,
        type: rawField.type,
        required: typeof rawField.required === 'boolean' ? rawField.required : false,
        placeholder: typeof rawField.placeholder === 'string' ? rawField.placeholder : undefined,
        format: rawField.format === 'json' ? 'json' : undefined,
      };
    });

    return {
      name: rawTable.name,
      label: rawTable.label,
      description: typeof rawTable.description === 'string' ? rawTable.description : undefined,
      fields,
    };
  });

  return { tables };
}

export function normalizeFieldValue(
  type: DbSchemaFieldType,
  value: FormDataEntryValue | null,
  format?: DbSchemaField['format'],
): unknown {
  if (value === null) {
    return null;
  }

  const normalized = typeof value === 'string' ? value.trim() : value;

  if (typeof normalized === 'string' && normalized.length === 0) {
    return null;
  }

  if (type === 'number' && typeof normalized === 'string') {
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  if (type === 'boolean') {
    if (typeof normalized === 'string') {
      return normalized === 'on' || normalized === 'true';
    }

    return Boolean(normalized);
  }

  if (type === 'date' && typeof normalized === 'string') {
    return new Date(normalized);
  }

  if (format === 'json' && typeof normalized === 'string') {
    return JSON.parse(normalized);
  }

  return normalized;
}
