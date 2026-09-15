"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarPlus,
  Car,
  Clock3,
  Filter,
  LoaderCircle,
  Search,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { StoreFilterBar, StoreTag } from "@/components/StoreScope";
import { useStoreRows } from "@/hooks/useStoreRows";
import { brl } from "@/lib/utils";

type OrderRow = {
  id: string;
  order_number: number;
  kind: string;
  status: string;
  payment_status: string;
  total: number;
  created_at: string;
  customers: { name: string } | null;
  vehicles: { plate: string; make: string | null; model: string | null } | null;
  partners: { name: string } | null;
  employees: { name: string } | null;
  service_order_items: { description: string }[];
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
const kindLabel: Record<string, string> = {
  walk_in: "Particular",
  partner: "Parceiro",
  scheduled: "Agendado",
};

// Data e hora do atendimento, no formato curto usado nas listagens.
function dateTimeBR(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function OrdersPage() {
  const [query, setQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [status, setStatus] = useState("all");
  const [kind, setKind] = useState("all");
  const [payment, setPayment] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const { rows, loading, error } = useStoreRows<OrderRow>("service_orders", {
    select:
      "id,order_number,kind,status,payment_status,total,created_at,customers(name),vehicles(plate,make,model),partners(name),employees(name),service_order_items(description)",
    orderBy: "created_at",
  });
  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
    return rows.filter((order) => {
      const createdDate = order.created_at.slice(0, 10);
      const searchText = [
        `AT-${String(order.order_number).padStart(4, "0")}`,
        order.order_number,
        order.customers?.name,
        order.vehicles?.plate,
        order.vehicles?.make,
        order.vehicles?.model,
        order.partners?.name,
        order.employees?.name,
        ...order.service_order_items.map((item) => item.description),
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("pt-BR");
      return (
        (!normalizedQuery || searchText.includes(normalizedQuery)) &&
        (status === "all" || order.status === status) &&
        (kind === "all" || order.kind === kind) &&
        (payment === "all" || order.payment_status === payment) &&
        (!dateFrom || createdDate >= dateFrom) &&
        (!dateTo || createdDate <= dateTo)
      );
    });
  }, [dateFrom, dateTo, kind, payment, query, rows, status]);
  const hasFilters =
    status !== "all" ||
    kind !== "all" ||
    payment !== "all" ||
    Boolean(dateFrom) ||
    Boolean(dateTo);

  function clearFilters() {
    setStatus("all");
    setKind("all");
    setPayment("all");
    setDateFrom("");
    setDateTo("");
  }

  return (
    <AppShell
      title="Atendimentos"
      action={
        <Link
          href="/orders/new"
          className="hidden min-h-11 items-center gap-2 rounded-xl bg-wash-700 px-4 text-sm font-extrabold text-white sm:flex"
        >
          <CalendarPlus size={18} /> Novo atendimento
        </Link>
      }
    >
      <StoreFilterBar />
      <div className="mb-4 grid gap-3 rounded-2xl border border-line bg-white p-4 shadow-soft sm:grid-cols-[1fr_auto]">
        <label className="relative">
          <Search
            size={18}
            className="absolute left-3 top-3.5 text-slate-400"
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="focus-ring min-h-11 w-full rounded-xl border border-line pl-10 pr-4 text-sm"
            placeholder="Buscar por cliente, placa ou atendimento"
          />
        </label>
        <button
          type="button"
          onClick={() => setFiltersOpen((open) => !open)}
          aria-expanded={filtersOpen}
          className={`flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-bold ${hasFilters ? "border-wash-300 bg-wash-50 text-wash-800" : "border-line text-slate-600"}`}
        >
          <Filter size={17} /> Filtros{hasFilters ? " ativos" : ""}
        </button>
        {filtersOpen ? (
          <div className="grid gap-3 border-t border-line pt-4 sm:col-span-2 sm:grid-cols-2 lg:grid-cols-5">
            <label className="grid gap-1.5 text-xs font-bold text-slate-500">
              Status
              <select value={status} onChange={(event) => setStatus(event.target.value)} className="field">
                <option value="all">Todos</option>
                {Object.entries(statusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="grid gap-1.5 text-xs font-bold text-slate-500">
              Tipo
              <select value={kind} onChange={(event) => setKind(event.target.value)} className="field">
                <option value="all">Todos</option>
                {Object.entries(kindLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="grid gap-1.5 text-xs font-bold text-slate-500">
              Pagamento
              <select value={payment} onChange={(event) => setPayment(event.target.value)} className="field">
                <option value="all">Todos</option>
                <option value="paid">Pago</option>
                <option value="pending">Pendente</option>
              </select>
            </label>
            <label className="grid gap-1.5 text-xs font-bold text-slate-500">
              De
              <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="field" />
            </label>
            <label className="grid gap-1.5 text-xs font-bold text-slate-500">
              Até
              <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="field" />
            </label>
            {hasFilters ? <button type="button" onClick={clearFilters} className="min-h-10 rounded-xl text-sm font-bold text-wash-700 sm:col-span-2 lg:col-span-5 lg:justify-self-end">Limpar filtros</button> : null}
          </div>
        ) : null}
      </div>
      {loading ? (
        <div className="grid min-h-48 place-items-center text-wash-700">
          <LoaderCircle className="animate-spin" />
        </div>
      ) : error ? (
        <p className="rounded-xl bg-rose-50 p-4 text-sm font-semibold text-rose-700">
          {error}
        </p>
      ) : (
        <div className="grid gap-3">
          <p className="text-sm text-slate-500">{filteredRows.length} de {rows.length} atendimentos</p>
          {filteredRows.map((order) => (
            <Link
              href={`/orders/detail?id=${order.id}`}
              key={order.id}
              className="grid gap-3 rounded-2xl border border-line bg-white p-4 shadow-soft transition hover:border-wash-300 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:p-5"
            >
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-wash-50 text-wash-700">
                <Car size={22} />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <strong className="text-wash-800">
                    AT-{String(order.order_number).padStart(4, "0")}
                  </strong>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${statusTone[order.status]}`}
                  >
                    {statusLabel[order.status]}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">
                    {kindLabel[order.kind]}
                  </span>
                  <StoreTag storeId={order.store_id} />
                  <span className="text-xs font-semibold text-slate-500">
                    {dateTimeBR(order.created_at)}
                  </span>
                </div>
                <h2 className="mt-1 truncate font-extrabold">
                  {order.vehicles
                    ? `${[order.vehicles.make, order.vehicles.model].filter(Boolean).join(" ")} · ${order.vehicles.plate}`
                    : (order.partners?.name ?? "Atendimento")}
                </h2>
                <p className="truncate text-sm text-slate-500">
                  {order.customers?.name ?? order.partners?.name} ·{" "}
                  {order.service_order_items
                    .map((item) => item.description)
                    .join(" + ")}
                </p>
                <p className="mt-2 flex items-center gap-1 text-xs text-slate-400">
                  <Clock3 size={13} /> Responsável:{" "}
                  {order.employees?.name ?? "Não atribuído"}
                </p>
              </div>
              <div className="sm:text-right">
                <strong>{brl(Number(order.total))}</strong>
                <p
                  className={`mt-1 text-xs font-bold ${order.payment_status === "paid" ? "text-emerald-700" : "text-amber-700"}`}
                >
                  {order.payment_status === "paid" ? "Pago" : "Pendente"}
                </p>
              </div>
            </Link>
          ))}
          {filteredRows.length === 0 ? <p className="rounded-2xl border border-dashed border-line bg-white p-8 text-center text-sm text-slate-500">Nenhum atendimento encontrado com os filtros selecionados.</p> : null}
        </div>
      )}
    </AppShell>
  );
}
