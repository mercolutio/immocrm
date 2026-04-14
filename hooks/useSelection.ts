"use client";

import { useState, useMemo, useCallback } from "react";

export function useSelection<T extends { id: string }>(items: T[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelectedIds((prev) => {
      const allVisible = items.every((it) => prev.has(it.id)) && items.length > 0;
      if (allVisible) {
        const next = new Set(prev);
        items.forEach((it) => next.delete(it.id));
        return next;
      }
      const next = new Set(prev);
      items.forEach((it) => next.add(it.id));
      return next;
    });
  }, [items]);

  const clear = useCallback(() => setSelectedIds(new Set()), []);

  const setAll = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids));
  }, []);

  const { isAllSelected, isSomeSelected, selectedCount } = useMemo(() => {
    const visibleSelected = items.filter((it) => selectedIds.has(it.id)).length;
    return {
      isAllSelected: items.length > 0 && visibleSelected === items.length,
      isSomeSelected: visibleSelected > 0 && visibleSelected < items.length,
      selectedCount: selectedIds.size,
    };
  }, [items, selectedIds]);

  return { selectedIds, toggle, toggleAll, clear, setAll, isAllSelected, isSomeSelected, selectedCount };
}
