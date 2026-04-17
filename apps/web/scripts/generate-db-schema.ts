import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { getTableColumns } from 'drizzle-orm';

import type { DbSchemaDocument, DbSchemaFieldType } from '@/src/dynamic-db/schema';
import { writableTableConfigs } from '@/src/dynamic-db/config';

function toFieldType(dataType: string, columnType: string): DbSchemaFieldType {
  if (dataType === 'number') {
    return 'number';
  }

  if (dataType === 'boolean') {
    return 'boolean';
  }

  if (dataType === 'date') {
    return 'date';
  }

  if (dataType === 'json') {
    return 'textarea';
  }

  if (columnType.toLowerCase().includes('text')) {
    return 'text';
  }

  return 'text';
}

function titleCase(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

async function main() {
  const tables = writableTableConfigs.map((config) => {
    const columns = getTableColumns(config.table);

    const fields = Object.entries(columns)
      .filter(([name, column]) => {
        if (config.includeFields && !config.includeFields.includes(name)) {
          return false;
        }

        if (config.excludeFields?.includes(name)) {
          return false;
        }

        if (!config.includeDefaultedFields && (column as { hasDefault?: boolean }).hasDefault) {
          return false;
        }

        return true;
      })
      .map(([name, column]) => {
        const typedColumn = column as {
          notNull?: boolean;
          dataType?: string;
          columnType?: string;
        };

        const dataType = typedColumn.dataType ?? 'string';
        const fieldType = toFieldType(dataType, typedColumn.columnType ?? '');

        return {
          name,
          label: titleCase(name),
          type: fieldType,
          required: Boolean(typedColumn.notNull),
          ...(dataType === 'json' ? { format: 'json' as const, placeholder: '{"key":"value"}' } : {}),
        };
      });

    return {
      name: config.name,
      label: config.label,
      description: config.description,
      fields,
    };
  });

  const output: DbSchemaDocument = { tables };

  await writeFile(join(process.cwd(), 'db-schema.json'), `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  console.log(`Generated db-schema.json with ${tables.length} table definitions.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
