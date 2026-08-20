"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CircleDollarSign,
  LoaderCircle,
  Sparkles,
  UserRound,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useStoreRows } from "@/hooks/useStoreRows";
import { supabase } from "@/lib/supabase";
import { brl } from "@/lib/utils";

type Customer = { id: string; name: string };
type Vehicle = {
  id: string;
  customer_id: string;
  plate: string;
  make: string | null;
  model: string | null;
};
type Service = {
  id: string;
  name: string;
  category: string | null;
  base_price: number;
  estimated_minutes: number | null;
};
type Employee = { id: string; name: string };
type Partner = { id: string; name: string };

export default function NewOrderPage() {
  const router = useRouter();
  const customers = useStoreRows<Customer>("customers", {
    select: "id,name",
    orderBy: "name",
    ascending: true,
  });
  const vehicles = useStoreRows<Vehicle>("vehicles", {
    select: "id,customer_id,plate,make,model",
    orderBy: "plate",
    ascending: true,
  });
  const services = useStoreRows<Service>("services", {
    select: "id,name,category,base_price,estimated_minutes",
    orderBy: "name",
    ascending: true,
  });
  const employees = useStoreRows<Employee>("employees", {
    select: "id,name",
    orderBy: "name",
    ascending: true,
  });
  const partners = useStoreRows<Partner>("partners", {
    select: "id,name",
    orderBy: "name",
    ascending: true,
  });
  const [kind, setKind] = useState("walk_in");
  const [customerId, setCustomerId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [partnerId, setPartnerId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [notes, setNotes] = useState("");
  const [discount, setDiscount] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableVehicles = useMemo(
    () =>
      customerId
        ? vehicles.rows.filter((item) => item.customer_id === customerId)
        : vehicles.rows,
    [customerId, vehicles.rows],
  );
  const chosenServices = services.rows.filter((service) =>
    selected.includes(service.id),
  );
  const subtotal = chosenServices.reduce(
    (sum, service) => sum + Number(service.base_price),
    0,
  );
  const total = Math.max(subtotal - discount, 0);
  const loading =
    customers.loading ||
    vehicles.loading ||
    services.loading ||
    employees.loading ||
    partners.loading;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!services.store || !supabase || selected.length === 0) {
      setError("Selecione pelo menos um serviço.");
      return;
    }
    if (kind === "partner" && !partnerId) {
      setError("Selecione o parceiro deste atendimento.");
      return;
    }
    setSaving(true);
    setError(null);
    const { data, error: createError } = await supabase.rpc(
      "create_service_order",
      {
        p_store_id: services.store.id,
        p_kind: kind,
        p_customer_id: customerId || null,
        p_vehicle_id: vehicleId || null,
        p_partner_id: kind === "partner" ? partnerId : null,
        p_employee_id: employeeId || null,
        p_scheduled_at: scheduledAt
          ? new Date(scheduledAt).toISOString()
          : null,
        p_discount: discount,
        p_notes: notes || null,
        p_items: chosenServices.map((service) => ({
          service_id: service.id,
          description: service.name,
          quantity: 1,
          unit_price: Number(service.base_price),
        })),
      },
    );
    if (createError) {
      setError(createError.message);
      setSaving(false);
      return;
    }
    const created = Array.isArray(data) ? data[0] : data;
    if (!created?.id) {
      setError("O atendimento não retornou um identificador.");
      setSaving(false);
      return;
    }
    router.push(`/orders/detail?id=${created.id}`);
  }

  return (
    <AppShell title="Novo atendimento">
      <form onSubmit={submit} className="grid gap-5 xl:grid-cols-[1fr_22rem]">
        <div className="space-y-5">
          <section className="rounded-2xl border border-line bg-white p-4 shadow-soft sm:p-5">
            <SectionTitle
              icon={UserRound}
              title="Cliente e veículo"
              detail="Identifique quem está deixando o veículo."
            />
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Tipo de atendimento">
                <select
                  value={kind}
                  onChange={(e) => setKind(e.target.value)}
                  className="field"
                >
                  <option value="walk_in">Particular</option>
                  <option value="partner">Parceiro</option>
                  <option value="scheduled">Agendado</option>
                </select>
              </Field>
              {kind === "partner" ? (
                <Field label="Parceiro">
                  <select
                    required
                    value={partnerId}
                    onChange={(e) => setPartnerId(e.target.value)}
                    className="field"
                  >
                    <option value="">Selecione</option>
                    {partners.rows.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : null}
              <Field label="Cliente">
                <select
                  value={customerId}
                  onChange={(e) => {
                    setCustomerId(e.target.value);
                    setVehicleId("");
                  }}
                  className="field"
                >
                  <option value="">Selecione</option>
                  {customers.rows.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Veículo">
                <select
                  value={vehicleId}
                  onChange={(e) => setVehicleId(e.target.value)}
                  className="field"
                >
                  <option value="">Selecione</option>
                  {availableVehicles.map((item) => (
                    <option key={item.id} value={item.id}>
                      {[item.make, item.model].filter(Boolean).join(" ")} ·{" "}
                      {item.plate}
                    </option>
                  ))}
                </select>
              </Field>
              {kind === "scheduled" ? (
                <Field label="Data e horário">
                  <input
                    required
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="field"
                  />
                </Field>
              ) : null}
            </div>
          </section>
          <section className="rounded-2xl border border-line bg-white p-4 shadow-soft sm:p-5">
            <SectionTitle
              icon={Sparkles}
              title="Serviços"
              detail="Selecione um ou mais itens do catálogo."
            />
            {loading ? (
              <div className="grid h-32 place-items-center">
                <LoaderCircle className="animate-spin text-wash-700" />
              </div>
            ) : (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {services.rows.map((service) => {
                  const checked = selected.includes(service.id);
                  return (
                    <label
                      key={service.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${checked ? "border-wash-400 bg-wash-50" : "border-line hover:border-wash-300"}`}
                    >
                      <input
                        checked={checked}
                        onChange={() =>
                          setSelected((current) =>
                            checked
                              ? current.filter((id) => id !== service.id)
                              : [...current, service.id],
                          )
                        }
                        type="checkbox"
                        className="mt-1 h-4 w-4 accent-wash-700"
                      />
                      <span className="min-w-0 flex-1">
                        <strong className="block text-sm">
                          {service.name}
                        </strong>
                        <span className="text-xs text-slate-500">
                          {service.estimated_minutes
                            ? `${service.estimated_minutes} min · `
                            : ""}
                          {service.category}
                        </span>
                      </span>
                      <strong className="text-sm text-wash-800">
                        {brl(Number(service.base_price))}
                      </strong>
                    </label>
                  );
                })}
              </div>
            )}
          </section>
          <section className="rounded-2xl border border-line bg-white p-4 shadow-soft sm:p-5">
            <h2 className="font-extrabold">Operação e observações</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Responsável">
                <select
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="field"
                >
                  <option value="">Não atribuído</option>
                  {employees.rows.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Desconto">
                <input
                  min="0"
                  step="0.01"
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                  className="field"
                  type="number"
                />
              </Field>
              <label className="grid gap-2 text-sm font-bold text-slate-700 sm:col-span-2">
                Observações
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="focus-ring min-h-24 rounded-xl border border-line p-4"
                  placeholder="Preferências, avarias observadas, instruções..."
                />
              </label>
            </div>
          </section>
        </div>
        <aside className="h-fit rounded-2xl bg-gradient-to-br from-wash-950 to-wash-700 p-5 text-white shadow-float xl:sticky xl:top-24">
          <CircleDollarSign size={24} className="text-cyan-200" />
          <h2 className="mt-4 text-xl font-extrabold">Resumo</h2>
          <div className="mt-5 space-y-3 border-b border-white/15 pb-5 text-sm">
            <Summary label="Serviços" value={brl(subtotal)} />
            <Summary label="Desconto" value={brl(discount)} />
          </div>
          <p className="mt-5 flex items-end justify-between">
            <span className="text-sm text-sky-200">Total</span>
            <strong className="text-3xl">{brl(total)}</strong>
          </p>
          {error ? (
            <p className="mt-4 rounded-xl bg-rose-400/20 p-3 text-sm font-semibold text-rose-100">
              {error}
            </p>
          ) : null}
          <button
            disabled={saving || loading}
            className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-cyan-300 font-extrabold text-wash-950 disabled:opacity-60"
          >
            {saving ? (
              <LoaderCircle size={18} className="animate-spin" />
            ) : (
              <>
                Criar atendimento <ArrowRight size={18} />
              </>
            )}
          </button>
        </aside>
      </form>
    </AppShell>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700">
      {label}
      {children}
    </label>
  );
}
function Summary({ label, value }: { label: string; value: string }) {
  return (
    <p className="flex justify-between text-sky-100">
      <span>{label}</span>
      <strong className="text-white">{value}</strong>
    </p>
  );
}
function SectionTitle({
  icon: Icon,
  title,
  detail,
}: {
  icon: typeof UserRound;
  title: string;
  detail: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-wash-50 text-wash-700">
        <Icon size={20} />
      </span>
      <div>
        <h2 className="font-extrabold">{title}</h2>
        <p className="text-sm text-slate-500">{detail}</p>
      </div>
    </div>
  );
}
