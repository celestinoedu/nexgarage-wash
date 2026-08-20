"use client";

import { BarChart3, Banknote, LoaderCircle, Sparkles, Users } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { DashboardCard } from "@/components/DashboardCard";
import { useStoreRows } from "@/hooks/useStoreRows";
import { brl } from "@/lib/utils";

type Order = { id: string; status: string; total: number; created_at: string; employees: { name: string } | null; service_order_items: { description: string; quantity: number; total: number }[] };
type Finance = { id: string; kind: string; amount: number; paid_at: string | null };

export default function ReportsPage() {
  const orders = useStoreRows<Order>("service_orders", { select: "id,status,total,created_at,employees(name),service_order_items(description,quantity,total)", orderBy: "created_at" });
  const finance = useStoreRows<Finance>("financial_transactions", { select: "id,kind,amount,paid_at", orderBy: "paid_at" });
  const delivered = orders.rows.filter((item) => item.status === "delivered");
  const revenues = finance.rows.filter((item) => item.kind === "income" && item.paid_at).reduce((sum, item) => sum + Number(item.amount), 0);
  const expenses = finance.rows.filter((item) => item.kind === "expense" && item.paid_at).reduce((sum, item) => sum + Number(item.amount), 0);
  const serviceCounts = new Map<string, { count: number; value: number }>();
  const employeeCounts = new Map<string, { count: number; value: number }>();
  delivered.forEach((order) => {
    order.service_order_items.forEach((item) => { const current = serviceCounts.get(item.description) ?? { count: 0, value: 0 }; current.count += Number(item.quantity); current.value += Number(item.total); serviceCounts.set(item.description, current); });
    const name = order.employees?.name ?? "Não atribuído"; const current = employeeCounts.get(name) ?? { count: 0, value: 0 }; current.count += 1; current.value += Number(order.total); employeeCounts.set(name, current);
  });
  const services = [...serviceCounts.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 10);
  const team = [...employeeCounts.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 10);
  const average = delivered.length ? delivered.reduce((sum, item) => sum + Number(item.total), 0) / delivered.length : 0;
  const loading = orders.loading || finance.loading;
  return <AppShell title="Relatórios">{loading ? <div className="grid min-h-64 place-items-center"><LoaderCircle className="animate-spin text-wash-700" /></div> : orders.error || finance.error ? <p className="rounded-xl bg-rose-50 p-4 text-sm font-semibold text-rose-700">{orders.error ?? finance.error}</p> : <>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><DashboardCard title="Atendimentos entregues" value={String(delivered.length)} icon={Sparkles} /><DashboardCard title="Ticket médio" value={brl(average)} icon={BarChart3} /><DashboardCard title="Receitas realizadas" value={brl(revenues)} icon={Banknote} tone="success" /><DashboardCard title="Resultado realizado" value={brl(revenues - expenses)} icon={Banknote} tone={revenues >= expenses ? "success" : "danger"} /></div>
    <div className="mt-5 grid gap-5 xl:grid-cols-2"><Ranking title="Serviços mais realizados" icon={Sparkles} rows={services.map(([name, data]) => ({ name, detail: `${data.count} realizações`, value: brl(data.value) }))} /><Ranking title="Produção por colaborador" icon={Users} rows={team.map(([name, data]) => ({ name, detail: `${data.count} atendimentos`, value: brl(data.value) }))} /></div>
  </>}</AppShell>;
}

function Ranking({ title, icon: Icon, rows }: { title: string; icon: typeof Sparkles; rows: { name: string; detail: string; value: string }[] }) {
  return <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-soft"><div className="flex items-center gap-3 border-b border-line p-5"><span className="grid h-10 w-10 place-items-center rounded-xl bg-wash-50 text-wash-700"><Icon size={20} /></span><h2 className="text-lg font-extrabold">{title}</h2></div>{rows.length ? <div className="divide-y divide-line">{rows.map((row, index) => <div key={row.name} className="grid grid-cols-[2rem_1fr_auto] items-center gap-3 p-4"><strong className="text-wash-700">{index + 1}</strong><div className="min-w-0"><strong className="block truncate text-sm">{row.name}</strong><p className="text-xs text-slate-500">{row.detail}</p></div><strong className="text-sm">{row.value}</strong></div>)}</div> : <p className="p-8 text-center text-sm text-slate-500">Ainda não há dados concluídos.</p>}</section>;
}
