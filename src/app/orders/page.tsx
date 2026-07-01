import Link from "next/link";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { OrderStatusBadge } from "@/components/badges";
import { cars, customers, mechanics, serviceOrders } from "@/lib/data";
import { brl, shortDate } from "@/lib/utils";

export default function OrdersPage() {
  return (
    <AppShell title="Ordens de serviço" action={<Link href="/orders/new" className="flex min-h-11 items-center gap-2 rounded-md bg-lotus px-4 font-black text-white"><Plus size={18} />Nova OS</Link>}>
      <div className="grid gap-3">
        {serviceOrders.map((order) => {
          const car = cars.find((item) => item.id === order.carId);
          const customer = customers.find((item) => item.id === order.customerId);
          const mechanic = mechanics.find((item) => item.id === order.mechanicId);
          return (
            <Link key={order.id} href={`/orders/${order.id}`} className="rounded-lg border border-line bg-white p-4 shadow-soft">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <strong className="text-lg font-black">{order.code} · {car?.plate}</strong>
                  <p className="text-sm text-slate-500">{customer?.name} · {car?.model} · {mechanic?.name}</p>
                </div>
                <OrderStatusBadge status={order.status} />
              </div>
              <div className="mt-3 grid gap-2 text-sm font-semibold text-slate-700 md:grid-cols-4">
                <span>Entrega: {shortDate(order.dueDate)}</span>
                <span>Prioridade: {order.priority}</span>
                <span>Total: {brl(order.totalValue)}</span>
                <span>Financeiro: {order.financialStatus}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </AppShell>
  );
}
