export const ADMIN_OVERVIEW_LAYOUT_STORAGE_KEY = 'admin-overview-layout';

export type AdminOverviewLayoutEntry<ItemId extends string = string> = {
  slot: ItemId;
  item: ItemId;
};

type StoredAdminOverviewLayout<ItemId extends string = string> = {
  version: 1;
  layout: AdminOverviewLayoutEntry<ItemId>[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isLayoutEntryArray<ItemId extends string>(
  value: unknown,
): value is AdminOverviewLayoutEntry<ItemId>[] {
  return (
    Array.isArray(value) &&
    value.every(
      (entry) =>
        isRecord(entry) &&
        typeof entry.slot === 'string' &&
        entry.slot.length > 0 &&
        typeof entry.item === 'string' &&
        entry.item.length > 0,
    )
  );
}

export function buildDefaultAdminOverviewLayout<ItemId extends string>(
  itemIds: readonly ItemId[],
): AdminOverviewLayoutEntry<ItemId>[] {
  return itemIds.map((itemId) => ({
    slot: itemId,
    item: itemId,
  }));
}

export function normalizeAdminOverviewLayout<ItemId extends string>(
  value: unknown,
  itemIds: readonly ItemId[],
): AdminOverviewLayoutEntry<ItemId>[] {
  const defaultLayout = buildDefaultAdminOverviewLayout(itemIds);
  const expectedEntries = new Set(itemIds);

  if (!isLayoutEntryArray<ItemId>(value) || value.length !== itemIds.length) {
    return defaultLayout;
  }

  const slotIds = new Set(value.map((entry) => entry.slot));
  const itemSet = new Set(value.map((entry) => entry.item));

  if (slotIds.size !== itemIds.length || itemSet.size !== itemIds.length) {
    return defaultLayout;
  }

  for (const itemId of itemIds) {
    if (
      !slotIds.has(itemId) ||
      !itemSet.has(itemId) ||
      !expectedEntries.has(itemId)
    ) {
      return defaultLayout;
    }
  }

  return value;
}

export function parseAdminOverviewLayout<ItemId extends string>(
  value: string | null | undefined,
  itemIds: readonly ItemId[],
): AdminOverviewLayoutEntry<ItemId>[] {
  if (!value) {
    return buildDefaultAdminOverviewLayout(itemIds);
  }

  try {
    const parsedValue = JSON.parse(value) as unknown;

    if (isRecord(parsedValue) && parsedValue.version === 1) {
      return normalizeAdminOverviewLayout(parsedValue.layout, itemIds);
    }

    return normalizeAdminOverviewLayout(parsedValue, itemIds);
  } catch {
    return buildDefaultAdminOverviewLayout(itemIds);
  }
}

export function serializeAdminOverviewLayout<ItemId extends string>(
  layout: AdminOverviewLayoutEntry<ItemId>[],
): string {
  const payload: StoredAdminOverviewLayout<ItemId> = {
    version: 1,
    layout,
  };

  return JSON.stringify(payload);
}

export function areAdminOverviewLayoutsEqual<ItemId extends string>(
  left: readonly AdminOverviewLayoutEntry<ItemId>[],
  right: readonly AdminOverviewLayoutEntry<ItemId>[],
): boolean {
  return (
    left.length === right.length &&
    left.every(
      (entry, index) =>
        entry.slot === right[index]?.slot && entry.item === right[index]?.item,
    )
  );
}
