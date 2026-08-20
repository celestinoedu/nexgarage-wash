export type WashOrderStatus = "Aguardando" | "Lavagem" | "Acabamento" | "Pronto" | "Entregue" | "Cancelado";
export type WashPaymentStatus = "Pendente" | "Parcial" | "Pago" | "Cancelado";

export type WashCustomer = { id: string; name: string; whatsapp: string; email?: string; document?: string; lastVisit: string };
export type WashVehicle = { id: string; customerId: string; plate: string; make: string; model: string; color: string; size: "P" | "M" | "G" | "Utilitário" };
export type WashService = { id: string; name: string; category: string; price: number; minutes: number; active: boolean };
export type WashPartner = { id: string; name: string; phone: string; pending: number };
export type WashEmployee = { id: string; name: string; role: string; active: boolean };
export type WashOrder = {
  id: string; number: string; customerId?: string; vehicleId?: string; partnerId?: string; employeeId?: string;
  kind: "Particular" | "Parceiro" | "Agendado"; status: WashOrderStatus; paymentStatus: WashPaymentStatus;
  serviceIds: string[]; createdAt: string; scheduledAt?: string; total: number; paymentMethod?: string; notes?: string;
};
