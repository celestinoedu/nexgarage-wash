"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Car,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  LoaderCircle,
  Sparkles,
  UserRound,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useStore } from "@/components/StoreProvider";
import { supabase } from "@/lib/supabase";
import { brl } from "@/lib/utils";

type Order = {
  id: string;
  order_number: number;
  kind: string;
  status: string;
  payment_status: string;
  payment_method: string | null;
  total: number;
  discount: number;
  notes: string | null;
  created_at: string;
  customers: {
    name: string;
    whatsapp: string | null;
    phone: string | null;
  } | null;
  vehicles: {
    plate: string;
    make: string | null;
    model: string | null;
    color: string | null;
    size: string | null;
  } | null;
  partners: { name: string; phone: string | null } | null;
  employees: { name: string; role_name: string | null } | null;
  service_order_items: {
    id: string;
    description: string;
    quantity: number;
    unit_price: number;
    total: number;
  }[];
};

const statuses = [
  ["waiting", "Aguardando"],
  ["washing", "Lavagem"],
  ["finishing", "Acabamento"],
  ["ready", "Pronto"],
  ["delivered", "Entregue"],
  ["cancelled", "Cancelado"],
] as const;
const kindLabel: Record<string, string> = {
  walk_in: "Particular",
  partner: "Parceiro",
  scheduled: "Agendado",
};

export default function OrderDetailRoute() {
  return (
    <Suspense
      fallback={
        <AppShell title="Atendimento">
          <div className="grid min-h-72 place-items-center text-wash-700">
            <LoaderCircle className="animate-spin" />
          </div>
        </AppShell>
      }
    >
      <OrderDetailPage />
    </Suspense>
  );
}

