import Link from "next/link";
import { CalendarDays, CircleDollarSign, Wrench } from "lucide-react";
import { Car, Customer, Mechanic, ServiceOrder } from "@/lib/types";
import { brl, isLate, shortDate } from "@/lib/utils";
import { PriorityBadge } from "./badges";

export function ServiceOrderCard({
  order,
  customer,
  car,
  mechanic,
}: {
  order: ServiceOrder;
  customer?: Customer;
  car?: Car;
  mechanic?: Mechanic;
}) {
  const late = isLate(order.dueDate, order.status);

  return (
    <Link
      href={`/orders/detail?id=${order.id}`}
      className={`block rounded-lg border bg-white p-3 shadow-soft ${late ? "border-rose-300" : "border-line"}`}
    >
      <div className="flex items-start justify-between gap-2">
        <strong className="text-sm font-black text-ink">{order.code}</strong>
        <PriorityBadge priority={order.priority} />
      </div>
      <p className="mt-2 text-lg font-black tracking-normal text-ink">
        {car?.plate}
      </p>
      <p className="text-sm font-semibold text-slate-700">{customer?.name}</p>
      <p className="text-sm text-slate-500">
        {car?.brand} {car?.model}
      </p>
      <div className="mt-3 grid gap-2 text-xs font-semibold text-slate-600">
        <span className="flex items-center gap-2">
          <Wrench size={15} />
          {mechanic?.name}
        </span>
        <span className="flex items-center gap-2">
          <CalendarDays size={15} />
          Entrega {shortDate(order.dueDate)}
        </span>
        <span className="flex items-center gap-2">
          <CircleDollarSign size={15} />
          {brl(order.totalValue)}
        </span>
      </div>
      {late ? (
        <span className="mt-3 block rounded-md bg-rose-50 px-2 py-1 text-xs font-black text-rose-700">
          Atrasada
        </span>
      ) : null}
    </Link>
  );
}
