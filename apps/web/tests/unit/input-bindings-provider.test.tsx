// @vitest-environment jsdom

import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  INPUT_BINDINGS_STORAGE_KEY,
  createNavigationInputRegistry,
  defaultInputProfile,
  type InputBindingsBrowserModule,
  type InputProfile,
} from '@/src/input-bindings/foundation';

const { loadInputBindingsBrowser } = vi.hoisted(() => ({
  loadInputBindingsBrowser: vi.fn(),
}));

vi.mock('@/src/input-bindings/foundation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/src/input-bindings/foundation')>()),
  loadInputBindingsBrowser,
}));

import {
  InputBindingsProvider,
  useInputBindings,
} from '@/src/input-bindings/provider';

const registry = createNavigationInputRegistry([
  { key: 'home', hotkey: ['alt', 'h'] },
]);

function Probe() {
  const { browserModule, profile, status } = useInputBindings();
  return (
    <p data-testid="probe">
      {status}|{browserModule ? 'module' : 'none'}|{profile.id}
    </p>
  );
}

afterEach(() => {
  window.localStorage.clear();
  loadInputBindingsBrowser.mockReset();
});

describe('InputBindingsProvider', () => {
  it('recovers to the default profile when the runtime rejects the stored one', async () => {
    const storedProfile: InputProfile = {
      id: 'stored',
      patches: [{ op: 'remove', bindingId: 'unknown' }],
    };
    window.localStorage.setItem(
      INPUT_BINDINGS_STORAGE_KEY,
      JSON.stringify(storedProfile),
    );
    const validateRegistry = vi.fn((_registry, profile?: InputProfile) => {
      if (profile?.id === 'stored') {
        throw new TypeError('unreadable profile');
      }
      return {
        valid: true,
        effectiveBindings: [],
        diagnostics: [],
        conflicts: [],
      };
    });
    loadInputBindingsBrowser.mockResolvedValue({
      validateRegistry,
    } as unknown as InputBindingsBrowserModule);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    render(
      <InputBindingsProvider registry={registry}>
        <Probe />
      </InputBindingsProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId('probe').textContent).toBe(
        `ready|module|${defaultInputProfile.id}`,
      ),
    );
    expect(
      JSON.parse(
        window.localStorage.getItem(INPUT_BINDINGS_STORAGE_KEY) ?? 'null',
      ),
    ).toEqual(defaultInputProfile);
    warn.mockRestore();
  });
});
