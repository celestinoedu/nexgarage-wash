"use client";

import { AlertTriangle, Banknote, CreditCard, LoaderCircle, TrendingUp } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { DashboardCard } from "@/components/DashboardCard";
import { useStoreRows } from "@/hooks/useStoreRows";
import { brl } from "@/lib/utils";

type Transaction = { id: string; kind: "income" | "expense"; category: string; description: string; amount: number; due_date: string; paid_at: string | null; payment_method: string | null; created_at: string };

export default function FinancePage() {
  const { rows, loading, error } = useStoreRows<Transaction>("financial_transactions", { select: "id,kind,category,description,amount,due_date,paid_at,payment_method,created_at", orderBy: "due_date" });
  const paid = rows.filter((item) => item.paid_at);
  const revenue = paid.filter((item) => item.kind === "income").reduce((sum, item) => sum + Number(item.amount), 0);
  const expenses = paid.filter((item) => item.kind === "expense").reduce((sum, item) => sum + Number(item.amount), 0);
  const pending = rows.filter((item) => !item.paid_at).reduce((sum, item) => sum + Number(item.amount), 0);
  const overdue = rows.filter((item) => !item.paid_at && new Date(`${item.due_date}T23:59:59`) < new Date()).reduce((sum, item) => sum + Number(item.amount), 0);

  return <AppShell title="Financeiro">
    {loading ? <div className="grid min-h-64 place-items-center text-wash-700"><LoaderCircle className="animate-spin" /></div> : error ? <p className="rounded-xl bg-rose-50 p-4 text-sm font-semibold text-rose-700">{error}</p> : <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardCard title="Receitas pagas" value={brl(revenue)} icon={Banknote} tone="success" />
        <DashboardCard title="Despesas pagas" value={brl(expenses)} icon={CreditCard} tone="danger" />
        <DashboardCard title="Saldo realizado" value={brl(revenue - expenses)} icon={TrendingUp} tone={revenue >= expenses ? "success" : "danger"} />
        <DashboardCard title="Vencido" value={brl(overdue)} detail={`${brl(pending)} pendente no total`} icon={AlertTriangle} tone="warning" />
      </div>
      <section className="mt-5 overflow-hidden rounded-2xl border border-line bg-white shadow-soft">
        <div className="border-b border-line p-4 sm:p-5"><h2 className="text-lg font-extrabold">Movimentações</h2><p className="text-sm text-slate-500">{rows.length} lançamentos da loja selecionada</p></div>
        <div className="hidden grid-cols-[7rem_1fr_10rem_8rem_8rem] gap-4 border-b border-line bg-slate-50 px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-400 md:grid"><span>Vencimento</span><span>Descrição</span><span>Categoria</span><span>Status</span><span className="text-right">Valor</span></div>
        <div className="divide-y divide-line">{rows.map((item) => {
          const isOverdue = !item.paid_at && new Date(`${item.due_date}T23:59:59`) < new Date();
          return <article key={item.id} className="grid gap-2 p-4 md:grid-cols-[7rem_1fr_10rem_8rem_8rem] md:items-center md:gap-4 md:px-5"><span className="text-sm font-semibold text-slate-500">{new Intl.DateTimeFormat("pt-BR").format(new Date(`${item.due_date}T12:00:00`))}</span><div className="min-w-0"><strong className="block truncate text-sm">{item.description}</strong><p className="text-xs text-slate-500">{item.payment_method ?? (item.kind === "income" ? "Receita" : "Despesa")}</p></div><span className="text-sm text-slate-600">{item.category}</span><span className={`w-fit rounded-full px-2.5 py-1 text-[10px] font-bold ${item.paid_at ? "bg-emerald-100 text-emerald-700" : isOverdue ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>{item.paid_at ? "Pago" : isOverdue ? "Vencido" : "Pendente"}</span><strong className={`text-sm md:text-right ${item.kind === "income" ? "text-emerald-700" : "text-rose-700"}`}>{item.kind === "expense" ? "− " : "+ "}{brl(Number(item.amount))}</strong></article>;
        })}</div>
      </section>
    </>}
  </AppShell>;
}