function OrderDetailPage() {
  const id = useSearchParams().get("id") ?? "";
  const { currentStore } = useStore();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("Pix");

  const load = useCallback(async () => {
    await Promise.resolve();
    if (!supabase || !currentStore) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("service_orders")
      .select(
        "id,order_number,kind,status,payment_status,payment_method,total,discount,notes,created_at,customers(name,whatsapp,phone),vehicles(plate,make,model,color,size),partners(name,phone),employees(name,role_name),service_order_items(id,description,quantity,unit_price,total)",
      )
      .eq("id", id)
      .eq("store_id", currentStore.id)
      .single();
    setMessage(error ? error.message : null);
    setOrder((data as Order | null) ?? null);
    setLoading(false);
  }, [currentStore, id]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function updateStatus(status: string) {
    if (!supabase || !order) return;
    setSaving(true);
    setMessage(null);
    const timestamps =
      status === "washing"
        ? { started_at: new Date().toISOString() }
        : status === "ready"
          ? { finished_at: new Date().toISOString() }
          : status === "delivered"
            ? { delivered_at: new Date().toISOString() }
            : {};
    const { error } = await supabase
      .from("service_orders")
      .update({ status, ...timestamps })
      .eq("id", order.id);
    if (error) setMessage(error.message);
    else await load();
    setSaving(false);
  }

  async function registerPayment() {
    if (!supabase || !order) return;
    setSaving(true);
    setMessage(null);
    const { error } = await supabase.rpc("register_order_payment", {
      p_order_id: order.id,
      p_payment_method: paymentMethod,
    });
    if (error) setMessage(error.message);
    else await load();
    setSaving(false);
  }

  if (loading)
    return (
      <AppShell title="Atendimento">
        <div className="grid min-h-72 place-items-center text-wash-700">
          <LoaderCircle className="animate-spin" />
        </div>
      </AppShell>
    );
  if (!order)
    return (
      <AppShell title="Atendimento">
        <p className="rounded-xl bg-rose-50 p-4 text-sm font-semibold text-rose-700">
          {message ?? "Atendimento não encontrado nesta loja."}
        </p>
      </AppShell>
    );
  const contact = order.customers ?? order.partners;
  const contactPhone =
    order.customers?.whatsapp ??
    order.customers?.phone ??
    order.partners?.phone ??
    "Sem telefone";
  const vehicleName = order.vehicles
    ? [order.vehicles.make, order.vehicles.model].filter(Boolean).join(" ")
    : (order.partners?.name ?? "Atendimento");

  return (
    <AppShell title={`AT-${String(order.order_number).padStart(4, "0")}`}>
      {message ? (
        <p className="mb-4 rounded-xl bg-rose-50 p-4 text-sm font-semibold text-rose-700">
          {message}
        </p>
      ) : null}
      <div className="grid gap-5 xl:grid-cols-[1fr_22rem]">
        <div className="space-y-5">
          <section className="rounded-2xl border border-line bg-white p-5 shadow-soft">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-800">
                    {statuses.find(([value]) => value === order.status)?.[1] ??
                      order.status}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                    {kindLabel[order.kind]}
                  </span>
                </div>
                <h2 className="mt-3 text-2xl font-extrabold">{vehicleName}</h2>
                <p className="text-slate-500">
                  {order.vehicles?.plate}
                  {order.vehicles?.color ? ` · ${order.vehicles.color}` : ""}
                  {order.vehicles?.size
                    ? ` · Porte ${order.vehicles.size}`
                    : ""}
                </p>
              </div>
              <label className="grid gap-1 text-xs font-bold text-slate-500">
                STATUS
                <select
                  disabled={saving}
                  value={order.status}
                  onChange={(e) => void updateStatus(e.target.value)}
                  className="field text-sm text-slate-800"
                >
                  {statuses.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>
          <section className="grid gap-4 sm:grid-cols-2">
            <Info
              icon={UserRound}
              label="Cliente"
              title={contact?.name ?? "Não informado"}
              detail={contactPhone}
            />
            <Info
              icon={Clock3}
              label="Responsável"
              title={order.employees?.name ?? "Não atribuído"}
              detail={order.employees?.role_name ?? "Equipe da loja"}
            />
          </section>
          <section className="rounded-2xl border border-line bg-white p-5 shadow-soft">
            <div className="flex items-center gap-2">
              <Sparkles size={20} className="text-wash-700" />
              <h2 className="font-extrabold">Serviços</h2>
            </div>
            <div className="mt-4 divide-y divide-line">
              {order.service_order_items.map((item) => (
                <div key={item.id} className="flex justify-between gap-3 py-3">
                  <div>
                    <strong className="text-sm">{item.description}</strong>
                    <p className="text-xs text-slate-500">
                      {Number(item.quantity)} × {brl(Number(item.unit_price))}
                    </p>
                  </div>
                  <strong className="text-sm">{brl(Number(item.total))}</strong>
                </div>
              ))}
            </div>
            {order.notes ? (
              <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                {order.notes}
              </p>
            ) : null}
          </section>
        </div>
        <aside className="h-fit rounded-2xl border border-line bg-white p-5 shadow-soft xl:sticky xl:top-24">
          <CircleDollarSign size={22} className="text-wash-700" />
          <p className="mt-4 text-sm font-bold text-slate-500">
            Total do atendimento
          </p>
          <strong className="mt-1 block text-3xl tracking-[-0.04em]">
            {brl(Number(order.total))}
          </strong>
          <p
            className={`mt-3 flex items-center gap-2 text-sm font-bold ${order.payment_status === "paid" ? "text-emerald-700" : "text-amber-700"}`}
          >
            <CheckCircle2 size={17} />{" "}
            {order.payment_status === "paid"
              ? `Pago · ${order.payment_method ?? "Método não informado"}`
              : "Pagamento pendente"}
          </p>
          {order.payment_status !== "paid" ? (
            <>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="field mt-5 w-full"
              >
                <option>Pix</option>
                <option>Dinheiro</option>
                <option>Cartão de débito</option>
                <option>Cartão de crédito</option>
                <option>Transferência</option>
              </select>
              <button
                disabled={saving}
                onClick={() => void registerPayment()}
                className="mt-3 flex min-h-12 w-full items-center justify-center rounded-xl bg-wash-700 text-sm font-extrabold text-white disabled:opacity-60"
              >
                {saving ? (
                  <LoaderCircle size={18} className="animate-spin" />
                ) : (
                  "Registrar pagamento"
                )}
              </button>
            </>
          ) : null}
          <div className="mt-5 border-t border-line pt-4 text-sm text-slate-500">
            <p className="flex items-center gap-2">
              <Car size={15} /> Criado em{" "}
              {new Intl.DateTimeFormat("pt-BR").format(
                new Date(order.created_at),
              )}
            </p>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}

function Info({
  icon: Icon,
  label,
  title,
  detail,
}: {
  icon: typeof UserRound;
  label: string;
  title: string;
  detail: string;
}) {
  return (
    <article className="rounded-2xl border border-line bg-white p-5 shadow-soft">
      <Icon size={20} className="text-wash-700" />
      <p className="mt-3 text-xs font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <strong className="mt-1 block">{title}</strong>
      <p className="text-sm text-slate-500">{detail}</p>
    </article>
  );
}
