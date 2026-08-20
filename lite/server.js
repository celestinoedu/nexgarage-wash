const http = require("http");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const publicRoot = path.join(__dirname, "..", "public");
const port = Number(process.env.PORT || 3030);
const dashboardPassword = process.env.NEXGARAGE_DASHBOARD_PASSWORD || "1234";

const statuses = ["Recebido", "Diagnostico", "Aguardando aprovacao", "Aguardando pecas", "Em execucao", "Finalizado", "Entregue", "Cancelado"];
const priorities = ["Baixa", "Normal", "Alta", "Urgente"];

const mechanics = [
  ["m1", "Ana Souza", "Diagnostico eletronico"],
  ["m2", "Bruno Lima", "Suspensao e freios"],
  ["m3", "Carlos Neri", "Motor"],
  ["m4", "Daniel Rocha", "Cambio"],
  ["m5", "Elaine Prado", "Eletrica"]
].map(([id, name, specialty], index) => ({ id, name, specialty, phone: `(11) 9000${index}-0000`, active: true }));

const customers = [
  "Mariana Alves", "Joao Pereira", "Auto Pecas Central", "Renata Costa", "Sergio Martins",
  "Camila Ribeiro", "Paulo Mendes", "Fernanda Castro", "Ricardo Gomes", "Luciana Farias"
].map((name, index) => ({
  id: `c${index + 1}`,
  name,
  whatsapp: `(11) 98${String(index + 811).padStart(3, "0")}-${String(1001 + index).padStart(4, "0")}`,
  email: index % 2 === 0 ? `${name.toLowerCase().split(" ")[0]}@email.com` : ""
}));

const carSeed = [
  ["ABC1D23", "Toyota", "Corolla", 2019, "Prata"], ["BEE4R10", "Fiat", "Argo", 2021, "Vermelho"],
  ["CDX7A91", "Volkswagen", "Saveiro", 2018, "Branco"], ["DDD2F44", "Honda", "Fit", 2017, "Cinza"],
  ["EFG8J55", "Chevrolet", "Onix", 2020, "Preto"], ["FRA3C16", "Hyundai", "HB20", 2022, "Azul"],
  ["GGH9B70", "Renault", "Duster", 2016, "Branco"], ["HJK1L82", "Jeep", "Renegade", 2021, "Verde"],
  ["IPQ5M03", "Ford", "Ka", 2015, "Prata"], ["JLA7N14", "Nissan", "Kicks", 2023, "Cinza"],
  ["KMO8P25", "Citroen", "C4 Cactus", 2020, "Marrom"], ["LUX2Q36", "Peugeot", "208", 2022, "Branco"]
];

const cars = carSeed.map(([plate, brand, model, year, color], index) => ({
  id: `car${index + 1}`,
  customerId: customers[index % customers.length].id,
  plate,
  brand,
  model,
  year,
  color,
  mileage: 22000 + index * 8700
}));

const parts = [
  "Filtro de oleo", "Filtro de ar", "Pastilha dianteira", "Disco de freio", "Vela de ignicao", "Bateria 60Ah",
  "Amortecedor dianteiro", "Correia dentada", "Oleo 5W30", "Aditivo radiador", "Lampada H7", "Sensor ABS",
  "Bomba d'agua", "Coxim motor", "Kit embreagem", "Pneu 195/55"
].map((name, index) => ({
  id: `p${index + 1}`,
  name,
  code: `NX-${String(index + 1).padStart(4, "0")}`,
  category: ["Filtros", "Freios", "Eletrica", "Motor", "Suspensao"][index % 5],
  stockQty: [2, 4, 11, 6, 18, 3, 7, 5][index % 8],
  minStock: [3, 5, 4, 4][index % 4],
  salePrice: 49 + index * 17,
  location: `Rua ${String.fromCharCode(65 + (index % 4))}-${index + 1}`
}));

