'use client';

import { useState, type FormEvent } from 'react';

import { readProblemDetail } from '@/src/http/problem-client';
import type { DbSchemaTable } from '@/src/dynamic-db/schema';

type SchemaTableFormProps = {
  table: DbSchemaTable;
};

function inputTypeForField(type: DbSchemaTable['fields'][number]['type']) {
  if (type === 'number') {
    return 'number';
  }

  if (type === 'date') {
    return 'date';
  }

  return 'text';
}

export function SchemaTableForm({ table }: SchemaTableFormProps) {
  const [state, setState] = useState<{ ok: boolean; message: string }>({
    ok: false,
    message: '',
  });
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setState({ ok: false, message: '' });

    const response = await fetch('/api/admin/data-studio/records', {
      method: 'POST',
      body: new FormData(event.currentTarget),
    });

    if (!response.ok) {
      const problem = await readProblemDetail(
        response,
        'Unable to save record.',
      );
      setState({ ok: false, message: problem.message });
      setIsPending(false);
      return;
    }

    const body = (await response.json().catch(() => null)) as {
      ok?: boolean;
      message?: string;
    } | null;

    setState({
      ok: body?.ok ?? true,
      message: body?.message ?? `${table.label} record created successfully.`,
    });
    setIsPending(false);
    event.currentTarget.reset();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border p-4 dark:border-zinc-800"
    >
      <input type="hidden" name="tableName" value={table.name} />

      <div>
        <h3 className="text-lg font-semibold">{table.label}</h3>
        {table.description ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            {table.description}
          </p>
        ) : null}
      </div>

      <div className="space-y-3">
        {table.fields.map((field) => (
          <label key={field.name} className="block space-y-1">
            <span className="text-sm font-medium">
              {field.label}
              {field.required ? ' *' : ''}
            </span>

            {field.type === 'textarea' ? (
              <textarea
                name={field.name}
                required={field.required}
                placeholder={field.placeholder}
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                rows={4}
              />
            ) : field.type === 'boolean' ? (
              <input
                name={field.name}
                type="checkbox"
                className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
              />
            ) : (
              <input
                name={field.name}
                type={inputTypeForField(field.type)}
                required={field.required}
                placeholder={field.placeholder}
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
            )}
          </label>
        ))}
      </div>

      {state.message ? (
        <p
          className={
            state.ok
              ? 'text-sm text-emerald-600 dark:text-emerald-400'
              : 'text-sm text-red-600 dark:text-red-400'
          }
        >
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        {isPending ? 'Saving…' : `Create ${table.label}`}
      </button>
    </form>
  );
}
