"use client";

import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  CalendarPlus,
  Car,
  Clock3,
  Droplets,
  LoaderCircle,
  MessageCircle,
  Target,
  TrendingUp,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { DashboardCard } from "@/components/DashboardCard";
import { useAuth } from "@/components/AuthProvider";
import { useStoreRows } from "@/hooks/useStoreRows";
import { brl } from "@/lib/utils";

type Order = {
  id: string;
  order_number: number;
  status: string;
  total: number;
  created_at: string;
  delivered_at: string | null;
  customers: { name: string } | null;
  vehicles: { plate: string; make: string | null; model: string | null } | null;
  service_order_items: { description: string }[];
};
type Finance = {
  id: string;
  kind: string;
  amount: number;
  paid_at: string | null;
};
type Opportunity = {
  customer_id: string;
  name: string;
  whatsapp: string | null;
  days_since_last_visit: number;
};
const statusLabel: Record<string, string> = {
  waiting: "Aguardando",
  washing: "Lavagem",
  finishing: "Acabamento",
  ready: "Pronto",
  delivered: "Entregue",
  cancelled: "Cancelado",
};
const statusTone: Record<string, string> = {
  waiting: "bg-amber-100 text-amber-800",
  washing: "bg-sky-100 text-sky-800",
  finishing: "bg-violet-100 text-violet-800",
  ready: "bg-emerald-100 text-emerald-800",
  delivered: "bg-slate-100 text-slate-700",
  cancelled: "bg-rose-100 text-rose-800",
};

