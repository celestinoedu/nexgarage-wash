"use client";

import { FormEvent, useState } from "react";
import { Building2, LoaderCircle, Plus, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useStoreRows } from "@/hooks/useStoreRows";
import { supabase } from "@/lib/supabase";
import { brl } from "@/lib/utils";

type Partner = { id: string; name: string; phone: string | null; active: boolean; service_orders: { id: string; total: number; payment_status: string; created_at: string }[] };

export default function PartnersPage() {
  const { rows, loading, error, refresh, store } = useStoreRows<Partner>("partners", { select: "id,name,phone,active,service_orders(id,total,payment_status,created_at)", orderBy: "name", ascending: true });
  const [open, setOpen] = useState(false); const [saving, setSaving] = useState(false); const [formError, setFormError] = useState<string | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!supabase || !store) return; const form = new FormData(event.currentTarget); setSaving(true);
    const { error: createError } = await supabase.from("partners").insert({ store_id: store.id, name: String(form.get("name")), contact_name: String(form.get("contact") ?? "") || null, phone: String(form.get("phone") ?? "") || null, document: String(form.get("document") ?? "") || null });
    if (createError) { setFormError(createError.message); setSaving(false); return; } setOpen(false); setSaving(false); refresh();
  }
  return <AppShell title="Parceiros" action={<button onClick={() => setOpen(true)} className="hidden min-h-11 items-center gap-2 rounded-xl bg-wash-700 px-4 text-sm font-bold text-white sm:flex"><Plus size={17} /> Novo parceiro</button>}>
    <button onClick={() => setOpen(true)} className="mb-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-wash-700 text-sm font-bold text-white sm:hidden"><Plus size={17} /> Novo parceiro</button>
    {open ? <form onSubmit={submit} className="mb-4 rounded-2xl border border-wash-200 bg-white p-4 shadow-soft"><div className="flex justify-between"><div><h2 className="font-extrabold">Novo parceiro</h2><p className="text-sm text-slate-500">Concessionárias, locadoras e frotas.</p></div><button type="button" onClick={() => setOpen(false)}><X size={18} /></button></div><div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><input required name="name" className="field" placeholder="Empresa" /><input name="contact" className="field" placeholder="Contato" /><input name="phone" className="field" placeholder="Telefone" /><input name="document" className="field" placeholder="CNPJ/CPF" /></div>{formError ? <p className="mt-3 text-sm font-semibold text-rose-700">{formError}</p> : null}<button disabled={saving} className="mt-4 flex min-h-11 items-center justify-center rounded-xl bg-wash-700 px-5 text-sm font-extrabold text-white">{saving ? <LoaderCircle className="animate-spin" size={18} /> : "Salvar parceiro"}</button></form> : null}
    {loading ? <div className="grid min-h-48 place-items-center text-wash-700"><LoaderCircle className="animate-spin" /></div> : error ? <p className="rounded-xl bg-rose-50 p-4 text-sm font-semibold text-rose-700">{error}</p> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{rows.map((partner) => {
      const month = new Date().getMonth(); const thisMonth = partner.service_orders.filter((item) => new Date(item.created_at).getMonth() === month);
      const pending = partner.service_orders.filter((item) => item.payment_status !== "paid").reduce((sum, item) => sum + Number(item.total), 0);
      return <article key={partner.id} className="rounded-2xl border border-line bg-white p-5 shadow-soft"><span className="grid h-11 w-11 place-items-center rounded-xl bg-wash-50 text-wash-700"><Building2 size={21} /></span><h2 className="mt-4 font-extrabold">{partner.name}</h2><p className="mt-1 text-sm text-slate-500">{thisMonth.length} atendimentos neste mês</p><div className="mt-4 rounded-xl bg-slate-50 p-3"><p className="text-xs font-bold text-slate-500">Saldo pendente</p><strong className="text-lg">{brl(pending)}</strong></div>{partner.phone ? <p className="mt-4 text-sm text-slate-500">{partner.phone}</p> : null}</article>;
    })}</div>}
  </AppShell>;
}
