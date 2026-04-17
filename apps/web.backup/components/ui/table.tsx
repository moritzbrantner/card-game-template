import type { HTMLAttributes, TableHTMLAttributes, ThHTMLAttributes, TdHTMLAttributes } from 'react';

export function Table({ className, ...props }: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="relative w-full overflow-auto">
      <table className={['w-full caption-bottom text-sm', className].filter(Boolean).join(' ')} {...props} />
    </div>
  );
}

export function TableHeader({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={['[&_tr]:border-b', className].filter(Boolean).join(' ')} {...props} />;
}

export function TableBody({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={['[&_tr:last-child]:border-0', className].filter(Boolean).join(' ')} {...props} />;
}

export function TableRow({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={[
        'border-b transition-colors hover:bg-zinc-100/70 data-[state=selected]:bg-zinc-100 dark:hover:bg-zinc-800/70 dark:data-[state=selected]:bg-zinc-800',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    />
  );
}

export function TableHead({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={[
        'h-12 px-4 text-left align-middle font-medium text-zinc-600 dark:text-zinc-400',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={['p-4 align-middle', className].filter(Boolean).join(' ')} {...props} />;
}
