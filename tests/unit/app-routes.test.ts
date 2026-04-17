import { describe, expect, it } from 'vitest';

import {
  appPageDefinitions,
  getVisibleAppPages,
  type AppPageKey,
} from '@/src/navigation/app-routes';

type VisibilityCase = {
  label: string;
  input: {
    isAuthenticated: boolean;
    role: 'USER' | 'MANAGER' | 'ADMIN' | 'SUPERADMIN' | null;
  };
  visibleKeys: readonly AppPageKey[];
  hiddenKeys: readonly AppPageKey[];
};

describe('app routes', () => {
  it('assigns a unique hotkey to every route', () => {
    const seenRoutesByHotkey = new Map<string, string>();
    const duplicates: string[] = [];

    for (const page of appPageDefinitions) {
      const hotkey = page.hotkey.join('+');
      const existingRoute = seenRoutesByHotkey.get(hotkey);

      if (existingRoute) {
        duplicates.push(`${hotkey}: ${existingRoute}, ${page.key}`);
        continue;
      }

      seenRoutesByHotkey.set(hotkey, page.key);
    }

    expect(duplicates).toEqual([]);
  });

  it.each([
    {
      label: 'guests',
      input: { isAuthenticated: false, role: null },
      visibleKeys: ['home', 'about', 'forms', 'login', 'register'],
      hiddenKeys: ['people', 'notifications', 'dataEntry', 'profile', 'settings', 'admin'],
    },
    {
      label: 'signed-in users',
      input: { isAuthenticated: true, role: 'USER' as const },
      visibleKeys: ['home', 'people', 'notifications', 'dataEntry', 'profile', 'settings'],
      hiddenKeys: ['login', 'register', 'admin'],
    },
    {
      label: 'managers',
      input: { isAuthenticated: true, role: 'MANAGER' as const },
      visibleKeys: ['home', 'people', 'notifications', 'dataEntry', 'profile', 'settings'],
      hiddenKeys: ['login', 'register', 'admin'],
    },
    {
      label: 'admins',
      input: { isAuthenticated: true, role: 'ADMIN' as const },
      visibleKeys: ['people', 'notifications', 'dataEntry', 'profile', 'settings', 'admin'],
      hiddenKeys: ['login', 'register'],
    },
    {
      label: 'superadmins',
      input: { isAuthenticated: true, role: 'SUPERADMIN' as const },
      visibleKeys: ['people', 'notifications', 'dataEntry', 'profile', 'settings', 'admin'],
      hiddenKeys: ['login', 'register'],
    },
  ] satisfies readonly VisibilityCase[])(
    'exposes the right hotkey destinations for $label',
    ({ input, visibleKeys, hiddenKeys }) => {
    const visiblePageKeys = new Set(getVisibleAppPages(input).map((page) => page.key));

    for (const key of visibleKeys) {
      expect(visiblePageKeys.has(key)).toBe(true);
    }

    for (const key of hiddenKeys) {
      expect(visiblePageKeys.has(key)).toBe(false);
    }
    },
  );

  it('filters pages whose dynamic feature state is disabled for the active user', () => {
    const visiblePageKeys = new Set(
      getVisibleAppPages({
        isAuthenticated: true,
        role: 'USER',
        featureStateByKey: {
          notifications: false,
          'people.directory': false,
          'workspace.dataEntry': true,
        },
      }).map((page) => page.key),
    );

    expect(visiblePageKeys.has('notifications')).toBe(false);
    expect(visiblePageKeys.has('people')).toBe(false);
    expect(visiblePageKeys.has('dataEntry')).toBe(true);
  });
});
