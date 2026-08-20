"use client";

import { useDroppable } from "@dnd-kit/core";
import { Car, Customer, Mechanic, OrderStatus, ServiceOrder } from "@/lib/types";
import { DraggableOrder } from "./draggable-order";

export function KanbanColumn({
  id,
  title,
  orders,
  customers,
  cars,
  mechanics
}: {
  id: OrderStatus;
  title: string;
  orders: ServiceOrder[];
  customers: Record<string, Customer>;
  cars: Record<string, Car>;
  mechanics: Record<string, Mechanic>;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <section ref={setNodeRef} className={`min-h-[520px] rounded-lg border p-3 ${isOver ? "border-lotus bg-teal-50" : "border-line bg-slate-100"}`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-black text-ink">{title}</h2>
        <span className="rounded-md bg-white px-2 py-1 text-xs font-black text-slate-600">{orders.length}</span>
      </div>
      <div className="space-y-3">
        {orders.map((order) => (
          <DraggableOrder key={order.id} order={order} customer={customers[order.customerId]} car={cars[order.carId]} mechanic={mechanics[order.mechanicId]} />
        ))}
      </div>
    </section>
  );
}
