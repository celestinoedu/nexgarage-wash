"use client";

import { Building2, Store } from "lucide-react";
import { useStore } from "./StoreProvider";

/**
 * Barra de filtro por loja. Só aparece na visão consolidada — na visão por
 * loja o contexto já é único e a barra seria ruído.
 */
export function StoreFilterBar({ label }: { label?: string }) {
  const { consolidated, stores, storeFilter, setStoreFilter } = useStore();
  if (!consolidated) return null;
  const options = [{ id: "all", name: "Todas as lojas" }, ...stores];
  return (
    <div className="mb-4 rounded-2xl border border-line bg-white p-3 shadow-soft sm:p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
          <Store size={14} aria-hidden /> {label ?? "Filtrar por loja"}
        </span>
        {options.map((option) => {
          const active = storeFilter === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setStoreFilter(option.id)}
              aria-pressed={active}
              className={`min-h-9 rounded-full px-3 text-xs font-bold transition ${
                active
                  ? "bg-wash-700 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {option.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Etiqueta com a loja de origem do registro, exibida na visão consolidada. */
export function StoreTag({
  storeId,
  className = "",
}: {
  storeId: string | null | undefined;
  className?: string;
}) {
  const { consolidated, storeName } = useStore();
  if (!consolidated || !storeId) return null;
  return (
    <span
      className={`inline-flex w-fit items-center gap-1 rounded-full bg-wash-50 px-2.5 py-1 text-[10px] font-bold text-wash-800 ring-1 ring-inset ring-wash-200 ${className}`}
      title={`Loja: ${storeName(storeId)}`}
    >
      <Building2 size={11} aria-hidden />
      {storeName(storeId)}
    </span>
  );
}

/**
 * Seletor da loja de destino em formulários de criação. Na visão por loja o
 * destino é implícito, então o campo fica oculto.
 */
export function StoreSelectField({
  name = "store_id",
  label = "Loja de destino",
  className = "",
}: {
  name?: string;
  label?: string;
  className?: string;
}) {
  const { consolidated, stores } = useStore();
  const defaultStoreId = useWriteStoreId();
  if (!consolidated) return null;
  return (
    <label className={`grid gap-2 text-sm font-bold text-slate-700 ${className}`}>
      {label}
      <select
        name={name}
        defaultValue={defaultStoreId ?? ""}
        className="field"
        required
      >
        {stores.map((store) => (
          <option key={store.id} value={store.id}>
            {store.name}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Loja para onde um novo registro vai, considerando o filtro ativo. */
export function useWriteStoreId() {
  const { writeStore, storeFilter, stores, consolidated } = useStore();
  if (consolidated && storeFilter !== "all") return storeFilter;
  return writeStore?.id ?? stores[0]?.id ?? null;
}
