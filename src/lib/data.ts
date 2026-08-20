import {
  Car,
  Customer,
  FinancialTransaction,
  InventoryMovement,
  Mechanic,
  PaymentStatus,
  Part,
  Service,
  ServiceOrder,
  Supplier,
  TechnicalReport
} from "./types";

export const workshop = {
  id: "workshop-1",
  name: "NexGarage Oficina Modelo",
  company: "LOTUS NEGOCIOS LTDA",
  whatsapp: "(11) 98888-1010"
};

export const mechanics: Mechanic[] = [
  { id: "m1", name: "Ana Souza", phone: "(11) 90001-1001", specialty: "Diagnóstico eletrônico", active: true },
  { id: "m2", name: "Bruno Lima", phone: "(11) 90002-1002", specialty: "Suspensão e freios", active: true },
  { id: "m3", name: "Carlos Neri", phone: "(11) 90003-1003", specialty: "Motor", active: true },
  { id: "m4", name: "Daniel Rocha", phone: "(11) 90004-1004", specialty: "Câmbio", active: true },
  { id: "m5", name: "Elaine Prado", phone: "(11) 90005-1005", specialty: "Elétrica", active: true }
];

export const customers: Customer[] = [
  { id: "c1", name: "Mariana Alves", whatsapp: "(11) 98811-1001", email: "mariana@email.com", address: "Rua Cedro, 45" },
  { id: "c2", name: "João Pereira", whatsapp: "(11) 98822-1002", document: "123.456.789-00" },
  { id: "c3", name: "Auto Peças Central", whatsapp: "(11) 98833-1003", email: "contato@central.com", document: "12.345.678/0001-90" },
  { id: "c4", name: "Renata Costa", whatsapp: "(11) 98844-1004" },
  { id: "c5", name: "Sérgio Martins", whatsapp: "(11) 98855-1005" },
  { id: "c6", name: "Camila Ribeiro", whatsapp: "(11) 98866-1006" },
  { id: "c7", name: "Paulo Mendes", whatsapp: "(11) 98877-1007" },
  { id: "c8", name: "Fernanda Castro", whatsapp: "(11) 98888-1008" },
  { id: "c9", name: "Ricardo Gomes", whatsapp: "(11) 98899-1009" },
  { id: "c10", name: "Luciana Farias", whatsapp: "(11) 98700-1010" }
];

export const cars: Car[] = [
  { id: "car1", customerId: "c1", plate: "ABC1D23", brand: "Toyota", model: "Corolla", year: 2019, color: "Prata", mileage: 78500 },
  { id: "car2", customerId: "c2", plate: "BEE4R10", brand: "Fiat", model: "Argo", year: 2021, color: "Vermelho", mileage: 42100 },
  { id: "car3", customerId: "c3", plate: "CDX7A91", brand: "Volkswagen", model: "Saveiro", year: 2018, color: "Branco", mileage: 112300 },
  { id: "car4", customerId: "c4", plate: "DDD2F44", brand: "Honda", model: "Fit", year: 2017, color: "Cinza", mileage: 90440 },
  { id: "car5", customerId: "c5", plate: "EFG8J55", brand: "Chevrolet", model: "Onix", year: 2020, color: "Preto", mileage: 60200 },
  { id: "car6", customerId: "c6", plate: "FRA3C16", brand: "Hyundai", model: "HB20", year: 2022, color: "Azul", mileage: 25190 },
  { id: "car7", customerId: "c7", plate: "GGH9B70", brand: "Renault", model: "Duster", year: 2016, color: "Branco", mileage: 130000 },
  { id: "car8", customerId: "c8", plate: "HJK1L82", brand: "Jeep", model: "Renegade", year: 2021, color: "Verde", mileage: 44800 },
  { id: "car9", customerId: "c9", plate: "IPQ5M03", brand: "Ford", model: "Ka", year: 2015, color: "Prata", mileage: 142600 },
  { id: "car10", customerId: "c10", plate: "JLA7N14", brand: "Nissan", model: "Kicks", year: 2023, color: "Cinza", mileage: 17050 },
  { id: "car11", customerId: "c1", plate: "KMO8P25", brand: "Citroën", model: "C4 Cactus", year: 2020, color: "Marrom", mileage: 52500 },
  { id: "car12", customerId: "c2", plate: "LUX2Q36", brand: "Peugeot", model: "208", year: 2022, color: "Branco", mileage: 31800 }
];

