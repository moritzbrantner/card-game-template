import type { LabelHTMLAttributes } from 'react';

type LabelProps = LabelHTMLAttributes<HTMLLabelElement>;

export function Label({ className, ...props }: LabelProps) {
  return (
    <label
      className={['text-sm font-medium leading-none', className]
        .filter(Boolean)
        .join(' ')}
      {...props}
    />
  );
}
