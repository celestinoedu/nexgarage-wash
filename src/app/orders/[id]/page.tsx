import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { OrderStatusBadge, PriorityBadge } from "@/components/badges";
import { cars, customers, mechanics, parts, serviceOrders, services } from "@/lib/data";
import { brl, shortDate } from "@/lib/utils";

export default function OrderDetailPage({ params }: { params: { id: string } }) {
  const order = serviceOrders.find((item) => item.id === params.id);
  if (!order) notFound();
  const car = cars.find((item) => item.id === order.carId);
  const customer = customers.find((item) => item.id === order.customerId);
  const mechanic = mechanics.find((item) => item.id === order.mechanicId);
  return (
    <AppShell title={`${order.code} · ${car?.plate}`}>
      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <section className="rounded-lg border border-line bg-white p-4 shadow-soft">
          <div className="flex flex-wrap gap-2"><OrderStatusBadge status={order.status} /><PriorityBadge priority={order.priority} /></div>
          <h2 className="mt-4 text-2xl font-black">{customer?.name}</h2>
          <p className="font-semibold text-slate-600">{car?.brand} {car?.model} {car?.year} · {car?.mileage.toLocaleString("pt-BR")} km</p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div><b>Problema relatado</b><p className="text-slate-600">{order.customerIssue}</p></div>
            <div><b>Diagnóstico técnico</b><p className="text-slate-600">{order.diagnosis}</p></div>
            <div><b>Mecânico</b><p className="text-slate-600">{mechanic?.name}</p></div>
            <div><b>Previsão</b><p className="text-slate-600">{shortDate(order.dueDate)}</p></div>
          </div>
          <button className="mt-6 min-h-12 rounded-md border border-line px-5 font-black">Gerar versão imprimível</button>
        </section>
        <aside className="grid gap-4">
          <section className="rounded-lg border border-line bg-white p-4 shadow-soft">
            <h3 className="font-black">Valores</h3>
            <p className="mt-2 flex justify-between"><span>Mão de obra</span><b>{brl(order.laborValue)}</b></p>
            <p className="flex justify-between"><span>Peças</span><b>{brl(order.partsValue)}</b></p>
            <p className="flex justify-between"><span>Desconto</span><b>{brl(order.discount)}</b></p>
            <p className="mt-3 flex justify-between border-t border-line pt-3 text-xl"><span>Total</span><b>{brl(order.totalValue)}</b></p>
          </section>
          <section className="rounded-lg border border-line bg-white p-4 shadow-soft">
            <h3 className="font-black">Serviços e peças</h3>
            <ul className="mt-2 grid gap-2 text-sm text-slate-700">
              {order.serviceIds.map((id) => <li key={id}>Serviço: {services.find((item) => item.id === id)?.name}</li>)}
              {order.partIds.map((id) => <li key={id}>Peça: {parts.find((item) => item.id === id)?.name}</li>)}
            </ul>
          </section>
        </aside>
      </div>
    </AppShell>
  );
}
