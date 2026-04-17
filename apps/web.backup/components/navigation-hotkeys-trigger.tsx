'use client';

import dynamic from 'next/dynamic';

type NavigationHotkey = readonly [string, string];

type NavigationHotkeyItem = {
  key: string;
  href: string;
  label: string;
  groupLabel: string;
  hotkey: NavigationHotkey;
  hotkeyLabel: string;
  searchText: string;
};

const NavigationHotkeys = dynamic(
  () => import('@/components/navigation-hotkeys').then((mod) => mod.NavigationHotkeys),
);

export function NavigationHotkeysTrigger({
  items,
  labels,
}: {
  items: NavigationHotkeyItem[];
  labels: {
    button: string;
    title: string;
    description: string;
    searchPlaceholder: string;
    empty: string;
  };
}) {
  return <NavigationHotkeys items={items} labels={labels} />;
}
