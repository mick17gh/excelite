"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getMenuStockAvailability } from "@/lib/actions/menu-stock-availability";

export function useMenuStockAvailability(
  branchId: string | null | undefined,
  menuItemIds: string[],
  enabled: boolean
) {
  const [unsellableIds, setUnsellableIds] = useState<Set<string>>(new Set());
  const [blocking, setBlocking] = useState(false);
  const [loading, setLoading] = useState(false);

  const idsKey = useMemo(() => menuItemIds.join(","), [menuItemIds]);

  const refresh = useCallback(async () => {
    if (!branchId || !enabled || menuItemIds.length === 0) {
      setUnsellableIds(new Set());
      setBlocking(false);
      return;
    }

    setLoading(true);
    try {
      const result = await getMenuStockAvailability(branchId, menuItemIds);
      if (result.success && result.data) {
        setBlocking(result.data.blocking);
        setUnsellableIds(new Set(result.data.unsellableIds));
      } else {
        setUnsellableIds(new Set());
        setBlocking(false);
      }
    } finally {
      setLoading(false);
    }
  }, [branchId, enabled, menuItemIds]);

  useEffect(() => {
    void refresh();
  }, [refresh, idsKey]);

  const isSellable = useCallback(
    (itemId: string) => !blocking || !unsellableIds.has(itemId),
    [blocking, unsellableIds]
  );

  return {
    blocking,
    unsellableIds,
    loading,
    isSellable,
    refresh,
  };
}
