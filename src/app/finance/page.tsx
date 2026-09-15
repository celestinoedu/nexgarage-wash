"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Banknote, CalendarRange, CreditCard, LoaderCircle, TrendingUp } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { DashboardCard } from "@/components/DashboardCard";
import { StoreFilterBar, StoreTag } from "@/components/StoreScope";
import { useStoreRows } from "@/hooks/useStoreRows";
import { brl } from "@/lib/utils";

type Transaction = { id: string; kind: "income" | "expense"; category: string; description: string; amount: number; due_date: string; paid_at: string | null; payment_method: string | null; created_at: string };
type Period = { start: string; end: string };

function isoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Mantém o mesmo ciclo da versão atual: dia 15 até dia 14 do mês seguinte.
function financialPeriod(reference = new Date()): Period {
  const start = new Date(reference.getFullYear(), reference.getMonth() - (reference.getDate() < 15 ? 1 : 0), 15);
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 14);
  return { start: isoDate(start), end: isoDate(end) };
}

function periodLabel(period: Period) {
  const format = (value: string) => new Intl.DateTimeFormat("pt-BR").format(new Date(`${value}T12:00:00`));
  return `${format(period.start)} a ${format(period.end)}`;
}

export default function FinancePage() {
  const [today] = useState(() => new Date());
  const currentPeriod = useMemo(() => financialPeriod(today), [today]);
  const [dateFrom, setDateFrom] = useState(currentPeriod.start);
  const [dateTo, setDateTo] = useState(currentPeriod.end);
  const { rows, loading, error, consolidated } = useStoreRows<Transaction>("financial_transactions", { select: "id,kind,category,description,amount,due_date,paid_at,payment_method,created_at", orderBy: "due_date" });

  const periods = useMemo(() => {
    const dates = rows.map((item) => item.due_date).filter(Boolean).sort();
    const first = financialPeriod(dates.length ? new Date(`${dates[0]}T12:00:00`) : today);
    const lastDate = dates.at(-1);
    const lastReference = lastDate ? new Date(Math.max(today.getTime(), new Date(`${lastDate}T12:00:00`).getTime())) : today;
    const last = financialPeriod(lastReference);
    const result: Period[] = [];
    let cursor = new Date(`${first.start}T12:00:00`);
    for (let guard = 0; isoDate(cursor) <= last.start && guard < 300; guard += 1) {
      result.push(financialPeriod(cursor));
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 15, 12);
    }
    return result.reverse();
  }, [rows, today]);

  const filteredRows = useMemo(() => rows.filter((item) => (!dateFrom || item.due_date >= dateFrom) && (!dateTo || item.due_date <= dateTo)), [dateFrom, dateTo, rows]);
  const paid = filteredRows.filter((item) => item.paid_at);
  const revenue = paid.filter((item) => item.kind === "income").reduce((sum, item) => sum + Number(item.amount), 0);
  const expenses = paid.filter((item) => item.kind === "expense").reduce((sum, item) => sum + Number(item.amount), 0);
  const pending = filteredRows.filter((item) => !item.paid_at).reduce((sum, item) => sum + Number(item.amount), 0);
  const overdue = filteredRows.filter((item) => !item.paid_at && new Date(`${item.due_date}T23:59:59`) < today).reduce((sum, item) => sum + Number(item.amount), 0);
  const selectedPeriod = `${dateFrom}:${dateTo}`;

  function selectPeriod(value: string) {
    const period = periods.find(({ start, end }) => `${start}:${end}` === value);
    if (!period) return;
    setDateFrom(period.start);
    setDateTo(period.end);
  }

  return <AppShell title="Financeiro">
    <StoreFilterBar />
    <section className="mb-5 rounded-2xl border border-line bg-white p-4 shadow-soft sm:p-5">
      <div className="flex items-center gap-2 text-sm font-extrabold text-slate-700"><CalendarRange size={18} className="text-wash-700" /> Período financeiro</div>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <label className="grid gap-1.5 text-xs font-bold text-slate-500">Ciclo (15 a 14)<select value={selectedPeriod} onChange={(event) => selectPeriod(event.target.value)} className="field">{!periods.some(({ start, end }) => `${start}:${end}` === selectedPeriod) ? <option value={selectedPeriod}>Período personalizado</option> : null}{periods.map((period) => <option key={period.start} value={`${period.start}:${period.end}`}>{periodLabel(period)}</option>)}</select></label>
        <label className="grid gap-1.5 text-xs font-bold text-slate-500">De<input required type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="field" /></label>
        <label className="grid gap-1.5 text-xs font-bold text-slate-500">Até<input required type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="field" /></label>
      </div>
    </section>
    {loading ? <div className="grid min-h-64 place-items-center text-wash-700"><LoaderCircle className="animate-spin" /></div> : error ? <p className="rounded-xl bg-rose-50 p-4 text-sm font-semibold text-rose-700">{error}</p> : <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardCard title="Receitas pagas" value={brl(revenue)} detail={periodLabel({ start: dateFrom, end: dateTo })} icon={Banknote} tone="success" />
        <DashboardCard title="Despesas pagas" value={brl(expenses)} detail={periodLabel({ start: dateFrom, end: dateTo })} icon={CreditCard} tone="danger" />
        <DashboardCard title="Saldo realizado" value={brl(revenue - expenses)} detail="receitas − despesas do período" icon={TrendingUp} tone={revenue >= expenses ? "success" : "danger"} />
        <DashboardCard title="Vencido" value={brl(overdue)} detail={`${brl(pending)} pendente no período`} icon={AlertTriangle} tone="warning" />
      </div>
      <section className="mt-5 overflow-hidden rounded-2xl border border-line bg-white shadow-soft">
        <div className="border-b border-line p-4 sm:p-5"><h2 className="text-lg font-extrabold">Movimentações do período</h2><p className="text-sm text-slate-500">{filteredRows.length} lançamentos {consolidated ? "das lojas no filtro atual" : "da loja selecionada"}</p></div>
        <div className="hidden grid-cols-[7rem_1fr_10rem_8rem_8rem] gap-4 border-b border-line bg-slate-50 px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-400 md:grid"><span>Vencimento</span><span>Descrição</span><span>Categoria</span><span>Status</span><span className="text-right">Valor</span></div>
        <div className="divide-y divide-line">{filteredRows.map((item) => {
          const isOverdue = !item.paid_at && new Date(`${item.due_date}T23:59:59`) < today;
          return <article key={item.id} className="grid gap-2 p-4 md:grid-cols-[7rem_1fr_10rem_8rem_8rem] md:items-center md:gap-4 md:px-5"><span className="text-sm font-semibold text-slate-500">{new Intl.DateTimeFormat("pt-BR").format(new Date(`${item.due_date}T12:00:00`))}</span><div className="min-w-0"><strong className="block truncate text-sm">{item.description}</strong><p className="text-xs text-slate-500">{item.payment_method ?? (item.kind === "income" ? "Receita" : "Despesa")}</p><StoreTag storeId={item.store_id} className="mt-1" /></div><span className="text-sm text-slate-600">{item.category}</span><span className={`w-fit rounded-full px-2.5 py-1 text-[10px] font-bold ${item.paid_at ? "bg-emerald-100 text-emerald-700" : isOverdue ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>{item.paid_at ? "Pago" : isOverdue ? "Vencido" : "Pendente"}</span><strong className={`text-sm md:text-right ${item.kind === "income" ? "text-emerald-700" : "text-rose-700"}`}>{item.kind === "expense" ? "− " : "+ "}{brl(Number(item.amount))}</strong></article>;
        })}{filteredRows.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">Nenhum lançamento neste período.</p> : null}</div>
      </section>
    </>}
  </AppShell>;
}
