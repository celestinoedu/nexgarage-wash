"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  readPreference,
  usePreference,
  writePreference,
} from "@/lib/local-preference";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./AuthProvider";

export type AccessibleStore = {
  id: string;
  account_id: string;
  name: string;
  city: string | null;
  state: string | null;
  logo_url: string | null;
};

/**
 * "single": o usuário trabalha em uma loja por vez, como no login atual.
 * "consolidated": todas as lojas permitidas aparecem juntas e cada página
 * ganha filtro por loja e identificação de origem em cada registro.
 */
export type StoreScope = "single" | "consolidated";

type StoreContextValue = {
  stores: AccessibleStore[];
  currentStore: AccessibleStore | null;
  loading: boolean;
  selectStore: (storeId: string) => void;
  scope: StoreScope;
  setScope: (scope: StoreScope) => void;
  consolidated: boolean;
  /** Loja escolhida no filtro da visão consolidada; "all" mostra todas. */
  storeFilter: string;
  setStoreFilter: (storeId: string) => void;
  /** Lojas efetivamente consultadas nas páginas, já com o filtro aplicado. */
  scopeStoreIds: string[];
  /** Loja usada como destino ao criar registros. */
  writeStore: AccessibleStore | null;
  storeName: (storeId: string | null | undefined) => string;
};

const SCOPE_KEY = "nexwash:store-scope";
const FILTER_KEY = "nexwash:store-filter";
const STORE_KEY = "nexwash:store-id";

const PREVIEW_STORE: AccessibleStore = {
  id: "preview",
  account_id: "preview",
  name: "Top Line Higienizações",
  city: "São Paulo",
  state: "SP",
  logo_url: null,
};
const StoreContext = createContext<StoreContextValue | null>(null);

const parseScope = (raw: string | null): StoreScope =>
  raw === "consolidated" ? "consolidated" : "single";
const parseFilter = (raw: string | null) => raw ?? "all";

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const { configured, user, loading: authLoading } = useAuth();
  const [stores, setStores] = useState<AccessibleStore[]>(
    configured ? [] : [PREVIEW_STORE],
  );
  const [currentStore, setCurrentStore] = useState<AccessibleStore | null>(
    configured ? null : PREVIEW_STORE,
  );
  const [loading, setLoading] = useState(configured);
  const scope = usePreference<StoreScope>(SCOPE_KEY, "single", parseScope);
  const savedFilter = usePreference(FILTER_KEY, "all", parseFilter);

  useEffect(() => {
    if (!configured) return;
    if (authLoading) return;
    let cancelled = false;
    async function loadStores() {
      await Promise.resolve();
      if (!user || !supabase) {
        if (!cancelled) {
          setStores([]);
          setCurrentStore(null);
          setLoading(false);
        }
        return;
      }
      setLoading(true);
      const { data, error } = await supabase
        .from("stores")
        .select("id,account_id,name,city,state,logo_url")
        .eq("active", true)
        .order("name");
      if (cancelled) return;
      if (error) {
        setStores([]);
        setCurrentStore(null);
        setLoading(false);
        return;
      }
      const accessible = (data ?? []) as AccessibleStore[];
      const savedId = readPreference(STORE_KEY);
      const selected =
        accessible.find((store) => store.id === savedId) ??
        accessible[0] ??
        null;
      setStores(accessible);
      setCurrentStore(selected);
      setLoading(false);
    }
    void loadStores();
    return () => {
      cancelled = true;
    };
  }, [authLoading, configured, user]);

  const setScope = useCallback(
    (next: StoreScope) => writePreference(SCOPE_KEY, next),
    [],
  );
  const setStoreFilter = useCallback(
    (storeId: string) => writePreference(FILTER_KEY, storeId),
    [],
  );

  const consolidated = scope === "consolidated" && stores.length > 1;
  // Um filtro apontando para loja que o usuário perdeu acesso volta a valer
  // como "todas", em vez de deixar as páginas permanentemente vazias.
  const storeFilter =
    savedFilter !== "all" && stores.some((store) => store.id === savedFilter)
      ? savedFilter
      : "all";

  const scopeStoreIds = useMemo(() => {
    if (!consolidated) return currentStore ? [currentStore.id] : [];
    if (storeFilter !== "all") return [storeFilter];
    return stores.map((store) => store.id);
  }, [consolidated, currentStore, storeFilter, stores]);

  const writeStore = useMemo(() => {
    if (!consolidated) return currentStore;
    if (storeFilter !== "all")
      return stores.find((store) => store.id === storeFilter) ?? currentStore;
    return currentStore;
  }, [consolidated, currentStore, storeFilter, stores]);

  const storeName = useCallback(
    (storeId: string | null | undefined) =>
      stores.find((store) => store.id === storeId)?.name ?? "Loja",
    [stores],
  );

  const value = useMemo<StoreContextValue>(
    () => ({
      stores,
      currentStore,
      loading,
      selectStore: (storeId) => {
        const selected = stores.find((store) => store.id === storeId);
        if (selected) {
          setCurrentStore(selected);
          writePreference(STORE_KEY, selected.id);
        }
      },
      scope,
      setScope,
      consolidated,
      storeFilter,
      setStoreFilter,
      scopeStoreIds,
      writeStore,
      storeName,
    }),
    [
      consolidated,
      currentStore,
      loading,
      scope,
      scopeStoreIds,
      setScope,
      setStoreFilter,
      storeFilter,
      storeName,
      stores,
      writeStore,
    ],
  );

  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context)
    throw new Error("useStore precisa estar dentro de StoreProvider");
  return context;
}
