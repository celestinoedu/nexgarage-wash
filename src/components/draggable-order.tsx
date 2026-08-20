"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Car, Customer, Mechanic, ServiceOrder } from "@/lib/types";
import { ServiceOrderCard } from "./ServiceOrderCard";

export function DraggableOrder({ order, customer, car, mechanic }: { order: ServiceOrder; customer?: Customer; car?: Car; mechanic?: Mechanic }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: order.id });
  const style = { transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.65 : 1 };

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <ServiceOrderCard order={order} customer={customer} car={car} mechanic={mechanic} />
    </div>
  );
}
