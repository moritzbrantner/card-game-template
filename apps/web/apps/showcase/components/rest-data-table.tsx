'use client';

import { useEffect, useMemo, useState } from 'react';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type RowData = Record<string, string | number | boolean | null>;

type ValueType = 'text' | 'number' | 'currency' | 'boolean' | 'date';

export type RestDataColumn<T extends RowData> = {
  key: keyof T;
  header: string;
  valueType?: ValueType;
};

type RestDataTableProps<T extends RowData> = {
  endpoint: string;
  columns: Array<RestDataColumn<T>>;
};

type SortDirection = 'asc' | 'desc';

type SortConfig<T extends RowData> = {
  key: keyof T;
  direction: SortDirection;
};

function formatValue(value: RowData[keyof RowData], valueType: ValueType) {
  if (value === null) {
    return '-';
  }

  if (valueType === 'currency' && typeof value === 'number') {
    return `$${value.toLocaleString('en-US')}`;
  }

  if (valueType === 'boolean' && typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  return String(value);
}

export function RestDataTable<T extends RowData>({ endpoint, columns }: RestDataTableProps<T>) {
  const [rows, setRows] = useState<T[]>([]);
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [sortConfig, setSortConfig] = useState<SortConfig<T> | null>(null);
  const [filters, setFilters] = useState<Partial<Record<keyof T, string>>>({});

  useEffect(() => {
    const controller = new AbortController();

    async function loadRows() {
      try {
        setStatus('loading');
        const response = await fetch(endpoint, { signal: controller.signal });

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const data = (await response.json()) as T[];
        setRows(data);
        setStatus('ready');
      } catch {
        if (!controller.signal.aborted) {
          setStatus('error');
        }
      }
    }

    void loadRows();

    return () => controller.abort();
  }, [endpoint]);


  function compareValues(
    left: RowData[keyof RowData],
    right: RowData[keyof RowData],
    valueType: ValueType,
    direction: SortDirection,
  ) {
    const order = direction === 'asc' ? 1 : -1;

    if (left === null && right === null) {
      return 0;
    }

    if (left === null) {
      return 1;
    }

    if (right === null) {
      return -1;
    }

    if (valueType === 'number' || valueType === 'currency') {
      return (Number(left) - Number(right)) * order;
    }

    if (valueType === 'boolean') {
      return (Number(Boolean(left)) - Number(Boolean(right))) * order;
    }

    if (valueType === 'date') {
      return (new Date(String(left)).getTime() - new Date(String(right)).getTime()) * order;
    }

    return String(left).localeCompare(String(right), undefined, { sensitivity: 'base' }) * order;
  }

  const visibleRows = useMemo(() => {
    const filteredRows = rows.filter((row) =>
      columns.every((column) => {
        const filterValue = filters[column.key]?.trim();

        if (!filterValue) {
          return true;
        }

        const rowValue = row[column.key];

        if (rowValue === null) {
          return false;
        }

        if (column.valueType === 'boolean') {
          return String(rowValue) === filterValue;
        }

        return String(rowValue).toLowerCase().includes(filterValue.toLowerCase());
      }),
    );

    if (!sortConfig) {
      return filteredRows;
    }

    const valueType = columns.find((column) => column.key === sortConfig.key)?.valueType ?? 'text';

    return [...filteredRows].sort((leftRow, rightRow) =>
      compareValues(leftRow[sortConfig.key], rightRow[sortConfig.key], valueType, sortConfig.direction),
    );
  }, [columns, filters, rows, sortConfig]);

  function toggleSort(columnKey: keyof T) {
    setSortConfig((currentSort) => {
      if (!currentSort || currentSort.key !== columnKey) {
        return { key: columnKey, direction: 'asc' };
      }

      if (currentSort.direction === 'asc') {
        return { key: columnKey, direction: 'desc' };
      }

      return null;
    });
  }

  function updateFilter(columnKey: keyof T, value: string) {
    setFilters((currentFilters) => ({
      ...currentFilters,
      [columnKey]: value,
    }));
  }

  if (status === 'loading') {
    return <p className="text-sm text-zinc-600 dark:text-zinc-400">Loading endpoint data...</p>;
  }

  if (status === 'error') {
    return <p className="text-sm text-red-600 dark:text-red-400">Unable to load endpoint data.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((column) => (
            <TableHead key={String(column.key)}>
              <button
                className="inline-flex items-center gap-1 text-left font-semibold"
                onClick={() => toggleSort(column.key)}
                type="button"
              >
                {column.header}
                <span aria-hidden="true" className="text-xs text-zinc-500 dark:text-zinc-400">
                  {sortConfig?.key === column.key ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '↕'}
                </span>
              </button>
            </TableHead>
          ))}
        </TableRow>
        <TableRow>
          {columns.map((column) => (
            <TableHead key={`filter-${String(column.key)}`}>
              {column.valueType === 'boolean' ? (
                <select
                  aria-label={`Filter ${column.header}`}
                  className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                  onChange={(event) => updateFilter(column.key, event.target.value)}
                  value={filters[column.key] ?? ''}
                >
                  <option value="">All</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              ) : (
                <input
                  aria-label={`Filter ${column.header}`}
                  className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                  onChange={(event) => updateFilter(column.key, event.target.value)}
                  placeholder="Filter..."
                  type="text"
                  value={filters[column.key] ?? ''}
                />
              )}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {visibleRows.map((row, rowIndex) => (
          <TableRow key={rowIndex}>
            {columns.map((column) => (
              <TableCell key={String(column.key)}>
                {formatValue(row[column.key], column.valueType ?? 'text')}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
