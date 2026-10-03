import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AppPermissionKey } from '@/lib/authorization';
import type { AppSession } from '@/src/auth';

const { getFoundationFeatureAvailabilityMap, getPermissionSetForRole } =
  vi.hoisted(() => ({
    getFoundationFeatureAvailabilityMap: vi.fn(),
    getPermissionSetForRole: vi.fn(),
  }));

vi.mock('@/src/domain/authorization/service', () => ({
  getPermissionSetForRole,
}));
vi.mock('@/src/foundation/features/access', () => ({
  getFoundationFeatureAvailabilityMap,
}));
vi.mock('@/components/navigation-hotkeys-trigger', () => ({
  NavigationHotkeysTrigger: () => null,
}));

import { NavigationBar } from '@/components/navigation-bar';
import { NavigationHotkeysTrigger } from '@/components/navigation-hotkeys-trigger';

type HotkeyItem = { key: string };

function findHotkeyItems(node: ReactNode): HotkeyItem[] | null {
  if (Array.isArray(node)) {
    for (const child of node) {
      const items = findHotkeyItems(child);
      if (items) {
        return items;
      }
    }
    return null;
  }

  if (!isValidElement(node)) {
    return null;
  }

  const element = node as ReactElement<{
    children?: ReactNode;
    items?: HotkeyItem[];
  }>;
  if (element.type === NavigationHotkeysTrigger) {
    return element.props.items ?? [];
  }

  return findHotkeyItems(element.props.children);
}

const userSession = {
  user: { id: 'user-1', role: 'USER' },
} as unknown as AppSession;

async function hotkeyKeysFor(session: AppSession | null) {
  const tree = await NavigationBar({
    locale: 'en',
    siteName: 'Cards',
    session,
  });
  return (findHotkeyItems(tree) ?? []).map((item) => item.key);
}

describe('NavigationBar hotkeys', () => {
  beforeEach(() => {
    getPermissionSetForRole.mockReset();
    getFoundationFeatureAvailabilityMap.mockReset();
    getFoundationFeatureAvailabilityMap.mockResolvedValue({});
  });

  it('offers routes granted through customized role permissions', async () => {
    getPermissionSetForRole.mockResolvedValue(
      new Set<AppPermissionKey>(['admin.access']),
    );

    expect(await hotkeyKeysFor(userSession)).toContain('admin');
    expect(getPermissionSetForRole).toHaveBeenCalledWith('USER');
    expect(getFoundationFeatureAvailabilityMap).toHaveBeenCalledWith(
      userSession.user,
    );
  });

  it('omits routes whose feature is disabled at runtime', async () => {
    getPermissionSetForRole.mockResolvedValue(new Set<AppPermissionKey>());

    expect(await hotkeyKeysFor(userSession)).toContain('reportProblem');

    getFoundationFeatureAvailabilityMap.mockResolvedValue({
      reportProblem: false,
    });

    expect(await hotkeyKeysFor(userSession)).not.toContain('reportProblem');
  });

  it('omits admin routes when the resolved permissions lack access', async () => {
    getPermissionSetForRole.mockResolvedValue(new Set<AppPermissionKey>());

    expect(await hotkeyKeysFor(userSession)).not.toContain('admin');
  });
});
