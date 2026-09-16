import { describe, expect, it } from 'vitest';

import {
  NAVIGATION_CONTEXT_ID,
  NAVIGATION_PALETTE_ACTION_ID,
  createNavigationInputRegistry,
  defaultInputProfile,
  formatInputSequence,
  navigationActionId,
  navigationPageContextId,
  readInputProfile,
} from '@/src/input-bindings/foundation';

const navigationPages = [
  { key: 'home', hotkey: ['alt', 'h'] as const },
  { key: 'reports', hotkey: ['ctrl', '2'] as const },
] as const;
const navigationInputRegistry = createNavigationInputRegistry(navigationPages);

describe('shared input-bindings adapter', () => {
  it('declares semantic navigation actions with visibility-scoped contexts', () => {
    const actionIds = navigationInputRegistry.actions.map((action) => action.id);

    expect(new Set(actionIds).size).toBe(actionIds.length);
    expect(actionIds).toContain(NAVIGATION_PALETTE_ACTION_ID);

    for (const page of navigationPages) {
      const action = navigationInputRegistry.actions.find(
        (candidate) => candidate.id === navigationActionId(page.key),
      );
      expect(action).toBeDefined();
      expect(action?.defaults).toHaveLength(1);
      expect(action?.defaults?.[0]?.when).toEqual({
        op: 'context',
        id: navigationPageContextId(page.key),
      });
    }
  });

  it('translates declared hotkeys into physical input strokes', () => {
    const homeBinding = navigationInputRegistry.actions.find(
      (action) => action.id === navigationActionId('home'),
    )?.defaults?.[0];
    const reportsBinding = navigationInputRegistry.actions.find(
      (action) => action.id === navigationActionId('reports'),
    )?.defaults?.[0];

    expect(homeBinding?.sequence).toEqual([
      {
        key: { kind: 'physical', value: 'KeyH' },
        modifiers: { alt: true },
      },
    ]);
    expect(reportsBinding?.sequence).toEqual([
      {
        key: { kind: 'physical', value: 'Digit2' },
        modifiers: { ctrl: true },
      },
    ]);
  });

  it('keeps the launcher in the general navigation context', () => {
    const paletteAction = navigationInputRegistry.actions.find(
      (action) => action.id === NAVIGATION_PALETTE_ACTION_ID,
    );

    expect(
      paletteAction?.defaults?.every(
        (binding) =>
          binding.when?.op === 'context' &&
          binding.when.id === NAVIGATION_CONTEXT_ID,
      ),
    ).toBe(true);
  });

  it('formats configured physical-key shortcuts for the presentation layer', () => {
    expect(
      formatInputSequence([
        {
          key: { kind: 'physical', value: 'KeyK' },
          modifiers: { ctrl: true, shift: true },
        },
      ]),
    ).toBe('Ctrl+Shift+K');
  });

  it('fails closed to the default profile when persisted JSON is malformed', () => {
    expect(
      readInputProfile({
        getItem: () => '{not-json',
      }),
    ).toEqual(defaultInputProfile);
  });
});
