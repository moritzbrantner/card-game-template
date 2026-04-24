import React from 'react';
import { vi } from 'vitest';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function normalizeStyle(style: unknown): Record<string, unknown> | undefined {
  if (!style) {
    return undefined;
  }

  if (Array.isArray(style)) {
    return style.reduce<Record<string, unknown>>((accumulator, value) => {
      const normalizedValue = normalizeStyle(value);

      if (normalizedValue) {
        Object.assign(accumulator, normalizedValue);
      }

      return accumulator;
    }, {});
  }

  if (typeof style === 'object') {
    return { ...(style as Record<string, unknown>) };
  }

  return undefined;
}

function createHostComponent(tagName: string) {
  return ({
    accessibilityLabel,
    accessibilityRole,
    accessibilityState,
    children,
    contentContainerStyle,
    onPress,
    style,
    testID,
    ...props
  }: {
    accessibilityLabel?: string;
    accessibilityRole?: string;
    accessibilityState?: { selected?: boolean };
    children?: React.ReactNode;
    contentContainerStyle?: unknown;
    onPress?: () => void;
    style?: unknown;
    testID?: string;
  }) =>
    React.createElement(
      tagName,
      {
        ...props,
        'aria-label': accessibilityLabel,
        'aria-selected': accessibilityState?.selected,
        'data-content-container-style': contentContainerStyle
          ? JSON.stringify(contentContainerStyle)
          : undefined,
        'data-testid': testID,
        onClick: onPress,
        role: accessibilityRole,
        ...props,
        style: normalizeStyle(
          typeof style === 'function' ? style({ pressed: false }) : style,
        ),
      },
      children,
    );
}

vi.mock('react-native', () => ({
  Platform: {
    select: (choices: Record<string, unknown>) =>
      choices.web ?? choices.default ?? null,
  },
  Pressable: createHostComponent('pressable'),
  ScrollView: createHostComponent('scroll-view'),
  StyleSheet: {
    create: <T extends Record<string, unknown>>(styles: T) => styles,
    hairlineWidth: 1,
  },
  Text: createHostComponent('text'),
  View: createHostComponent('view'),
  useColorScheme: () => 'light',
}));

vi.mock('react-native-safe-area-context', () => ({
  SafeAreaView: createHostComponent('safe-area-view'),
}));
