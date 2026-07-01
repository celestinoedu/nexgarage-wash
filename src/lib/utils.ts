import { Car, Customer, Mechanic, Part, ServiceOrder, Supplier } from "./types";

export const brl = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

export const shortDate = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(new Date(value));

export const isLate = (dueDate: string, status: string) => {
  if (["Finalizado", "Entregue", "Cancelado"].includes(status)) return false;
  const today = new Date("2026-05-20T12:00:00");
  return new Date(`${dueDate}T23:59:59`) < today;
};

export const byId = <T extends { id: string }>(items: T[]) =>
  items.reduce<Record<string, T>>((acc, item) => {
    acc[item.id] = item;
    return acc;
  }, {});

export const orderSearchText = (
  order: ServiceOrder,
  customers: Record<string, Customer>,
  cars: Record<string, Car>,
  mechanics: Record<string, Mechanic>
) => {
  const customer = customers[order.customerId];
  const car = cars[order.carId];
  const mechanic = mechanics[order.mechanicId];
  return `${order.code} ${customer?.name} ${car?.plate} ${car?.model} ${mechanic?.name}`.toLowerCase();
};

export const demandLevel = (ordersCount: number) => {
  if (ordersCount >= 5) return { label: "Sobrecarga", tone: "danger" };
  if (ordersCount >= 3) return { label: "Alta", tone: "warning" };
  return { label: "Saudável", tone: "success" };
};

export const relationName = (id: string, items: Array<Customer | Mechanic | Supplier | Part>) =>
  items.find((item) => item.id === id)?.name ?? "Não informado";
