"use client";

import { FormEvent, useState } from "react";
import { Car, LoaderCircle, Plus, Search, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useStoreRows } from "@/hooks/useStoreRows";
import { supabase } from "@/lib/supabase";

type Vehicle = { id: string; plate: string; make: string | null; model: string | null; color: string | null; size: string | null; customers: { name: string } | null };
type Customer = { id: string; name: string };

export default function VehiclesPage() {
  const vehicles = useStoreRows<Vehicle>("vehicles", { select: "id,plate,make,model,color,size,customers(name)", orderBy: "plate", ascending: true });
  const customers = useStoreRows<Customer>("customers", { select: "id,name", orderBy: "name", ascending: true });
  const [query, setQuery] = useState(""); const [open, setOpen] = useState(false); const [saving, setSaving] = useState(false); const [formError, setFormError] = useState<string | null>(null);
  const filtered = vehicles.rows.filter((item) => `${item.plate} ${item.make} ${item.model} ${item.customers?.name}`.toLowerCase().includes(query.toLowerCase()));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!supabase || !vehicles.store) return;
    const form = new FormData(event.currentTarget); setSaving(true); setFormError(null);
    const { error } = await supabase.from("vehicles").insert({ store_id: vehicles.store.id, customer_id: String(form.get("customer_id")), plate: String(form.get("plate")).trim().toUpperCase(), make: String(form.get("make") ?? "") || null, model: String(form.get("model") ?? "") || null, color: String(form.get("color") ?? "") || null, size: String(form.get("size") ?? "") || null });
    if (error) { setFormError(error.message); setSaving(false); return; }
    event.currentTarget.reset(); setOpen(false); setSaving(false); vehicles.refresh();
  }

  return <AppShell title="Veículos" action={<button onClick={() => setOpen(true)} className="hidden min-h-11 items-center gap-2 rounded-xl bg-wash-700 px-4 text-sm font-bold text-white sm:flex"><Plus size={17} /> Novo veículo</button>}>
    <button onClick={() => setOpen(true)} className="mb-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-wash-700 text-sm font-bold text-white sm:hidden"><Plus size={17} /> Novo veículo</button>
    {open ? <form onSubmit={submit} className="mb-4 rounded-2xl border border-wash-200 bg-white p-4 shadow-soft"><div className="flex justify-between"><div><h2 className="font-extrabold">Novo veículo</h2><p className="text-sm text-slate-500">Vincule o veículo a um cliente desta loja.</p></div><button type="button" onClick={() => setOpen(false)}><X size={18} /></button></div><div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3"><select name="customer_id" required className="field"><option value="">Selecione o cliente</option>{customers.rows.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><input name="plate" required className="field uppercase" placeholder="Placa" /><input name="make" className="field" placeholder="Marca" /><input name="model" className="field" placeholder="Modelo" /><input name="color" className="field" placeholder="Cor" /><select name="size" className="field"><option value="">Porte</option><option>P</option><option>M</option><option>G</option><option>Utilitário</option></select></div>{formError ? <p className="mt-3 text-sm font-semibold text-rose-700">{formError}</p> : null}<button disabled={saving} className="mt-4 flex min-h-11 items-center justify-center rounded-xl bg-wash-700 px-5 text-sm font-extrabold text-white">{saving ? <LoaderCircle size={18} className="animate-spin" /> : "Salvar veículo"}</button></form> : null}
    <div className="mb-4 rounded-2xl border border-line bg-white p-4 shadow-soft"><label className="relative block"><Search className="absolute left-3 top-3.5 text-slate-400" size={18} /><input value={query} onChange={(e) => setQuery(e.target.value)} className="focus-ring min-h-11 w-full rounded-xl border border-line pl-10 pr-4 text-sm" placeholder="Buscar por placa, modelo ou cliente" /></label></div>
    {vehicles.loading ? <div className="grid min-h-48 place-items-center text-wash-700"><LoaderCircle className="animate-spin" /></div> : vehicles.error ? <p className="rounded-xl bg-rose-50 p-4 text-sm font-semibold text-rose-700">{vehicles.error}</p> : <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{filtered.map((vehicle) => <article key={vehicle.id} className="rounded-2xl border border-line bg-white p-5 shadow-soft"><div className="flex items-start justify-between"><span className="grid h-11 w-11 place-items-center rounded-xl bg-wash-50 text-wash-700"><Car size={21} /></span>{vehicle.size ? <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">Porte {vehicle.size}</span> : null}</div><h2 className="mt-4 text-lg font-extrabold">{[vehicle.make, vehicle.model].filter(Boolean).join(" ") || "Veículo"}</h2><p className="font-bold text-wash-800">{vehicle.plate}</p><p className="mt-2 text-sm text-slate-500">{[vehicle.color, vehicle.customers?.name].filter(Boolean).join(" · ")}</p></article>)}</div>}
  </AppShell>;
}
