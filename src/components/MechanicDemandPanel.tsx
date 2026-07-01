import { Clock, Gauge, Wrench } from "lucide-react";
import { mechanics, serviceOrders, services } from "@/lib/data";
import { brl, demandLevel } from "@/lib/utils";

export function MechanicDemandPanel() {
  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      {mechanics.map((mechanic) => {
        const activeOrders = serviceOrders.filter((order) => order.mechanicId === mechanic.id && !["Entregue", "Cancelado"].includes(order.status));
        const hours = activeOrders.reduce((sum, order) => sum + order.serviceIds.reduce((total, id) => total + (services.find((service) => service.id === id)?.estimatedHours ?? 0), 0), 0);
        const level = demandLevel(activeOrders.length);
        return (
          <article key={mechanic.id} className="rounded-lg border border-line bg-white p-4 shadow-soft">
            <div className="flex items-center justify-between">
              <strong className="text-base font-black">{mechanic.name}</strong>
              <span className={`rounded-md px-2 py-1 text-xs font-black ${level.tone === "danger" ? "bg-rose-50 text-rose-700" : level.tone === "warning" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>{level.label}</span>
            </div>
            <p className="mt-1 text-sm text-slate-500">{mechanic.specialty}</p>
            <div className="mt-4 grid gap-2 text-sm font-semibold text-slate-700">
              <span className="flex items-center gap-2"><Wrench size={16} />{activeOrders.length} OS em andamento</span>
              <span className="flex items-center gap-2"><Clock size={16} />{hours}h estimadas</span>
              <span className="flex items-center gap-2"><Gauge size={16} />{brl(activeOrders.reduce((sum, order) => sum + order.totalValue, 0))}</span>
            </div>
          </article>
        );
      })}
    </section>
  );
}
