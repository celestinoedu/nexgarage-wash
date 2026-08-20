"use client";

import { FormEvent, useState } from "react";
import { Clock3, LoaderCircle, Plus, Sparkles, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useStoreRows } from "@/hooks/useStoreRows";
import { supabase } from "@/lib/supabase";
import { brl } from "@/lib/utils";

type Service = { id: string; name: string; category: string | null; base_price: number; estimated_minutes: number | null; active: boolean };

export default function ServicesPage() {
  const { rows, loading, error, refresh, store } = useStoreRows<Service>("services", { select: "id,name,category,base_price,estimated_minutes,active", orderBy: "name", ascending: true });
  const [open, setOpen] = useState(false); const [saving, setSaving] = useState(false); const [formError, setFormError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!supabase || !store) return;
    const form = new FormData(event.currentTarget); setSaving(true); setFormError(null);
    const { error: createError } = await supabase.from("services").insert({ store_id: store.id, name: String(form.get("name")), category: String(form.get("category") ?? "") || null, description: String(form.get("description") ?? "") || null, base_price: Number(form.get("price")), estimated_minutes: Number(form.get("minutes")) || null });
    if (createError) { setFormError(createError.message); setSaving(false); return; }
    event.currentTarget.reset(); setOpen(false); setSaving(false); refresh();
  }

  async function toggle(service: Service) {
    if (!supabase) return; await supabase.from("services").update({ active: !service.active }).eq("id", service.id); refresh();
  }

  return <AppShell title="Serviços" action={<button onClick={() => setOpen(true)} className="hidden min-h-11 items-center gap-2 rounded-xl bg-wash-700 px-4 text-sm font-bold text-white sm:flex"><Plus size={17} /> Novo serviço</button>}>
    <button onClick={() => setOpen(true)} className="mb-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-wash-700 text-sm font-bold text-white sm:hidden"><Plus size={17} /> Novo serviço</button>
    {open ? <form onSubmit={submit} className="mb-4 rounded-2xl border border-wash-200 bg-white p-4 shadow-soft"><div className="flex justify-between"><div><h2 className="font-extrabold">Novo serviço</h2><p className="text-sm text-slate-500">O valor poderá ser ajustado no catálogo da loja.</p></div><button type="button" onClick={() => setOpen(false)}><X size={18} /></button></div><div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><input name="name" required className="field" placeholder="Nome do serviço" /><input name="category" className="field" placeholder="Categoria" /><input name="price" required type="number" min="0" step="0.01" className="field" placeholder="Preço" /><input name="minutes" type="number" min="1" className="field" placeholder="Duração em minutos" /><textarea name="description" className="focus-ring min-h-20 rounded-xl border border-line p-3 sm:col-span-2 xl:col-span-4" placeholder="Descrição opcional" /></div>{formError ? <p className="mt-3 text-sm font-semibold text-rose-700">{formError}</p> : null}<button disabled={saving} className="mt-4 flex min-h-11 items-center justify-center rounded-xl bg-wash-700 px-5 text-sm font-extrabold text-white">{saving ? <LoaderCircle size={18} className="animate-spin" /> : "Salvar serviço"}</button></form> : null}
    {loading ? <div className="grid min-h-48 place-items-center text-wash-700"><LoaderCircle className="animate-spin" /></div> : error ? <p className="rounded-xl bg-rose-50 p-4 text-sm font-semibold text-rose-700">{error}</p> : <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{rows.map((service) => <article key={service.id} className="rounded-2xl border border-line bg-white p-5 shadow-soft"><div className="flex items-start justify-between"><span className="grid h-11 w-11 place-items-center rounded-xl bg-cyan-50 text-wash-700"><Sparkles size={21} /></span><button onClick={() => void toggle(service)} className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${service.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{service.active ? "Ativo" : "Inativo"}</button></div><p className="mt-4 text-xs font-bold uppercase tracking-wider text-wash-700">{service.category ?? "Serviço"}</p><h2 className="mt-1 text-lg font-extrabold">{service.name}</h2>{service.estimated_minutes ? <p className="mt-3 flex items-center gap-1 text-sm text-slate-500"><Clock3 size={15} /> Aproximadamente {service.estimated_minutes} min</p> : null}<strong className="mt-4 block text-xl">{brl(Number(service.base_price))}</strong></article>)}</div>}
  </AppShell>;
}
