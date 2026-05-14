import { db } from "@/lib/db";
import { buildConfigurationKey } from "@/lib/menu-option-client";

/** Manager / product policy: max option groups per menu item */
export const MAX_OPTION_GROUPS_PER_MENU_ITEM = 3;

export { buildConfigurationKey };

export type ResolvedMenuSelections = {
  configurationKey: string;
  configurationLabel: string;
  unitPrice: number;
  priceDeltaSum: number;
  resolvedOptionIds: string[];
};

/**
 * Validates selected menu options against catalog rules and returns
 * server-authoritative line price (base + sum of priceDelta) and display strings.
 */
export async function resolveMenuItemSelections(
  menuItemId: string,
  menuItemOptionIds: string[] | undefined | null
): Promise<
  | { ok: true; data: ResolvedMenuSelections }
  | { ok: false; error: string }
> {
  const selected = [...new Set(menuItemOptionIds || [])].filter(Boolean);

  const menuItem = await db.menuItem.findFirst({
    where: { id: menuItemId, deletedAt: null },
    include: {
      optionGroups: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        include: {
          options: {
            where: { isActive: true },
            orderBy: { sortOrder: "asc" },
          },
        },
      },
    },
  });

  if (!menuItem) {
    return { ok: false, error: "Menu item not found" };
  }

  const groups = menuItem.optionGroups;
  const basePrice = Number(menuItem.price);

  if (groups.length === 0) {
    if (selected.length > 0) {
      return { ok: false, error: "This product has no configurable options" };
    }
    return {
      ok: true,
      data: {
        configurationKey: "",
        configurationLabel: "",
        unitPrice: basePrice,
        priceDeltaSum: 0,
        resolvedOptionIds: [],
      },
    };
  }

  const optionById = new Map<string, { groupId: string; name: string; priceDelta: number; groupName: string }>();
  for (const g of groups) {
    for (const o of g.options) {
      optionById.set(o.id, {
        groupId: g.id,
        name: o.name,
        priceDelta: Number(o.priceDelta),
        groupName: g.name,
      });
    }
  }

  for (const id of selected) {
    if (!optionById.has(id)) {
      return { ok: false, error: `Invalid or inactive option: ${id}` };
    }
  }

  const selectedByGroup = new Map<string, string[]>();
  for (const id of selected) {
    const meta = optionById.get(id)!;
    const arr = selectedByGroup.get(meta.groupId) || [];
    arr.push(id);
    selectedByGroup.set(meta.groupId, arr);
  }

  for (const g of groups) {
    const picks = selectedByGroup.get(g.id) || [];
    const n = picks.length;
    const minReq = g.isRequired ? g.minSelections : 0;
    if (n > g.maxSelections) {
      return { ok: false, error: `At most ${g.maxSelections} selection(s) for "${g.name}"` };
    }
    if (n < minReq) {
      return { ok: false, error: `Select at least ${minReq} for "${g.name}"` };
    }
  }

  let priceDeltaSum = 0;
  const labelParts: string[] = [];
  for (const id of [...selected].sort()) {
    const meta = optionById.get(id)!;
    priceDeltaSum += meta.priceDelta;
    labelParts.push(`${meta.groupName}: ${meta.name}`);
  }

  const configurationKey = buildConfigurationKey(selected);
  const unitPrice = Math.round((basePrice + priceDeltaSum) * 100) / 100;

  return {
    ok: true,
    data: {
      configurationKey,
      configurationLabel: labelParts.join("; "),
      unitPrice,
      priceDeltaSum,
      resolvedOptionIds: selected,
    },
  };
}

/** Apply default options for required groups when client sent none */
export async function applyDefaultMenuItemSelections(
  menuItemId: string,
  menuItemOptionIds: string[] | undefined | null
): Promise<string[]> {
  const selected = new Set(menuItemOptionIds || []);

  const menuItem = await db.menuItem.findFirst({
    where: { id: menuItemId, deletedAt: null },
    include: {
      optionGroups: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        include: {
          options: {
            where: { isActive: true },
            orderBy: { sortOrder: "asc" },
          },
        },
      },
    },
  });

  if (!menuItem?.optionGroups.length) {
    return [...selected];
  }

  for (const g of menuItem.optionGroups) {
    const picksInGroup = [...selected].filter((id) =>
      g.options.some((o) => o.id === id)
    );
    const minReq = g.isRequired ? g.minSelections : 0;
    if (picksInGroup.length >= minReq) continue;
    const def = g.options.find((o) => o.isDefault) || g.options[0];
    if (def && g.isRequired) {
      selected.add(def.id);
    }
  }

  return [...selected];
}