export default function DashboardPage() {
  const { user } = useAuth();
  const orders = useStoreRows<Order>("service_orders", {
    select:
      "id,order_number,status,total,created_at,delivered_at,customers(name),vehicles(plate,make,model),service_order_items(description)",
    orderBy: "created_at",
  });
  const finance = useStoreRows<Finance>("financial_transactions", {
    select: "id,kind,amount,paid_at",
    orderBy: "paid_at",
  });
  const opportunities = useStoreRows<Opportunity>(
    "customer_return_opportunities",
    {
      select: "customer_id,name,whatsapp,days_since_last_visit",
      orderBy: "days_since_last_visit",
    },
  );
  const todayKey = dateKey(new Date());
  const todayOrders = orders.rows.filter(
    (item) =>
      dateKey(new Date(item.created_at)) === todayKey &&
      item.status !== "cancelled",
  );
  const todayRevenue = finance.rows
    .filter(
      (item) =>
        item.kind === "income" &&
        item.paid_at &&
        dateKey(new Date(item.paid_at)) === todayKey,
    )
    .reduce((sum, item) => sum + Number(item.amount), 0);
  const average = todayOrders.length
    ? todayOrders.reduce((sum, item) => sum + Number(item.total), 0) /
      todayOrders.length
    : 0;
  const active = todayOrders.filter(
    (item) => !["delivered", "cancelled"].includes(item.status),
  ).length;
  const returnLeads = opportunities.rows.filter(
    (item) => item.days_since_last_visit >= 15,
  );
  const week = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    return {
      key: dateKey(date),
      label: new Intl.DateTimeFormat("pt-BR", { weekday: "short" })
        .format(date)
        .replace(".", ""),
    };
  }).map((day) => ({
    ...day,
    value: orders.rows.filter(
      (item) =>
        item.status === "delivered" &&
        item.delivered_at &&
        dateKey(new Date(item.delivered_at)) === day.key,
    ).length,
  }));
  const maxWeek = Math.max(...week.map((item) => item.value), 1);
  const name =
    user?.user_metadata?.full_name?.split(" ")[0] ??
    user?.email?.split("@")[0] ??
    "Olá";
  const loading = orders.loading || finance.loading;

  return (
    <AppShell
      title="Visão geral"
      action={
        <Link
          href="/orders/new"
          className="hidden min-h-11 items-center gap-2 rounded-xl bg-wash-700 px-4 text-sm font-extrabold text-white shadow-sm hover:bg-wash-800 sm:flex"
        >
          <CalendarPlus size={18} /> Novo atendimento
        </Link>
      }
    >
      <section className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold text-slate-500">
            {new Intl.DateTimeFormat("pt-BR", { dateStyle: "full" }).format(
              new Date(),
            )}
          </p>
          <h2 className="mt-1 text-2xl font-extrabold tracking-[-0.04em] text-ink">
            Olá, {name}!
          </h2>
        </div>
        <p className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
          <span className="h-2 w-2 rounded-full bg-emerald-500" /> Dados em
          tempo real
        </p>
      </section>
      {loading ? (
        <div className="grid min-h-64 place-items-center text-wash-700">
          <LoaderCircle className="animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <DashboardCard
              title="Faturamento hoje"
              value={brl(todayRevenue)}
              detail="Receitas pagas nesta loja"
              icon={Banknote}
              tone="success"
            />
            <DashboardCard
              title="Atendimentos hoje"
              value={String(todayOrders.length)}
              detail={`${active} em andamento`}
              icon={Droplets}
            />
            <DashboardCard
              title="Ticket médio"
              value={brl(average)}
              detail="Média dos atendimentos de hoje"
              icon={TrendingUp}
            />
            <DashboardCard
              title="Clientes para retornar"
              value={String(returnLeads.length)}
              detail="Há 15 dias ou mais"
              icon={Target}
              tone="warning"
            />
          </div>
          <div className="mt-5 grid gap-5 xl:grid-cols-[1.45fr_0.55fr]">
            <section className="rounded-2xl border border-line bg-white p-4 shadow-soft sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-extrabold">
                    Movimento da semana
                  </h2>
                  <p className="text-sm text-slate-500">
                    Atendimentos entregues por dia
                  </p>
                </div>
                <strong className="text-sm text-wash-700">
                  {week.reduce((sum, item) => sum + item.value, 0)} no total
                </strong>
              </div>
              <div className="mt-7 flex h-44 items-end gap-2 sm:gap-4">
                {week.map((item) => (
                  <div
                    key={item.key}
                    className="flex h-full flex-1 flex-col items-center justify-end gap-2"
                  >
                    <strong className="text-[10px] text-wash-700">
                      {item.value || ""}
                    </strong>
                    <div
                      className="w-full max-w-12 rounded-t-lg bg-gradient-to-t from-wash-700 to-cyan-300"
                      style={{
                        height: `${Math.max((item.value / maxWeek) * 80, item.value ? 8 : 2)}%`,
                      }}
                    />
                    <span className="text-[11px] font-bold capitalize text-slate-500">
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </section>
            <section className="rounded-2xl bg-gradient-to-br from-wash-950 to-wash-700 p-5 text-white shadow-float">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/10 text-cyan-200">
                <Clock3 size={22} />
              </span>
              <p className="mt-5 text-sm font-semibold text-sky-200">
                Fila atual
              </p>
              <strong className="mt-1 block text-4xl font-extrabold">
                {active}
              </strong>
              <p className="mt-2 text-sm leading-relaxed text-sky-100">
                atendimentos precisam da atenção da equipe nesta loja.
              </p>
              <Link
                href="/orders"
                className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-cyan-200"
              >
                Ver fila <ArrowRight size={16} />
              </Link>
            </section>
          </div>
          <div className="mt-5 grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
            <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-soft">
              <div className="flex items-center justify-between border-b border-line px-4 py-4 sm:px-5">
                <div>
                  <h2 className="text-lg font-extrabold">
                    Atendimentos recentes
                  </h2>
                  <p className="text-sm text-slate-500">
                    Últimos registros desta loja
                  </p>
                </div>
                <Link
                  href="/orders"
                  className="text-sm font-bold text-wash-700"
                >
                  Ver todos
                </Link>
              </div>
              <div className="divide-y divide-line">
                {orders.rows.slice(0, 5).map((item) => (
                  <Link
                    href={`/orders/detail?id=${item.id}`}
                    key={item.id}
                    className="grid gap-3 px-4 py-4 sm:grid-cols-[1fr_auto] sm:items-center sm:px-5"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <strong className="text-sm text-wash-800">
                          AT-{String(item.order_number).padStart(4, "0")}
                        </strong>
                        <span
                          className={`rounded-full px-2 py-1 text-[10px] font-bold ${statusTone[item.status]}`}
                        >
                          {statusLabel[item.status]}
                        </span>
                      </div>
                      <p className="mt-1 truncate font-bold">
                        {item.vehicles
                          ? `${[item.vehicles.make, item.vehicles.model].filter(Boolean).join(" ")} · ${item.vehicles.plate}`
                          : "Atendimento"}
                      </p>
                      <p className="truncate text-sm text-slate-500">
                        {item.customers?.name ?? "Cliente não informado"} ·{" "}
                        {item.service_order_items
                          .map((service) => service.description)
                          .join(" + ")}
                      </p>
                    </div>
                    <strong className="text-sm">
                      {brl(Number(item.total))}
                    </strong>
                  </Link>
                ))}
              </div>
            </section>
            <section className="rounded-2xl border border-line bg-white p-4 shadow-soft sm:p-5">
              <h2 className="text-lg font-extrabold">Oportunidades</h2>
              <p className="text-sm text-slate-500">
                Clientes prontos para voltar
              </p>
              <div className="mt-4 space-y-3">
                {returnLeads.slice(0, 3).map((lead) => (
                  <div
                    key={lead.customer_id}
                    className="flex items-center gap-3 rounded-xl bg-slate-50 p-3"
                  >
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-white text-wash-700">
                      <Car size={17} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <strong className="block truncate text-sm">
                        {lead.name}
                      </strong>
                      <p className="text-xs text-slate-500">
                        {lead.days_since_last_visit} dias sem retornar
                      </p>
                    </div>
                    {lead.whatsapp ? (
                      <a
                        href={`https://wa.me/55${lead.whatsapp.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-100 text-emerald-700"
                      >
                        <MessageCircle size={17} />
                      </a>
                    ) : null}
                  </div>
                ))}
              </div>
              <Link
                href="/opportunities"
                className="mt-4 flex items-center justify-center rounded-xl border border-wash-200 py-2.5 text-sm font-bold text-wash-700"
              >
                Ver oportunidades
              </Link>
            </section>
          </div>
        </>
      )}
    </AppShell>
  );
}

function dateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}
