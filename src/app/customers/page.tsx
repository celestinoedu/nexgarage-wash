"use client";

import { FormEvent, useState } from "react";
import { Car, LoaderCircle, MessageCircle, Plus, Search, UserRound, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useStoreRows } from "@/hooks/useStoreRows";
import { supabase } from "@/lib/supabase";

type Customer = { id: string; name: string; whatsapp: string | null; phone: string | null; vehicles: { id: string; plate: string; model: string | null }[] };

export default function CustomersPage() {
  const { rows, loading, error, refresh, store } = useStoreRows<Customer>("customers", { select: "id,name,whatsapp,phone,vehicles(id,plate,model)", orderBy: "name", ascending: true });
  const [query, setQuery] = useState(""); const [open, setOpen] = useState(false); const [saving, setSaving] = useState(false); const [formError, setFormError] = useState<string | null>(null);
  const filtered = rows.filter((item) => `${item.name} ${item.phone} ${item.whatsapp} ${item.vehicles.map((vehicle) => vehicle.plate).join(" ")}`.toLowerCase().includes(query.toLowerCase()));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!supabase || !store) return;
    const form = new FormData(event.currentTarget); setSaving(true); setFormError(null);
    const { error: createError } = await supabase.from("customers").insert({ store_id: store.id, name: String(form.get("name")), whatsapp: String(form.get("whatsapp") ?? "") || null, phone: String(form.get("phone") ?? "") || null, email: String(form.get("email") ?? "") || null });
    if (createError) { setFormError(createError.message); setSaving(false); return; }
    event.currentTarget.reset(); setOpen(false); setSaving(false); refresh();
  }

  return <AppShell title="Clientes" action={<button onClick={() => setOpen(true)} className="hidden min-h-11 items-center gap-2 rounded-xl bg-wash-700 px-4 text-sm font-bold text-white sm:flex"><Plus size={17} /> Novo cliente</button>}>
    <button onClick={() => setOpen(true)} className="mb-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-wash-700 text-sm font-bold text-white sm:hidden"><Plus size={17} /> Novo cliente</button>
    {open ? <form onSubmit={submit} className="mb-4 rounded-2xl border border-wash-200 bg-white p-4 shadow-soft"><div className="flex justify-between"><div><h2 className="font-extrabold">Novo cliente</h2><p className="text-sm text-slate-500">Cadastre os dados básicos; o veículo pode ser incluído em seguida.</p></div><button type="button" onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center"><X size={18} /></button></div><div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><input className="field" name="name" required placeholder="Nome completo" /><input className="field" name="whatsapp" placeholder="WhatsApp" /><input className="field" name="phone" placeholder="Telefone alternativo" /><input className="field" name="email" type="email" placeholder="E-mail" /></div>{formError ? <p className="mt-3 text-sm font-semibold text-rose-700">{formError}</p> : null}<button disabled={saving} className="mt-4 flex min-h-11 items-center justify-center rounded-xl bg-wash-700 px-5 text-sm font-extrabold text-white">{saving ? <LoaderCircle size={18} className="animate-spin" /> : "Salvar cliente"}</button></form> : null}
    <div className="rounded-2xl border border-line bg-white shadow-soft"><div className="border-b border-line p-4 sm:p-5"><label className="relative block"><Search className="absolute left-3 top-3.5 text-slate-400" size={18} /><input value={query} onChange={(e) => setQuery(e.target.value)} className="focus-ring min-h-11 w-full rounded-xl border border-line pl-10 pr-4 text-sm" placeholder="Buscar cliente, telefone ou placa" /></label></div>
      {loading ? <Loading /> : error ? <ErrorMessage text={error} /> : filtered.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">Nenhum cliente encontrado.</p> : <div className="divide-y divide-line">{filtered.map((customer) => <article key={customer.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:p-5"><span className="grid h-11 w-11 place-items-center rounded-full bg-wash-100 text-wash-800"><UserRound size={19} /></span><div className="min-w-0 flex-1"><strong>{customer.name}</strong><p className="text-sm text-slate-500">{customer.whatsapp ?? customer.phone ?? "Sem telefone"}</p><div className="mt-2 flex flex-wrap gap-2">{customer.vehicles.map((vehicle) => <span key={vehicle.id} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600"><Car size={12} /> {vehicle.plate} · {vehicle.model}</span>)}</div></div>{customer.whatsapp || customer.phone ? <a href={`https://wa.me/55${(customer.whatsapp ?? customer.phone ?? "").replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="flex min-h-10 items-center justify-center gap-2 rounded-xl bg-emerald-100 px-3 text-sm font-bold text-emerald-700"><MessageCircle size={17} /> WhatsApp</a> : null}</article>)}</div>}
    </div>
  </AppShell>;
}
function Loading() { return <div className="grid min-h-48 place-items-center text-wash-700"><LoaderCircle className="animate-spin" /></div>; }
function ErrorMessage({ text }: { text: string }) { return <p className="m-4 rounded-xl bg-rose-50 p-4 text-sm font-semibold text-rose-700">{text}</p>; }
