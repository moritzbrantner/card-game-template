import { cleanup } from '@testing-library/react';
import { applyVitestEnvironment } from '@/tests/environment';
import React, { type ReactNode } from 'react';
import { afterEach, vi } from 'vitest';

applyVitestEnvironment();
afterEach(() => {
  cleanup();
});

function sanitizeMotionProps(props: Record<string, unknown>) {
  const {
    animate: _animate,
    exit: _exit,
    initial: _initial,
    layout: _layout,
    layoutId: _layoutId,
    transition: _transition,
    variants: _variants,
    viewport: _viewport,
    whileHover: _whileHover,
    whileInView: _whileInView,
    whileTap: _whileTap,
    ...domProps
  } = props;

  return domProps;
}

type MotionValueLike<T = unknown> = {
  get: () => T;
  on: () => () => undefined;
  set: (nextValue: T) => void;
};

function createMotionValue<T>(initialValue: T): MotionValueLike<T> {
  let value = initialValue;

  return {
    get() {
      return value;
    },
    on() {
      return () => undefined;
    },
    set(nextValue: T) {
      value = nextValue;
    },
  };
}

vi.mock('motion/react', () => {
  const motion = new Proxy(
    {},
    {
      get(_target, tagName) {
        return React.forwardRef(function MockMotionComponent(
          props: Record<string, unknown>,
          ref,
        ) {
          return React.createElement(String(tagName), {
            ...sanitizeMotionProps(props),
            ref,
          });
        });
      },
    },
  );

  return {
    AnimatePresence: ({ children }: { children: ReactNode }) => children,
    motion,
    useMotionValue: <T>(initialValue: T) => createMotionValue(initialValue),
    useMotionValueEvent: () => undefined,
    useReducedMotion: () => true,
    useScroll: () => ({
      scrollYProgress: createMotionValue(0),
    }),
    useSpring: <T>(value: MotionValueLike<T> | T) =>
      createMotionValue(
        value && typeof value === 'object' && 'get' in value
          ? value.get()
          : value,
      ),
    useTransform: (
      value: MotionValueLike<number> | number,
      transformOrInput: ((value: number) => number) | unknown,
      output?: unknown[],
    ) => {
      const resolvedValue =
        value && typeof value === 'object' && 'get' in value
          ? value.get()
          : value;

      if (typeof transformOrInput === 'function') {
        return createMotionValue(transformOrInput(resolvedValue ?? 0));
      }

      if (Array.isArray(output) && output.length > 0) {
        return createMotionValue(output[0]);
      }

      return createMotionValue(resolvedValue ?? 0);
    },
  };
});
