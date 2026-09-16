import { describe, expect, it } from 'vitest';

import {
  NAVIGATION_CONTEXT_ID,
  NAVIGATION_PALETTE_ACTION_ID,
  defaultInputProfile,
  formatInputSequence,
  navigationActionId,
  navigationInputRegistry,
  navigationPageContextId,
  readInputProfile,
} from '@/src/input-bindings/foundation';
import { appPageDefinitions } from '@/src/navigation/app-routes';

describe('shared input-bindings adapter', () => {
  it('declares semantic navigation actions with visibility-scoped contexts', () => {
    const actionIds = navigationInputRegistry.actions.map((action) => action.id);

    expect(new Set(actionIds).size).toBe(actionIds.length);
    expect(actionIds).toContain(NAVIGATION_PALETTE_ACTION_ID);

    for (const page of appPageDefinitions) {
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
