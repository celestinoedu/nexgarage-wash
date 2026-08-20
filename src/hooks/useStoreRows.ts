"use client";

import { useCallback, useEffect, useState } from "react";
import { useStore } from "@/components/StoreProvider";
import { supabase } from "@/lib/supabase";

type StoreRowsOptions = {
  select?: string;
  orderBy?: string;
  ascending?: boolean;
};

export function useStoreRows<T>(table: string, options: StoreRowsOptions = {}) {
  const { currentStore } = useStore();
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const select = options.select ?? "*";
  const orderBy = options.orderBy ?? "created_at";
  const ascending = options.ascending ?? false;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      await Promise.resolve();
      if (!currentStore || !supabase) {
        if (!cancelled) { setRows([]); setLoading(false); }
        return;
      }
      setLoading(true); setError(null);
      const query = supabase.from(table).select(select).eq("store_id", currentStore.id).order(orderBy, { ascending });
      const { data, error: queryError } = await query;
      if (cancelled) return;
      if (queryError) { setRows([]); setError(queryError.message); }
      else setRows((data ?? []) as T[]);
      setLoading(false);
    }
    void load();
    return () => { cancelled = true; };
  }, [ascending, currentStore, orderBy, revision, select, table]);

  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  return { rows, loading, error, refresh, store: currentStore };
}
