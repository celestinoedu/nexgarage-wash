"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./AuthProvider";

export type AccessibleStore = { id: string; account_id: string; name: string; city: string | null; state: string | null };

type StoreContextValue = {
  stores: AccessibleStore[];
  currentStore: AccessibleStore | null;
  loading: boolean;
  selectStore: (storeId: string) => void;
};

const PREVIEW_STORE: AccessibleStore = { id: "preview", account_id: "preview", name: "Top Line Higienizações", city: "São Paulo", state: "SP" };
const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const { configured, user, loading: authLoading } = useAuth();
  const [stores, setStores] = useState<AccessibleStore[]>(configured ? [] : [PREVIEW_STORE]);
  const [currentStore, setCurrentStore] = useState<AccessibleStore | null>(configured ? null : PREVIEW_STORE);
  const [loading, setLoading] = useState(configured);

  useEffect(() => {
    if (!configured) return;
    if (authLoading) return;
    let cancelled = false;
    async function loadStores() {
      await Promise.resolve();
      if (!user || !supabase) {
        if (!cancelled) { setStores([]); setCurrentStore(null); setLoading(false); }
        return;
      }
      setLoading(true);
      const { data, error } = await supabase.from("stores").select("id,account_id,name,city,state").eq("active", true).order("name");
      if (cancelled) return;
      if (error) { setStores([]); setCurrentStore(null); setLoading(false); return; }
      const accessible = (data ?? []) as AccessibleStore[];
      const savedId = window.localStorage.getItem("nexwash:store-id");
      const selected = accessible.find((store) => store.id === savedId) ?? accessible[0] ?? null;
      setStores(accessible); setCurrentStore(selected); setLoading(false);
    }
    void loadStores();
    return () => { cancelled = true; };
  }, [authLoading, configured, user]);

  const value = useMemo<StoreContextValue>(() => ({
    stores, currentStore, loading,
    selectStore: (storeId) => {
      const selected = stores.find((store) => store.id === storeId);
      if (selected) { setCurrentStore(selected); window.localStorage.setItem("nexwash:store-id", selected.id); }
    }
  }), [currentStore, loading, stores]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useStore precisa estar dentro de StoreProvider");
  return context;
}
