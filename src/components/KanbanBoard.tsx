"use client";

import { useMemo, useState } from "react";
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { Car, Customer, Mechanic, OrderStatus, ServiceOrder } from "@/lib/types";
import { byId, orderSearchText } from "@/lib/utils";
import { KanbanColumn } from "./KanbanColumn";

const columns: OrderStatus[] = ["Recebido", "Diagnóstico", "Aguardando aprovação", "Aguardando peças", "Em execução", "Finalizado", "Entregue", "Cancelado"];

export function KanbanBoard({
  orders,
  customers,
  cars,
  mechanics
}: {
  orders: ServiceOrder[];
  customers: Customer[];
  cars: Car[];
  mechanics: Mechanic[];
}) {
  const [items, setItems] = useState(orders);
  const [query, setQuery] = useState("");
  const [mechanic, setMechanic] = useState("todos");
  const [priority, setPriority] = useState("todas");
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const customerMap = useMemo(() => byId(customers), [customers]);
  const carMap = useMemo(() => byId(cars), [cars]);
  const mechanicMap = useMemo(() => byId(mechanics), [mechanics]);

  const filtered = items.filter((order) => {
    const text = orderSearchText(order, customerMap, carMap, mechanicMap);
    return (
      text.includes(query.toLowerCase()) &&
      (mechanic === "todos" || order.mechanicId === mechanic) &&
      (priority === "todas" || order.priority === priority)
    );
  });

  const onDragEnd = (event: DragEndEvent) => {
    const id = String(event.active.id);
    const nextStatus = event.over?.id as OrderStatus | undefined;
    if (!nextStatus || !columns.includes(nextStatus)) return;
    setItems((current) => current.map((order) => (order.id === id ? { ...order, status: nextStatus } : order)));
  };

  return (
    <section className="space-y-4">
      <div className="grid gap-3 rounded-lg border border-line bg-white p-3 shadow-soft md:grid-cols-[1fr_220px_180px]">
        <input className="focus-ring min-h-12 rounded-md border border-line px-4 text-base" placeholder="Buscar placa, cliente ou OS" value={query} onChange={(event) => setQuery(event.target.value)} />
        <select className="focus-ring min-h-12 rounded-md border border-line px-3" value={mechanic} onChange={(event) => setMechanic(event.target.value)}>
          <option value="todos">Todos mecânicos</option>
          {mechanics.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <select className="focus-ring min-h-12 rounded-md border border-line px-3" value={priority} onChange={(event) => setPriority(event.target.value)}>
          <option value="todas">Todas prioridades</option>
          <option>Baixa</option>
          <option>Normal</option>
          <option>Alta</option>
          <option>Urgente</option>
        </select>
      </div>
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="grid auto-cols-[minmax(280px,1fr)] grid-flow-col gap-4 overflow-x-auto pb-3">
          {columns.map((status) => (
            <KanbanColumn
              key={status}
              id={status}
              title={status}
              orders={filtered.filter((order) => order.status === status)}
              customers={customerMap}
              cars={carMap}
              mechanics={mechanicMap}
            />
          ))}
        </div>
      </DndContext>
    </section>
  );
}
