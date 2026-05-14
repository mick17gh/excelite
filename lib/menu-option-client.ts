/** Pure helpers for POS / dashboard UIs (no DB). Server remains authoritative. */

export function buildConfigurationKey(optionIds: string[]): string {
  if (!optionIds.length) return "";
  return [...new Set(optionIds)].sort().join(",");
}

export type ClientMenuOptionGroup = {
  id: string;
  name: string;
  sortOrder: number;
  isRequired: boolean;
  minSelections: number;
  maxSelections: number;
  options: {
    id: string;
    name: string;
    sortOrder: number;
    priceDelta: number;
    isDefault: boolean;
  }[];
};

/** When a group is not required, no minimum picks apply (even if DB still has minSelections=1). */
export function effectiveMinSelections(group: {
  isRequired: boolean;
  minSelections: number;
}): number {
  return group.isRequired ? group.minSelections : 0;
}

export function formatOptionGroupRangeHint(group: {
  isRequired: boolean;
  minSelections: number;
  maxSelections: number;
}): string {
  const min = effectiveMinSelections(group);
  const max = group.maxSelections;
  if (min === 0) {
    if (max <= 1) return "Optional";
    return `Optional (0–${max})`;
  }
  if (min === max) return `${min} required`;
  return `${min}–${max} choices`;
}

export function applyDefaultSelections(
  groups: ClientMenuOptionGroup[] | undefined,
  menuItemOptionIds: string[] | undefined | null
): string[] {
  const selected = new Set((menuItemOptionIds || []).filter(Boolean));
  if (!groups?.length) return [...selected];

  for (const g of groups) {
    const inGroup = g.options.filter((o) => selected.has(o.id));
    const minNeed = effectiveMinSelections(g);
    if (inGroup.length >= minNeed) continue;
    const def = g.options.find((o) => o.isDefault) || g.options[0];
    if (g.isRequired && def) selected.add(def.id);
  }
  return [...selected];
}

/** Returns error message or null if counts are valid for every group. */
export function validateOptionSelections(
  groups: ClientMenuOptionGroup[] | undefined,
  menuItemOptionIds: string[]
): string | null {
  const selected = [...new Set(menuItemOptionIds)].filter(Boolean);
  if (!groups?.length) {
    return selected.length ? "This product has no configurable options" : null;
  }

  const optionToGroup = new Map<string, string>();
  for (const g of groups) {
    for (const o of g.options) optionToGroup.set(o.id, g.id);
  }
  for (const id of selected) {
    if (!optionToGroup.has(id)) return "Invalid option for this product";
  }

  const byGroup = new Map<string, string[]>();
  for (const id of selected) {
    const gid = optionToGroup.get(id)!;
    const arr = byGroup.get(gid) || [];
    arr.push(id);
    byGroup.set(gid, arr);
  }

  for (const g of groups) {
    const n = (byGroup.get(g.id) || []).length;
    const minNeed = effectiveMinSelections(g);
    if (n > g.maxSelections) return `At most ${g.maxSelections} selection(s) for "${g.name}"`;
    if (n < minNeed) return `Select at least ${minNeed} for "${g.name}"`;
  }
  return null;
}

export function buildLinePreview(
  basePrice: number,
  groups: ClientMenuOptionGroup[] | undefined,
  menuItemOptionIds: string[]
): {
  configurationKey: string;
  configurationLabel: string;
  unitPrice: number;
  menuItemOptionIds: string[];
} {
  const resolved = applyDefaultSelections(groups, menuItemOptionIds);
  const meta = new Map<string, { groupName: string; name: string; priceDelta: number }>();
  for (const g of groups || []) {
    for (const o of g.options) {
      meta.set(o.id, { groupName: g.name, name: o.name, priceDelta: o.priceDelta });
    }
  }
  let delta = 0;
  const labelParts: string[] = [];
  for (const id of [...new Set(resolved)].sort()) {
    const m = meta.get(id);
    if (!m) continue;
    delta += m.priceDelta;
    labelParts.push(`${m.groupName}: ${m.name}`);
  }
  const configurationKey = buildConfigurationKey(resolved.filter((id) => meta.has(id)));
  return {
    configurationKey,
    configurationLabel: labelParts.join("; "),
    unitPrice: Math.round((basePrice + delta) * 100) / 100,
    menuItemOptionIds: resolved.filter((id) => meta.has(id)),
  };
}

export function posCartLineKey(menuItemId: string, configurationKey: string): string {
  return `${menuItemId}:${configurationKey}`;
}
