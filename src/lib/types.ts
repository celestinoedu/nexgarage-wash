export type OrderStatus =
  | "Recebido"
  | "Diagnóstico"
  | "Aguardando aprovação"
  | "Aguardando peças"
  | "Em execução"
  | "Finalizado"
  | "Entregue"
  | "Cancelado";

export type Priority = "Baixa" | "Normal" | "Alta" | "Urgente";
export type PaymentStatus = "pendente" | "pago" | "vencido" | "parcial";

export type Customer = {
  id: string;
  name: string;
  whatsapp: string;
  email?: string;
  document?: string;
  address?: string;
  notes?: string;
};

export type Car = {
  id: string;
  customerId: string;
  plate: string;
  brand: string;
  model: string;
  year: number;
  color: string;
  mileage: number;
  notes?: string;
};

export type Mechanic = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  specialty: string;
  active: boolean;
  notes?: string;
};

export type Supplier = {
  id: string;
  name: string;
  cnpj?: string;
  contact: string;
  whatsapp: string;
  email: string;
  category: string;
  notes?: string;
};

export type Part = {
  id: string;
  name: string;
  code: string;
  category: string;
  supplierId: string;
  stockQty: number;
  minStock: number;
  unitCost: number;
  salePrice: number;
  location: string;
};

export type Service = {
  id: string;
  name: string;
  category: string;
  description: string;
  estimatedHours: number;
  laborPrice: number;
  notes?: string;
};

export type ServiceOrder = {
  id: string;
  code: string;
  customerId: string;
  carId: string;
  openedAt: string;
  dueDate: string;
  status: OrderStatus;
  priority: Priority;
  customerIssue: string;
  diagnosis: string;
  serviceIds: string[];
  partIds: string[];
  mechanicId: string;
  laborValue: number;
  partsValue: number;
  discount: number;
  totalValue: number;
  financialStatus: PaymentStatus;
  internalNotes?: string;
};

export type InventoryMovement = {
  id: string;
  partId: string;
  type: "entrada" | "saida";
  quantity: number;
  reason: string;
  createdAt: string;
};

export type FinancialTransaction = {
  id: string;
  type: "receita" | "despesa";
  category: string;
  description: string;
  value: number;
  dueDate: string;
  paidAt?: string;
  status: PaymentStatus;
  paymentMethod?: string;
  orderId?: string;
  supplierId?: string;
  notes?: string;
};

export type TechnicalReport = {
  id: string;
  orderId: string;
  carId: string;
  mechanicId: string;
  date: string;
  diagnosis: string;
  probableCause: string;
  tests: string;
  recommendedServices: string;
  recommendedParts: string;
  conclusion: string;
  notes?: string;
};