export const suppliers: Supplier[] = [
  { id: "s1", name: "Distribuidora Rápida", contact: "Márcio", whatsapp: "(11) 97771-1111", email: "vendas@rapida.com", category: "Filtros" },
  { id: "s2", name: "Freios Prime", contact: "Paula", whatsapp: "(11) 97772-2222", email: "prime@freios.com", category: "Freios" },
  { id: "s3", name: "Auto Elétrica Max", contact: "Guto", whatsapp: "(11) 97773-3333", email: "max@eletrica.com", category: "Elétrica" },
  { id: "s4", name: "Óleos Norte", contact: "Lia", whatsapp: "(11) 97774-4444", email: "oleos@norte.com", category: "Lubrificantes" },
  { id: "s5", name: "Suspensão Total", contact: "Ivo", whatsapp: "(11) 97775-5555", email: "contato@suspensao.com", category: "Suspensão" },
  { id: "s6", name: "Motor Parts", contact: "Nina", whatsapp: "(11) 97776-6666", email: "motor@parts.com", category: "Motor" },
  { id: "s7", name: "Arrefecimento Sul", contact: "Tom", whatsapp: "(11) 97777-7777", email: "sul@arref.com", category: "Arrefecimento" },
  { id: "s8", name: "Câmbio Certo", contact: "Bia", whatsapp: "(11) 97778-8888", email: "cambio@certo.com", category: "Transmissão" }
];

const partNames = [
  "Filtro de óleo", "Filtro de ar", "Pastilha dianteira", "Disco de freio", "Vela de ignição",
  "Bateria 60Ah", "Amortecedor dianteiro", "Correia dentada", "Óleo 5W30", "Aditivo radiador",
  "Lâmpada H7", "Sensor ABS", "Bomba d'água", "Coxim motor", "Kit embreagem",
  "Pneu 195/55", "Palheta limpador", "Fluido de freio", "Terminal direção", "Bieleta",
  "Filtro combustível", "Bobina ignição", "Radiador", "Junta tampa válvula", "Cabo vela",
  "Rolamento roda", "Óleo câmbio", "Mangueira arrefecimento", "Sensor temperatura", "Correia alternador"
];

export const parts: Part[] = partNames.map((name, index) => ({
  id: `p${index + 1}`,
  name,
  code: `NX-${String(index + 1).padStart(4, "0")}`,
  category: ["Filtros", "Freios", "Elétrica", "Motor", "Suspensão", "Lubrificantes"][index % 6],
  supplierId: suppliers[index % suppliers.length].id,
  stockQty: [2, 4, 11, 6, 18, 3, 7, 5, 24, 9][index % 10],
  minStock: [3, 5, 4, 4, 6][index % 5],
  unitCost: 28 + index * 9,
  salePrice: 48 + index * 14,
  location: `Rua ${String.fromCharCode(65 + (index % 5))}-${(index % 8) + 1}`
}));

export const services: Service[] = [
  { id: "sv1", name: "Troca de óleo", category: "Preventiva", description: "Troca de óleo e filtro", estimatedHours: 1, laborPrice: 90 },
  { id: "sv2", name: "Revisão de freios", category: "Freios", description: "Inspeção, limpeza e substituição se necessário", estimatedHours: 2, laborPrice: 180 },
  { id: "sv3", name: "Diagnóstico eletrônico", category: "Diagnóstico", description: "Scanner e leitura de falhas", estimatedHours: 1.5, laborPrice: 150 },
  { id: "sv4", name: "Suspensão dianteira", category: "Suspensão", description: "Avaliação e troca de componentes", estimatedHours: 3, laborPrice: 360 },
  { id: "sv5", name: "Troca de correia dentada", category: "Motor", description: "Substituição do kit de correia", estimatedHours: 4, laborPrice: 520 },
  { id: "sv6", name: "Manutenção arrefecimento", category: "Motor", description: "Limpeza e revisão do sistema", estimatedHours: 2.5, laborPrice: 260 },
  { id: "sv7", name: "Troca de bateria", category: "Elétrica", description: "Teste, substituição e reset básico", estimatedHours: 0.5, laborPrice: 60 },
  { id: "sv8", name: "Alinhamento e balanceamento", category: "Rodas", description: "Ajuste completo das rodas", estimatedHours: 1.5, laborPrice: 160 },
  { id: "sv9", name: "Reparo de embreagem", category: "Transmissão", description: "Remoção e instalação do kit", estimatedHours: 6, laborPrice: 780 },
  { id: "sv10", name: "Laudo técnico", category: "Laudo", description: "Relatório técnico completo", estimatedHours: 1, laborPrice: 220 }
];

