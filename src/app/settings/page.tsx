"use client";

import { FormEvent, useState } from "react";
import { Building2, Check, CreditCard, KeyRound, LoaderCircle, MapPin, Plus, ShieldCheck, Store, UserCog, Users, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/components/AuthProvider";
import { useStore } from "@/components/StoreProvider";
import { supabase } from "@/lib/supabase";

export default function SettingsPage() {
  const { user } = useAuth();
  const { stores, currentStore, selectStore } = useStore();
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fullName = String(user?.user_metadata?.full_name ?? user?.email?.split("@")[0] ?? "Usuário");
  const initials = fullName.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");

  async function createStore(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !currentStore) return;
    const form = new FormData(event.currentTarget);
    setSaving(true); setError(null);
    const { data, error: createError } = await supabase.rpc("create_store_for_account", {
      p_account_id: currentStore.account_id,
      p_store_name: String(form.get("name") ?? ""),
      p_city: String(form.get("city") ?? "") || null,
      p_state: String(form.get("state") ?? "") || null
    });
    if (createError) { setError(createError.message); setSaving(false); return; }
    if (data) window.localStorage.setItem("nexwash:store-id", String(data));
    window.location.reload();
  }

  return <AppShell title="Configurações">
    <div className="grid gap-5 xl:grid-cols-[15rem_1fr]">
      <aside className="h-fit rounded-2xl border border-line bg-white p-2 shadow-soft">
        {[{ label: "Minha conta", icon: UserCog }, { label: "Lojas", icon: Store, active: true }, { label: "Usuários e acessos", icon: Users }, { label: "Segurança", icon: ShieldCheck }, { label: "Plano e cobrança", icon: CreditCard }].map((item) => <button key={item.label} className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-bold ${item.active ? "bg-wash-50 text-wash-800" : "text-slate-600 hover:bg-slate-50"}`}><item.icon size={18} />{item.label}</button>)}
      </aside>
      <div className="min-w-0 space-y-5">
        <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-soft">
          <div className="flex flex-col justify-between gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:p-5"><div><h2 className="text-lg font-extrabold">Suas lojas</h2><p className="text-sm text-slate-500">Cada unidade possui operação e dados independentes.</p></div><button onClick={() => setCreating(true)} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-wash-700 px-4 text-sm font-extrabold text-white"><Plus size={17} /> Nova loja</button></div>
          {creating ? <form onSubmit={createStore} className="m-4 rounded-2xl border border-wash-200 bg-wash-50 p-4 sm:m-5"><div className="flex items-center justify-between"><div><h3 className="font-extrabold">Cadastrar nova loja</h3><p className="text-xs text-slate-500">O catálogo inicial será criado automaticamente.</p></div><button type="button" onClick={() => setCreating(false)} className="grid h-9 w-9 place-items-center rounded-xl text-slate-500"><X size={18} /></button></div><div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_6rem_auto]"><input name="name" required placeholder="Nome da loja" className="field" /><input name="city" placeholder="Cidade" className="field" /><input name="state" maxLength={2} placeholder="UF" className="field uppercase" /> <button disabled={saving} className="flex min-h-12 items-center justify-center rounded-xl bg-wash-700 px-5 text-sm font-extrabold text-white disabled:opacity-60">{saving ? <LoaderCircle size={18} className="animate-spin" /> : "Criar loja"}</button></div>{error ? <p className="mt-3 text-sm font-semibold text-rose-700">{error}</p> : null}</form> : null}
          <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">{stores.map((storeItem) => {
            const active = storeItem.id === currentStore?.id;
            return <article key={storeItem.id} className={`rounded-2xl border p-4 ${active ? "border-wash-300 bg-wash-50/60" : "border-line"}`}><div className="flex items-start gap-3"><span className={`grid h-11 w-11 place-items-center rounded-xl ${active ? "bg-wash-700 text-white" : "bg-slate-100 text-slate-600"}`}><Building2 size={21} /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><strong>{storeItem.name}</strong>{active ? <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-[10px] font-bold text-wash-800">Loja ativa</span> : null}</div><p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><MapPin size={12} /> {[storeItem.city, storeItem.state].filter(Boolean).join(" · ") || "Local não informado"}</p><p className="mt-3 text-xs font-bold text-slate-600">Acesso autorizado</p></div></div>{!active ? <button onClick={() => selectStore(storeItem.id)} className="mt-4 w-full rounded-xl border border-line py-2 text-sm font-bold text-wash-700">Acessar esta loja</button> : <p className="mt-4 flex items-center justify-center gap-2 py-2 text-sm font-bold text-emerald-700"><Check size={16} /> Operação selecionada</p>}</article>;
          })}</div>
        </section>
        <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-soft"><div className="border-b border-line p-4 sm:p-5"><h2 className="text-lg font-extrabold">Minha conta</h2><p className="text-sm text-slate-500">Identidade vinculada ao acesso Supabase.</p></div><article className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:p-5"><span className="grid h-11 w-11 place-items-center rounded-full bg-wash-100 text-xs font-extrabold text-wash-800">{initials}</span><div className="min-w-0 flex-1"><strong className="block truncate">{fullName}</strong><p className="truncate text-sm text-slate-500">{user?.email}</p></div><div className="text-sm sm:text-right"><p className="font-bold text-slate-700">Conta ativa</p><p className="text-xs text-slate-500">{stores.length} {stores.length === 1 ? "loja acessível" : "lojas acessíveis"}</p></div></article></section>
        <div className="grid gap-5 lg:grid-cols-2"><section className="rounded-2xl border border-line bg-white p-5 shadow-soft"><span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><KeyRound size={20} /></span><h2 className="mt-4 text-lg font-extrabold">Segurança da conta</h2><p className="mt-1 text-sm text-slate-500">Autenticação e isolamento de dados protegidos pelo Supabase.</p><p className="mt-4 flex items-center gap-2 text-sm font-bold text-emerald-700"><Check size={16} /> Sessão segura</p></section><section className="rounded-2xl border border-line bg-white p-5 shadow-soft"><span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-50 text-violet-700"><CreditCard size={20} /></span><h2 className="mt-4 text-lg font-extrabold">NexWash</h2><p className="mt-1 text-sm text-slate-500">Estrutura multiloja habilitada para esta conta.</p></section></div>
      </div>
    </div>
  </AppShell>;
}
