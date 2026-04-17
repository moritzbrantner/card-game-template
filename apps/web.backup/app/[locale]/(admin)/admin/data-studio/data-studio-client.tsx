'use client';

import { useState } from 'react';

import dbSchema from '@/db-schema.json';
import { AdminPageShell, type AdminPageNavigationItem } from '@/components/admin/admin-page-shell';
import { SchemaTableForm } from '@/components/dynamic-db/schema-table-form';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { parseDbSchemaDocument } from '@/src/dynamic-db/schema';
import { useTranslations } from '@/src/i18n';

export function DataStudioClient({
  adminPages,
}: {
  adminPages: readonly AdminPageNavigationItem[];
}) {
  const t = useTranslations('AdminPage');
  const parsedSchema = parseDbSchemaDocument(dbSchema);
  const totalFields = parsedSchema.tables.reduce((sum, table) => sum + table.fields.length, 0);
  const [activeTableName, setActiveTableName] = useState(parsedSchema.tables[0]?.name ?? '');
  const activeTable = parsedSchema.tables.find((table) => table.name === activeTableName) ?? parsedSchema.tables[0];
  const requiredFieldCount = activeTable?.fields.filter((field) => field.required).length ?? 0;

  return (
    <AdminPageShell title={t('dataStudio.title')} description={t('dataStudio.description')} adminPages={adminPages}>
      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader><CardDescription>{t('dataStudio.summary.tables')}</CardDescription><CardTitle>{String(parsedSchema.tables.length)}</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardDescription>{t('dataStudio.summary.fields')}</CardDescription><CardTitle>{String(totalFields)}</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardDescription>{t('dataStudio.summary.required')}</CardDescription><CardTitle>{String(requiredFieldCount)}</CardTitle></CardHeader></Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>{t('dataStudio.explorerTitle')}</CardTitle>
            <CardDescription>{t('dataStudio.explorerDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {parsedSchema.tables.map((table) => {
              const isActive = table.name === activeTable?.name;

              return (
                <button key={table.name} type="button" onClick={() => setActiveTableName(table.name)} className={['w-full rounded-2xl border p-4 text-left transition-colors', isActive ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900' : 'border-zinc-200 hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-900'].join(' ')}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{table.label}</p>
                    <Badge variant={isActive ? 'secondary' : 'outline'}>{table.fields.length}</Badge>
                  </div>
                  <p className={['mt-2 text-sm', isActive ? 'text-zinc-100 dark:text-zinc-800' : 'text-zinc-600 dark:text-zinc-300'].join(' ')}>
                    {table.description ?? t('dataStudio.noDescription')}
                  </p>
                </button>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <CardTitle>{activeTable?.label ?? t('dataStudio.emptyState')}</CardTitle>
                <CardDescription>{activeTable?.description ?? t('dataStudio.noDescription')}</CardDescription>
              </div>
              <Badge variant="outline">{activeTable?.name ?? 'N/A'}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border p-4 dark:border-zinc-800"><p className="text-sm text-zinc-600 dark:text-zinc-300">{t('dataStudio.details.tableName')}</p><p className="mt-2 font-medium">{activeTable?.name ?? 'N/A'}</p></div>
              <div className="rounded-2xl border p-4 dark:border-zinc-800"><p className="text-sm text-zinc-600 dark:text-zinc-300">{t('dataStudio.details.fieldCount')}</p><p className="mt-2 font-medium">{String(activeTable?.fields.length ?? 0)}</p></div>
              <div className="rounded-2xl border p-4 dark:border-zinc-800"><p className="text-sm text-zinc-600 dark:text-zinc-300">{t('dataStudio.details.endpoint')}</p><p className="mt-2 font-medium">/api/admin/data-studio/records</p></div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-semibold">{t('dataStudio.formTitle')}</h2>
                    <Badge variant="outline">db-schema.json</Badge>
                  </div>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{t('dataStudio.formDescription')}</p>
                </div>

                {activeTable ? <SchemaTableForm table={activeTable} /> : null}
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border p-4 dark:border-zinc-800">
                  <h3 className="font-medium">{t('dataStudio.fieldListTitle')}</h3>
                  <div className="mt-3 space-y-3">
                    {activeTable?.fields.map((field) => (
                      <div key={field.name} className="rounded-xl bg-zinc-100/70 p-3 dark:bg-zinc-900">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-medium">{field.label}</p>
                          <Badge variant={field.required ? 'default' : 'outline'}>
                            {field.required ? t('dataStudio.fieldRequired') : t('dataStudio.fieldOptional')}
                          </Badge>
                        </div>
                        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{field.name}</p>
                        <p className="mt-2 text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                          {t('dataStudio.fieldType')}: {field.type}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border p-4 dark:border-zinc-800">
                  <h3 className="font-medium">{t('dataStudio.guideTitle')}</h3>
                  <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">{t('dataStudio.guideDescription')}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminPageShell>
  );
}
