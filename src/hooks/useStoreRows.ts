"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useStore } from "@/components/StoreProvider";
import { supabase } from "@/lib/supabase";

type StoreRowsOptions = {
  select?: string;
  orderBy?: string;
  ascending?: boolean;
};

/** Toda linha lida pelas páginas carrega a loja de origem. */
export type WithStore = { store_id: string };

// O store_id é sempre trazido: a visão consolidada precisa dele para as tags e
// os filtros, e na visão por loja ele apenas é ignorado.
function withStoreColumn(select: string) {
  if (select === "*") return select;
  const columns = select.split(",").map((column) => column.trim());
  return columns.includes("store_id") ? select : `${select},store_id`;
}

export function useStoreRows<T>(table: string, options: StoreRowsOptions = {}) {
  const { scopeStoreIds, writeStore, consolidated, storeName, stores } =
    useStore();
  const [rows, setRows] = useState<(T & WithStore)[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const select = withStoreColumn(options.select ?? "*");
  const orderBy = options.orderBy ?? "created_at";
  const ascending = options.ascending ?? false;
  const storeIdsKey = scopeStoreIds.join(",");

  useEffect(() => {
    let cancelled = false;
    const storeIds = storeIdsKey ? storeIdsKey.split(",") : [];
    async function load() {
      await Promise.resolve();
      if (storeIds.length === 0 || !supabase) {
        if (!cancelled) {
          setRows([]);
          setLoading(false);
        }
        return;
      }
      setLoading(true);
      setError(null);
      const query = supabase
        .from(table)
        .select(select)
        .in("store_id", storeIds)
        .order(orderBy, { ascending });
      const { data, error: queryError } = await query;
      if (cancelled) return;
      if (queryError) {
        setRows([]);
        setError(queryError.message);
      } else setRows((data ?? []) as unknown as (T & WithStore)[]);
      setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [ascending, orderBy, revision, select, storeIdsKey, table]);

  const refresh = useCallback(() => setRevision((value) => value + 1), []);

  return useMemo(
    () => ({
      rows,
      loading,
      error,
      refresh,
      /** Loja de destino ao criar registros nesta página. */
      store: writeStore,
      consolidated,
      storeName,
      stores,
    }),
    [consolidated, error, loading, refresh, rows, storeName, stores, writeStore],
  );
}

/**
 * Cadastros compartilhados por toda a conta, independentemente da loja ativa.
 * Parceiros usam este escopo: uma loja pode abrir um atendimento com qualquer
 * parceiro cadastrado na mesma conta.
 */
export function useAccountRows<T>(table: string, options: StoreRowsOptions = {}) {
  const { currentStore, stores } = useStore();
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const select = options.select ?? "*";
  const orderBy = options.orderBy ?? "created_at";
  const ascending = options.ascending ?? false;
  const accountId = currentStore?.account_id ?? stores[0]?.account_id ?? null;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      await Promise.resolve();
      if (!supabase) {
        if (!cancelled) {
          setRows([]);
          setLoading(false);
        }
        return;
      }
      if (!accountId) {
        if (!cancelled) {
          setRows([]);
          setLoading(false);
        }
        return;
      }
      setLoading(true);
      setError(null);
      const { data, error: queryError } = await supabase
        .from(table)
        .select(select)
        .eq("account_id", accountId)
        .order(orderBy, { ascending });
      if (cancelled) return;
      if (queryError) {
        setRows([]);
        setError(queryError.message);
      } else setRows((data ?? []) as unknown as T[]);
      setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [accountId, ascending, orderBy, revision, select, table]);

  const refresh = useCallback(() => setRevision((value) => value + 1), []);

  return useMemo(
    () => ({ rows, loading, error, refresh, accountId }),
    [accountId, error, loading, refresh, rows],
  );
}