const services = [
  ["Troca de oleo", 90, 1], ["Revisao de freios", 180, 2], ["Diagnostico eletronico", 150, 1.5],
  ["Suspensao dianteira", 360, 3], ["Troca de correia dentada", 520, 4], ["Manutencao arrefecimento", 260, 2.5],
  ["Troca de bateria", 60, 0.5], ["Alinhamento e balanceamento", 160, 1.5], ["Reparo de embreagem", 780, 6], ["Laudo tecnico", 220, 1]
].map(([name, laborPrice, hours], index) => ({ id: `sv${index + 1}`, name, laborPrice, hours, category: index % 2 ? "Corretiva" : "Preventiva" }));

let serviceOrders = Array.from({ length: 20 }, (_, index) => {
  const service = services[index % services.length];
  const part = parts[index % parts.length];
  const laborValue = Number(service.laborPrice);
  const partsValue = part.salePrice + (index % 3) * 120;
  const mechanicCommissionPercent = [30, 35, 40, 45][index % 4];
  return {
    id: `os${index + 1}`,
    code: `OS-${String(1024 + index).padStart(5, "0")}`,
    customerId: customers[index % customers.length].id,
    carId: cars[index % cars.length].id,
    mechanicId: mechanics[index % mechanics.length].id,
    status: statuses[index % statuses.length],
    priority: priorities[index % priorities.length],
    dueDate: `2026-05-${String(7 + (index % 17)).padStart(2, "0")}`,
    issue: ["Barulho ao frear", "Luz de injecao acesa", "Revisao periodica", "Superaquecimento"][index % 4],
    diagnosis: ["Aguardando inspecao", "Falha no scanner", "Desgaste identificado", "Sistema em teste"][index % 4],
    laborValue,
    partsValue,
    mechanicCommissionPercent,
    mechanicCommissionValue: laborValue * (mechanicCommissionPercent / 100),
    totalValue: laborValue + partsValue,
    financialStatus: ["pendente", "pago", "vencido", "parcial"][index % 4],
    services: [service.id],
    parts: [part.id],
    customParts: []
  };
});

const suppliers = ["Distribuidora Rapida", "Freios Prime", "Auto Eletrica Max", "Oleos Norte", "Suspensao Total", "Motor Parts", "Arrefecimento Sul", "Cambio Certo"]
  .map((name, index) => ({ id: `s${index + 1}`, name, category: ["Filtros", "Freios", "Eletrica", "Lubrificantes"][index % 4], whatsapp: `(11) 9777${index}-0000` }));

let budgets = serviceOrders.slice(0, 5).map((order, index) => ({
  id: `orc${index + 1}`,
  code: `ORC-${String(2048 + index).padStart(5, "0")}`,
  customerId: order.customerId,
  carId: order.carId,
  mechanicId: order.mechanicId,
  status: index % 2 === 0 ? "Aguardando aprovacao" : "Aprovado",
  laborValue: order.laborValue,
  partsValue: order.partsValue,
  mechanicCommissionPercent: order.mechanicCommissionPercent,
  mechanicCommissionValue: order.mechanicCommissionValue,
  totalValue: order.totalValue,
  notes: order.issue
}));

const transactions = serviceOrders.slice(0, 14).map((order, index) => ({
  id: `f${index + 1}`,
  type: "receita",
  description: `Receita ${order.code}`,
  value: order.totalValue,
  status: order.financialStatus,
  dueDate: order.dueDate
})).concat(suppliers.slice(0, 6).map((supplier, index) => ({
  id: `d${index + 1}`,
  type: "despesa",
  description: `Fornecedor ${supplier.name}`,
  value: 420 + index * 230,
  status: index % 3 === 0 ? "vencido" : "pendente",
  dueDate: `2026-05-${String(9 + index).padStart(2, "0")}`
})));

const data = { statuses, priorities, mechanics, customers, cars, parts, services, suppliers };

function json(response, body, status = 200) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  response.end(JSON.stringify(body));
}

