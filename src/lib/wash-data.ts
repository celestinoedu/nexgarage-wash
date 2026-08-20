import type { WashCustomer, WashEmployee, WashOrder, WashPartner, WashService, WashVehicle } from "./wash-types";

export const washCustomers: WashCustomer[] = [
  { id: "c1", name: "Mariana Alves", whatsapp: "(11) 98811-1001", email: "mariana@email.com", lastVisit: "2026-08-19" },
  { id: "c2", name: "Paulo Mendes", whatsapp: "(11) 98822-1002", lastVisit: "2026-08-18" },
  { id: "c3", name: "Renata Costa", whatsapp: "(11) 98833-1003", email: "renata@email.com", lastVisit: "2026-07-29" },
  { id: "c4", name: "Carlos Neri", whatsapp: "(11) 98844-1004", lastVisit: "2026-08-01" },
  { id: "c5", name: "Fernanda Lima", whatsapp: "(11) 98855-1005", lastVisit: "2026-08-03" }
];

export const washVehicles: WashVehicle[] = [
  { id: "v1", customerId: "c1", plate: "RTA4J21", make: "Jeep", model: "Compass", color: "Branco", size: "G" },
  { id: "v2", customerId: "c2", plate: "GHP2D44", make: "Volkswagen", model: "T-Cross", color: "Cinza", size: "G" },
  { id: "v3", customerId: "c3", plate: "ABC1D23", make: "Toyota", model: "Corolla", color: "Prata", size: "M" },
  { id: "v4", customerId: "c4", plate: "FGH4E56", make: "Hyundai", model: "HB20", color: "Azul", size: "P" },
  { id: "v5", customerId: "c5", plate: "KLM7J89", make: "Volkswagen", model: "Nivus", color: "Preto", size: "M" }
];

export const washServices: WashService[] = [
  { id: "s1", name: "Lavagem simples", category: "Lavagem", price: 55, minutes: 35, active: true },
  { id: "s2", name: "Lavagem completa", category: "Lavagem", price: 85, minutes: 55, active: true },
  { id: "s3", name: "Lavagem detalhada", category: "Detalhamento", price: 140, minutes: 90, active: true },
  { id: "s4", name: "Higienização interna", category: "Higienização", price: 320, minutes: 180, active: true },
  { id: "s5", name: "Polimento técnico", category: "Estética", price: 480, minutes: 240, active: true },
  { id: "s6", name: "Cristalização de vidros", category: "Proteção", price: 120, minutes: 60, active: true }
];

export const washPartners: WashPartner[] = [
  { id: "p1", name: "AutoPrime Veículos", phone: "(11) 97771-1001", pending: 2460 },
  { id: "p2", name: "Rental Car Moema", phone: "(11) 97772-1002", pending: 1780 }
];

export const washEmployees: WashEmployee[] = [
  { id: "e1", name: "Ana Souza", role: "Detalhista", active: true },
  { id: "e2", name: "Bruno Lima", role: "Lavador", active: true },
  { id: "e3", name: "Carlos Neri", role: "Lavador", active: true }
];

export const washOrders: WashOrder[] = [
  { id: "o184", number: "AT-0184", customerId: "c1", vehicleId: "v1", employeeId: "e1", kind: "Particular", status: "Lavagem", paymentStatus: "Pendente", serviceIds: ["s3"], createdAt: "2026-08-19T10:20:00-03:00", total: 140 },
  { id: "o183", number: "AT-0183", partnerId: "p1", employeeId: "e2", kind: "Parceiro", status: "Aguardando", paymentStatus: "Pendente", serviceIds: ["s4"], createdAt: "2026-08-19T09:55:00-03:00", total: 320 },
  { id: "o182", number: "AT-0182", customerId: "c2", vehicleId: "v2", employeeId: "e3", kind: "Particular", status: "Pronto", paymentStatus: "Pago", serviceIds: ["s2"], createdAt: "2026-08-19T09:10:00-03:00", total: 85, paymentMethod: "Pix" }
];