const statuses = ["Recebido", "Diagnóstico", "Aguardando aprovação", "Aguardando peças", "Em execução", "Finalizado", "Entregue", "Cancelado"] as const;
const priorities = ["Baixa", "Normal", "Alta", "Urgente"] as const;

export const serviceOrders: ServiceOrder[] = Array.from({ length: 20 }, (_, index) => {
  const serviceIds = [services[index % services.length].id, services[(index + 3) % services.length].id];
  const usedParts = [parts[index % parts.length].id, parts[(index + 8) % parts.length].id];
  const laborValue = serviceIds.reduce((sum, id) => sum + (services.find((service) => service.id === id)?.laborPrice ?? 0), 0);
  const partsValue = usedParts.reduce((sum, id) => sum + (parts.find((part) => part.id === id)?.salePrice ?? 0), 0);
  const discount = index % 5 === 0 ? 50 : 0;
  return {
    id: `os${index + 1}`,
    code: `OS-${String(1024 + index).padStart(5, "0")}`,
    customerId: customers[index % customers.length].id,
    carId: cars[index % cars.length].id,
    openedAt: `2026-05-${String(1 + (index % 18)).padStart(2, "0")}`,
    dueDate: `2026-05-${String(7 + (index % 17)).padStart(2, "0")}`,
    status: statuses[index % statuses.length],
    priority: priorities[index % priorities.length],
    customerIssue: ["Barulho ao frear", "Luz de injeção acesa", "Revisão periódica", "Superaquecimento"][index % 4],
    diagnosis: ["Aguardando inspeção", "Falha registrada no scanner", "Desgaste identificado", "Sistema em teste"][index % 4],
    serviceIds,
    partIds: usedParts,
    mechanicId: mechanics[index % mechanics.length].id,
    laborValue,
    partsValue,
    discount,
    totalValue: laborValue + partsValue - discount,
    financialStatus: ["pendente", "pago", "vencido", "parcial"][index % 4] as ServiceOrder["financialStatus"],
    internalNotes: index % 2 === 0 ? "Cliente pediu retorno por WhatsApp." : undefined
  };
});

export const inventoryMovements: InventoryMovement[] = parts.slice(0, 24).map((part, index) => ({
  id: `mov${index + 1}`,
  partId: part.id,
  type: index % 3 === 0 ? "saida" : "entrada",
  quantity: (index % 5) + 1,
  reason: index % 3 === 0 ? "Uso em OS" : "Reposição de estoque",
  createdAt: `2026-05-${String(1 + (index % 19)).padStart(2, "0")}`
}));

export const financialTransactions: FinancialTransaction[] = [
  ...serviceOrders.slice(0, 16).map((order, index) => ({
    id: `fin${index + 1}`,
    type: "receita" as const,
    category: "Ordem de serviço",
    description: `Receita ${order.code}`,
    value: order.totalValue,
    dueDate: order.dueDate,
    paidAt: order.financialStatus === "pago" ? order.dueDate : undefined,
    status: order.financialStatus,
    paymentMethod: ["Pix", "Cartão", "Dinheiro", "Boleto"][index % 4],
    orderId: order.id
  })),
  ...suppliers.slice(0, 8).map((supplier, index) => ({
    id: `fin-d${index + 1}`,
    type: "despesa" as const,
    category: ["Peças", "Aluguel", "Energia", "Ferramentas"][index % 4],
    description: `Pagamento ${supplier.name}`,
    value: 450 + index * 190,
    dueDate: `2026-05-${String(8 + index).padStart(2, "0")}`,
    status: (index % 3 === 0 ? "vencido" : "pendente") as PaymentStatus,
    supplierId: supplier.id
  }))
];

export const technicalReports: TechnicalReport[] = serviceOrders.slice(0, 8).map((order, index) => ({
  id: `tr${index + 1}`,
  orderId: order.id,
  carId: order.carId,
  mechanicId: order.mechanicId,
  date: order.openedAt,
  diagnosis: order.diagnosis,
  probableCause: ["Desgaste natural", "Falha intermitente", "Falta de manutenção preventiva", "Peça com vida útil finalizada"][index % 4],
  tests: "Scanner, teste de rodagem e inspeção visual.",
  recommendedServices: "Executar serviços aprovados e revisar novamente após entrega.",
  recommendedParts: "Substituir peças com desgaste acima do limite.",
  conclusion: "Veículo apto para reparo conforme orçamento aprovado.",
  notes: "Laudo salvo no histórico do veículo."
}));