function readBody(request) {
  return new Promise((resolve) => {
    let body = "";
    request.on("data", (chunk) => { body += chunk; });
    request.on("end", () => resolve(body ? JSON.parse(body) : {}));
  });
}

function sendFile(response, filePath) {
  const ext = path.extname(filePath);
  const type = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".png": "image/png", ".svg": "image/svg+xml" }[ext] || "application/octet-stream";
  fs.readFile(filePath, (error, content) => {
    if (error) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }
    response.writeHead(200, { "content-type": `${type}; charset=utf-8` });
    response.end(content);
  });
}

function makeWorkItem(body, type) {
  const customParts = String(body.customParts || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  customParts.forEach((partName) => {
    parts.push({
      id: `p${parts.length + 1}`,
      name: partName,
      code: `NX-${String(parts.length + 1).padStart(4, "0")}`,
      category: "Avulsa",
      stockQty: 0,
      minStock: 0,
      salePrice: 0,
      location: type === "order" ? "Lancada na OS" : "Lancada no orcamento"
    });
  });

  const laborValue = Number(body.laborValue || 0);
  const partsValue = Number(body.partsValue || 0);
  const mechanicCommissionPercent = Number(body.mechanicCommissionPercent || 0);

  return {
    customerId: body.customerId || customers[0].id,
    carId: body.carId || cars[0].id,
    mechanicId: body.mechanicId || mechanics[0].id,
    priority: body.priority || "Normal",
    dueDate: body.dueDate || new Date().toISOString().slice(0, 10),
    issue: body.issue || body.notes || "Lancamento rapido",
    laborValue,
    partsValue,
    mechanicCommissionPercent,
    mechanicCommissionValue: laborValue * (mechanicCommissionPercent / 100),
    totalValue: laborValue + partsValue,
    services: body.services || [],
    parts: body.parts || [],
    customParts
  };
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);

  if (url.pathname === "/api/health") return json(response, { ok: true, app: "NexGarage Lite" });
  if (url.pathname === "/api/data") return json(response, { ...data, serviceOrders, budgets });

  if (url.pathname === "/api/financial" && request.method === "POST") {
    const body = await readBody(request);
    if (body.password !== dashboardPassword) return json(response, { ok: false, message: "Senha invalida" }, 401);
    return json(response, { ok: true, transactions });
  }

  if (url.pathname === "/api/orders/status" && request.method === "POST") {
    const body = await readBody(request);
    serviceOrders = serviceOrders.map((order) => order.id === body.id ? { ...order, status: body.status } : order);
    return json(response, { ok: true, order: serviceOrders.find((order) => order.id === body.id) });
  }

  if (url.pathname === "/api/orders" && request.method === "POST") {
    const item = makeWorkItem(await readBody(request), "order");
    const order = {
      ...item,
      id: `os${serviceOrders.length + 1}`,
      code: `OS-${String(1024 + serviceOrders.length).padStart(5, "0")}`,
      status: "Recebido",
      diagnosis: "",
      financialStatus: "pendente"
    };
    serviceOrders.unshift(order);
    return json(response, { ok: true, order });
  }

  if (url.pathname === "/api/budgets" && request.method === "POST") {
    const item = makeWorkItem(await readBody(request), "budget");
    const budget = {
      ...item,
      id: `orc${budgets.length + 1}`,
      code: `ORC-${String(2048 + budgets.length).padStart(5, "0")}`,
      status: "Aguardando aprovacao",
      notes: item.issue
    };
    budgets.unshift(budget);
    return json(response, { ok: true, budget });
  }

  if (url.pathname.startsWith("/branding/")) return sendFile(response, path.join(publicRoot, url.pathname));
  const filePath = url.pathname === "/" ? path.join(root, "index.html") : path.join(root, url.pathname);
  return sendFile(response, filePath);
});

server.listen(port, () => {
  console.log(`NexGarage Lite em http://localhost:${port}`);
});
