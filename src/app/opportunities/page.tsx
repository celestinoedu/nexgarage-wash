"use client";

import { useState } from "react";
import { LoaderCircle, MessageCircle, Search, Target } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useStoreRows } from "@/hooks/useStoreRows";

type Opportunity = { customer_id: string; name: string; whatsapp: string | null; last_visit: string; days_since_last_visit: number };

export default function OpportunitiesPage() {
  const { rows, loading, error } = useStoreRows<Opportunity>("customer_return_opportunities", { select: "customer_id,name,whatsapp,last_visit,days_since_last_visit", orderBy: "days_since_last_visit" });
  const [query, setQuery] = useState("");
  const leads = rows.filter((item) => item.days_since_last_visit >= 15 && item.name.toLowerCase().includes(query.toLowerCase()));
  return <AppShell title="Oportunidades"><div className="rounded-2xl border border-line bg-white shadow-soft"><div className="border-b border-line p-4 sm:p-5"><div className="flex items-start gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-amber-50 text-amber-700"><Target size={21} /></span><div><h2 className="text-lg font-extrabold">Clientes para reconquistar</h2><p className="text-sm text-slate-500">Clientes há 15 dias ou mais sem retornar.</p></div></div><label className="relative mt-4 block"><Search className="absolute left-3 top-3.5 text-slate-400" size={18} /><input value={query} onChange={(e) => setQuery(e.target.value)} className="focus-ring min-h-11 w-full rounded-xl border border-line pl-10 pr-4 text-sm" placeholder="Buscar cliente" /></label></div>
    {loading ? <div className="grid h-48 place-items-center"><LoaderCircle className="animate-spin text-wash-700" /></div> : error ? <p className="m-4 rounded-xl bg-rose-50 p-4 text-sm font-semibold text-rose-700">{error}</p> : leads.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">Nenhuma oportunidade encontrada.</p> : <div className="divide-y divide-line">{leads.map((lead) => <article key={lead.customer_id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:p-5"><span className="grid h-11 w-11 place-items-center rounded-xl bg-wash-50 text-wash-700"><Target size={20} /></span><div className="min-w-0 flex-1"><strong>{lead.name}</strong><p className="text-sm text-slate-500">Última visita: {new Intl.DateTimeFormat("pt-BR").format(new Date(`${lead.last_visit}T12:00:00`))}</p></div><span className="w-fit rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">{lead.days_since_last_visit} dias</span>{lead.whatsapp ? <a href={`https://wa.me/55${lead.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="flex min-h-10 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 text-sm font-bold text-white"><MessageCircle size={17} /> WhatsApp</a> : null}</article>)}</div>}
  </div></AppShell>;
}
