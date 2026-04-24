'use client';

import * as React from 'react';
import type { VariantProps } from 'class-variance-authority';
import { motion } from 'motion/react';
import { Slot } from 'radix-ui';
import { buttonVariants } from '../button-variants';
import { cn } from '../lib/cn';

type SharedProps = VariantProps<typeof buttonVariants> & {
  className?: string;
  asChild?: boolean;
  dragX?: boolean;
  // Backward-compatible alias for horizontal drag support.
  onDrag?: React.ComponentProps<'button'>['onDrag'] | boolean;
};

type ButtonProps = SharedProps & React.ComponentProps<'button'>;

function Button(props: ButtonProps) {
  const {
    className,
    variant = 'default',
    size = 'default',
    asChild = false,
    dragX,
    onDrag,
    ...rest
  } = props;

  const buttonClassName = cn(buttonVariants({ variant, size, className }));
  const legacyDragX = typeof onDrag === 'boolean' ? onDrag : undefined;
  const enableDrag = Boolean(dragX ?? legacyDragX);
  const isDisabled =
    'disabled' in rest && typeof rest.disabled === 'boolean'
      ? rest.disabled
      : false;

  if (asChild) {
    return (
      <Slot.Root
        data-slot="button"
        data-variant={variant}
        data-size={size}
        className={buttonClassName}
        {...(rest as Record<string, unknown>)}
      />
    );
  }

  return (
    <motion.button
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={buttonClassName}
      whileHover={{ scale: isDisabled ? 1 : 1.01 }}
      whileTap={{ scale: isDisabled ? 1 : 0.98 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      drag={enableDrag ? 'x' : undefined}
      {...(rest as Record<string, unknown>)}
    />
  );
}

export { Button, buttonVariants };
