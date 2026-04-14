"use client";

import { useState, useEffect, useCallback } from "react";

export type PageSize = 25 | 50 | 100;
const VALID_SIZES: PageSize[] = [25, 50, 100];

export function usePagination(key: string, defaultSize: PageSize = 25) {
  const storageKey = `immocrm.pageSize.${key}`;
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState<PageSize>(defaultSize);

  // Hydrate from localStorage
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const n = Number(raw) as PageSize;
        if (VALID_SIZES.includes(n)) setPageSizeState(n);
      }
    } catch {}
  }, [storageKey]);

  const setPageSize = useCallback((n: number) => {
    const safe = (VALID_SIZES.includes(n as PageSize) ? n : defaultSize) as PageSize;
    setPageSizeState(safe);
    setPage(1);
    try {
      window.localStorage.setItem(storageKey, String(safe));
    } catch {}
  }, [defaultSize, storageKey]);

  return { page, setPage, pageSize, setPageSize };
}
