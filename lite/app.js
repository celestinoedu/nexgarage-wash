const state = {
  view: "kanban",
  data: null,
  financial: null,
  search: "",
  mechanic: "todos",
  priority: "todas"
};

const menu = [
  ["kanban", "01", "Controle"],
  ["orders", "02", "OS"],
  ["budgets", "03", "Orcamentos"],
  ["dashboard", "04", "Dashboard"],
  ["customers", "05", "Clientes"],
  ["cars", "06", "Carros"],
  ["parts", "07", "Pecas"],
  ["services", "08", "Servicos"],
  ["mechanics", "09", "Mecanicos"],
  ["suppliers", "10", "Fornecedores"],
  ["inventory", "11", "Estoque"],
  ["technical", "12", "Laudos"],
  ["finance", "13", "Financeiro"],
  ["reports", "14", "Relatorios"],
  ["settings", "15", "Ajustes"]
];

const bottom = ["kanban", "orders", "budgets", "parts", "finance"];
const $ = (selector) => document.querySelector(selector);
const money = (value) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value || 0));
const date = (value) => new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(new Date(`${value}T12:00:00`));
const byId = (items) => Object.fromEntries(items.map((item) => [item.id, item]));
const late = (order) => !["Finalizado", "Entregue", "Cancelado"].includes(order.status) && new Date(`${order.dueDate}T23:59:59`) < new Date("2026-05-20T12:00:00");

function maps() {
  return {
    customers: byId(state.data.customers),
    cars: byId(state.data.cars),
    mechanics: byId(state.data.mechanics),
    parts: byId(state.data.parts),
    services: byId(state.data.services)
  };
}

function setView(view) {
  state.view = view;
  document.body.classList.remove("menu-open");
  render();
}

function renderNav() {
  const nav = menu.map(([id, icon, label]) => `
    <button class="nav-item ${state.view === id ? "active" : ""}" data-view="${id}">
      <span class="nav-icon">${icon}</span>${label}
    </button>
  `).join("");
  $("#menu").innerHTML = nav;
  $("#bottomNav").innerHTML = bottom.map((id) => {
    const item = menu.find(([view]) => view === id);
    return `<button data-view="${id}"><span class="nav-icon">${item[1]}</span><br>${item[2]}</button>`;
  }).join("");
  document.querySelectorAll("[data-view]").forEach((button) => button.onclick = () => setView(button.dataset.view));
}

function orderText(order) {
  const m = maps();
  const car = m.cars[order.carId];
  const customer = m.customers[order.customerId];
  const mechanic = m.mechanics[order.mechanicId];
  return `${order.code} ${car?.plate} ${car?.model} ${customer?.name} ${mechanic?.name}`.toLowerCase();
}

function filteredOrders() {
  return state.data.serviceOrders.filter((order) =>
    orderText(order).includes(state.search.toLowerCase()) &&
    (state.mechanic === "todos" || order.mechanicId === state.mechanic) &&
    (state.priority === "todas" || order.priority === state.priority)
  );
}

function metric(title, value, detail = "", tone = "") {
  return `<article class="card metric ${tone}"><small>${title}</small><strong>${value}</strong><span>${detail}</span></article>`;
}

function orderCard(order) {
  const m = maps();
  const car = m.cars[order.carId];
  const customer = m.customers[order.customerId];
  const mechanic = m.mechanics[order.mechanicId];
  return `
    <article class="order-card ${late(order) ? "late" : ""}" draggable="true" data-order="${order.id}">
      <div class="order-top"><b>${order.code}</b>${priorityIcon(order.priority)}</div>
      <div class="plate">${car?.plate || "SEM PLACA"}</div>
      <b>${customer?.name || "Cliente"}</b>
      <span class="muted">${car?.brand || ""} ${car?.model || ""} - ${mechanic?.name || "Sem mecanico"}</span>
      <span class="muted">Entrega ${date(order.dueDate)} - ${money(order.totalValue)}</span>
      <span class="muted">Comissao mao de obra: ${money(order.mechanicCommissionValue)} (${order.mechanicCommissionPercent || 0}%)</span>
      ${late(order) ? `<span class="badge Urgente">Atrasada</span>` : ""}
    </article>
  `;
}

function priorityIcon(priority) {
  return `<span class="priority-icon priority-${priority}" title="${priority}" aria-label="Prioridade ${priority}"></span>`;
}

function visibleNotice(hiddenCount) {
  return hiddenCount > 0 ? `<div class="more-count">+${hiddenCount} itens</div>` : "";
}

function lockedPanel(title, detail) {
  return `
    <section class="lock-card card">
      <h2>${title}</h2>
      <p class="muted">${detail}</p>
      <div class="unlock-row">
        <input id="dashboardPassword" type="password" placeholder="Senha do dashboard">
        <button class="button" id="unlockDashboard">Entrar</button>
      </div>
      <small class="muted">Senha temporaria do MVP: 1234. No backend real, isso vira login por usuario e permissao.</small>
    </section>
  `;
}

async function unlockFinancial() {
  const password = $("#dashboardPassword")?.value || "";
  const response = await fetch("/api/financial", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ password })
  });
  if (!response.ok) {
    alert("Senha invalida.");
    return;
  }
  const data = await response.json();
  state.financial = { transactions: data.transactions };
  render();
}

function dashboard() {
  if (!state.financial) return lockedPanel("Dashboard protegido", "Esta area contem faturamento, lucro, pendencias e outros dados financeiros.");
  const orders = state.data.serviceOrders;
  const transactions = state.financial.transactions;
  const revenue = transactions.filter((item) => item.type === "receita").reduce((sum, item) => sum + item.value, 0);
  const expense = transactions.filter((item) => item.type === "despesa").reduce((sum, item) => sum + item.value, 0);
  const pending = transactions.filter((item) => item.type === "receita" && item.status !== "pago").reduce((sum, item) => sum + item.value, 0);
  const lowParts = state.data.parts.filter((part) => part.stockQty <= part.minStock);
  const open = orders.filter((order) => !["Entregue", "Cancelado"].includes(order.status)).length;
  const lateOrders = orders.filter(late).length;
  return `
    <div class="grid cards">
      ${metric("Faturamento do mes", money(revenue), "Receitas de OS", "tone-green")}
      ${metric("Receitas pendentes", money(pending), "A receber", "tone-amber")}
      ${metric("Lucro estimado", money(revenue - expense), "Receitas - despesas")}
      ${metric("OS atrasadas", lateOrders, "Precisam de acao", lateOrders ? "tone-red" : "tone-green")}
      ${metric("Ticket medio", money(revenue / Math.max(1, orders.length)), "Por ordem")}
      ${metric("OS abertas", open, "Em operacao")}
      ${metric("Pecas baixo estoque", lowParts.length, "Reposicao", "tone-amber")}
      ${metric("Mecanico destaque", "Ana", "Maior receita")}
    </div>
    <div class="grid two" style="margin-top:14px">
      <section class="panel card"><h2>Demanda por mecanico</h2>${mechanicDemand()}</section>
      <section class="panel card"><h2>Reposicao rapida</h2><div class="list">${lowParts.map((part) => `<div class="row-card card"><div><strong>${part.name}</strong><div class="row-meta">${part.code} - ${part.location}</div></div><span class="pill danger-pill">${part.stockQty}/${part.minStock}</span></div>`).join("")}</div></section>
    </div>
  `;
}

function kanban() {
  return `
    <div class="toolbar control-toolbar">
      <input id="boardSearch" placeholder="Buscar placa, cliente ou OS" value="${state.search}">
      <select id="mechanicFilter"><option value="todos">Todos mecanicos</option>${state.data.mechanics.map((m) => `<option value="${m.id}" ${state.mechanic === m.id ? "selected" : ""}>${m.name}</option>`).join("")}</select>
      <select id="priorityFilter"><option value="todas">Todas prioridades</option>${state.data.priorities.map((p) => `<option ${state.priority === p ? "selected" : ""}>${p}</option>`).join("")}</select>
    </div>
    <div class="kanban-frame">
      <div class="kanban">
        ${state.data.statuses.map((status) => {
          const orders = filteredOrders().filter((order) => order.status === status);
          return `<section class="column" data-status="${status}">
            <div class="column-title"><span>${status}</span><span class="count">${orders.length}</span></div>
            <div class="column-scroll">${orders.map(orderCard).join("")}</div>
          </section>`;
        }).join("")}
      </div>
    </div>
  `;
}

function printDocument(kind, item) {
  const m = maps();
  const car = m.cars[item.carId];
  const customer = m.customers[item.customerId];
  const mechanic = m.mechanics[item.mechanicId];
  const title = kind === "budget" ? "ORCAMENTO" : "ORDEM DE SERVICO";
  const html = `
    <html><head><title>${title} ${item.code}</title><style>
      body{font-family:Arial,sans-serif;padding:28px;color:#111827}
      h1{margin:0 0 8px;font-size:24px}.box{border:1px solid #d1d5db;border-radius:8px;padding:14px;margin-top:12px}
      .row{display:flex;justify-content:space-between;gap:20px}.total{font-size:22px;font-weight:800}
      @media print{button{display:none}}
    </style></head><body>
      <h1>${title} - ${item.code}</h1>
      <p>NexGarage - LOTUS NEGOCIOS LTDA</p>
      <div class="box"><b>Cliente:</b> ${customer?.name || ""}<br><b>Carro:</b> ${car?.plate || ""} - ${car?.brand || ""} ${car?.model || ""}<br><b>Mecanico:</b> ${mechanic?.name || ""}</div>
      <div class="box"><b>Descricao:</b><br>${item.issue || item.notes || ""}</div>
      <div class="box">
        <div class="row"><span>Mao de obra</span><b>${money(item.laborValue)}</b></div>
        <div class="row"><span>Pecas</span><b>${money(item.partsValue)}</b></div>
        <div class="row"><span>Comissao mecanico</span><b>${money(item.mechanicCommissionValue)} (${item.mechanicCommissionPercent || 0}%)</b></div>
        <hr><div class="row total"><span>Total</span><span>${money(item.totalValue)}</span></div>
      </div>
      <button onclick="window.print()">Imprimir ou salvar em PDF</button>
      <script>window.print()</script>
    </body></html>`;
  const popup = window.open("", "_blank");
  popup.document.write(html);
  popup.document.close();
}

function workForm(kind) {
  const isBudget = kind === "budget";
  return `
    <section class="panel form work-form">
      <h2>${isBudget ? "Novo orcamento" : "Nova ordem de servico"}</h2>
      <div class="form-grid">
        <select id="${kind}Customer">${state.data.customers.map((c) => `<option value="${c.id}">${c.name}</option>`).join("")}</select>
        <select id="${kind}Car">${state.data.cars.map((c) => `<option value="${c.id}">${c.plate} - ${c.model}</option>`).join("")}</select>
        <select id="${kind}Mechanic">${state.data.mechanics.map((m) => `<option value="${m.id}">${m.name}</option>`).join("")}</select>
        <select id="${kind}Priority">${state.data.priorities.map((p) => `<option>${p}</option>`).join("")}</select>
        <input id="${kind}DueDate" type="date">
        <input id="${kind}Labor" type="number" min="0" step="0.01" placeholder="Mao de obra R$">
        <input id="${kind}PartsValue" type="number" min="0" step="0.01" placeholder="Valor das pecas R$">
        <input id="${kind}Commission" type="number" min="0" max="100" step="1" placeholder="% mecanico">
        <select id="${kind}Part">${state.data.parts.map((p) => `<option value="${p.id}">${p.name} - ${money(p.salePrice)}</option>`).join("")}</select>
        <input id="${kind}CustomParts" placeholder="Pecas novas, separadas por virgula">
        <textarea class="wide" id="${kind}Issue" placeholder="${isBudget ? "Descricao do orcamento" : "Problema relatado e servico executado"}"></textarea>
      </div>
      <div class="form-actions">
        <button class="button" id="${kind}Save">${isBudget ? "Salvar orcamento" : "Abrir OS"}</button>
        <button class="button secondary" id="${kind}Print" type="button">Imprimir PDF</button>
      </div>
    </section>
  `;
}

async function saveWork(kind, printAfter = false) {
  const body = {
    customerId: $(`#${kind}Customer`).value,
    carId: $(`#${kind}Car`).value,
    mechanicId: $(`#${kind}Mechanic`).value,
    priority: $(`#${kind}Priority`).value,
    dueDate: $(`#${kind}DueDate`).value,
    laborValue: $(`#${kind}Labor`).value,
    partsValue: $(`#${kind}PartsValue`).value,
    mechanicCommissionPercent: $(`#${kind}Commission`).value,
    parts: [$(`#${kind}Part`).value],
    customParts: $(`#${kind}CustomParts`).value,
    issue: $(`#${kind}Issue`).value,
    notes: $(`#${kind}Issue`).value
  };
  const endpoint = kind === "budget" ? "/api/budgets" : "/api/orders";
  const response = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = await response.json();
  await refreshData();
  const item = data.order || data.budget;
  if (printAfter && item) printDocument(kind, item);
  state.view = kind === "budget" ? "budgets" : "orders";
  render();
}

function orders() {
  const orders = filteredOrders();
  const visible = orders.slice(0, 6);
  return `
    <div class="grid two os-layout">
      <section>
        <div class="toolbar" style="grid-template-columns:1fr auto auto">
          <input id="orderSearch" placeholder="Buscar OS, placa ou cliente" value="${state.search}">
          <button class="button" data-view="new-order">+ Nova OS</button>
          <button class="button secondary" onclick="window.print()">Imprimir lista</button>
        </div>
        <div class="list">${visible.map((order) => `<div class="printable-row">${orderCard(order)}<button class="button secondary small-print" data-print-order="${order.id}">PDF</button></div>`).join("")}${visibleNotice(orders.length - visible.length)}</div>
      </section>
      ${workForm("order")}
    </div>
  `;
}

function budgets() {
  const m = maps();
  const visible = state.data.budgets.slice(0, 6);
  return `
    <div class="grid two os-layout">
      <section>
        <div class="toolbar" style="grid-template-columns:1fr auto">
          <input placeholder="Buscar orcamento">
          <button class="button secondary" onclick="window.print()">Imprimir lista</button>
        </div>
        <div class="list">${visible.map((item) => `
          <article class="row-card card">
            <div><strong>${item.code} - ${m.cars[item.carId]?.plate}</strong><div class="row-meta">${m.customers[item.customerId]?.name} - ${m.mechanics[item.mechanicId]?.name} - ${item.status}</div></div>
            <div class="row-actions"><span class="pill">${money(item.totalValue)}</span><button class="button secondary small-print" data-print-budget="${item.id}">PDF</button></div>
          </article>`).join("")}${visibleNotice(state.data.budgets.length - visible.length)}</div>
      </section>
      ${workForm("budget")}
    </div>
  `;
}

function simpleList(title, items, renderItem, formHtml = "") {
  const visible = items.slice(0, 8);
  return `<div class="grid two"><section><div class="toolbar" style="grid-template-columns:1fr auto"><input placeholder="Buscar ${title.toLowerCase()}"><button class="button">+ Novo</button></div><div class="list">${visible.map(renderItem).join("")}${visibleNotice(items.length - visible.length)}</div></section>${formHtml}</div>`;
}

function form(title, fields) {
  return `<aside class="panel form"><h2>${title}</h2><div class="form-grid">${fields.map((field) => field === "obs" ? `<textarea class="wide" placeholder="Observacoes"></textarea>` : `<input placeholder="${field}">`).join("")}</div><button class="button">Salvar</button></aside>`;
}

function customers() {
  return simpleList("clientes", state.data.customers, (item) => `<article class="row-card card"><div><strong>${item.name}</strong><div class="row-meta">${item.whatsapp} - ${item.email || "sem e-mail"}</div></div><span class="pill">${state.data.cars.filter((car) => car.customerId === item.id).length} carros</span></article>`, form("Cliente", ["Nome", "WhatsApp", "E-mail opcional", "CPF/CNPJ opcional", "obs"]));
}

function cars() {
  const customersMap = byId(state.data.customers);
  return simpleList("carros", state.data.cars, (car) => `<article class="row-card card"><div><strong>${car.plate} - ${car.brand} ${car.model}</strong><div class="row-meta">${customersMap[car.customerId].name} - ${car.year} - ${car.mileage.toLocaleString("pt-BR")} km</div></div><span class="pill">${car.color}</span></article>`, form("Carro", ["Placa", "Cliente", "Marca", "Modelo", "Ano", "Quilometragem", "obs"]));
}

function parts() {
  return simpleList("pecas", state.data.parts, (part) => `<article class="row-card card"><div><strong>${part.name}</strong><div class="row-meta">${part.code} - ${part.category} - ${part.location}</div></div><span class="pill ${part.stockQty <= part.minStock ? "danger-pill" : ""}">${part.stockQty} un.</span></article>`, form("Peca", ["Nome", "Codigo", "Categoria", "Fornecedor", "Quantidade", "Estoque minimo", "Preco venda", "Localizacao"]));
}

function services() {
  return simpleList("servicos", state.data.services, (service) => `<article class="row-card card"><div><strong>${service.name}</strong><div class="row-meta">${service.category} - ${service.hours}h estimadas</div></div><span class="pill">${money(service.laborPrice)}</span></article>`, form("Servico", ["Nome", "Categoria", "Tempo medio", "Valor padrao", "obs"]));
}

function mechanicDemand() {
  return `<div class="mini-chart">${state.data.mechanics.map((mechanic) => {
    const orders = state.data.serviceOrders.filter((order) => order.mechanicId === mechanic.id && !["Entregue", "Cancelado"].includes(order.status));
    const percent = Math.min(100, orders.length * 20);
    return `<div class="bar-line"><span>${mechanic.name.split(" ")[0]}</span><div class="bar"><span style="width:${percent}%"></span></div><b>${orders.length} OS</b></div>`;
  }).join("")}</div>`;
}

function mechanics() {
  return `<div class="grid">${mechanicDemand()}</div><div style="height:14px"></div>` + simpleList("mecanicos", state.data.mechanics, (mechanic) => `<article class="row-card card"><div><strong>${mechanic.name}</strong><div class="row-meta">${mechanic.specialty} - ${mechanic.phone}</div></div><span class="pill">ativo</span></article>`, form("Mecanico", ["Nome", "Telefone", "E-mail", "Especialidade", "% padrao mao de obra", "obs"]));
}

function finance() {
  if (!state.financial) return lockedPanel("Financeiro protegido", "Contas, recebiveis e faturamento exigem senha.");
  const visible = state.financial.transactions.slice(0, 10);
  return `<div class="list">${visible.map((item) => `<article class="row-card card"><div><strong>${item.description}</strong><div class="row-meta">${item.type} - vence ${date(item.dueDate)} - ${item.status}</div></div><span class="pill ${item.type === "despesa" ? "danger-pill" : ""}">${money(item.value)}</span></article>`).join("")}${visibleNotice(state.financial.transactions.length - visible.length)}</div>`;
}

function newOrder() {
  return `<div class="grid two">${workForm("order")}<section class="card"><h2>Fluxo simples</h2><p class="muted">Abra a OS, lance pecas cadastradas ou novas, informe o mecanico e a porcentagem combinada da mao de obra.</p></section></div>`;
}

function placeholder(title, text) {
  return `<section class="card"><h2>${title}</h2><p class="muted">${text}</p></section>`;
}

async function refreshData() {
  state.data = await fetch("/api/data").then((response) => response.json());
}

function render() {
  if (!state.data) return;
  const title = menu.find(([id]) => id === state.view)?.[2] || "Nova OS";
  $("#pageTitle").textContent = title;
  renderNav();
  const views = {
    kanban, orders, budgets, dashboard, customers, cars, parts, services, mechanics, finance,
    suppliers: () => simpleList("fornecedores", state.data.suppliers, (item) => `<article class="row-card card"><div><strong>${item.name}</strong><div class="row-meta">${item.category} - ${item.whatsapp}</div></div><span class="pill">fornecedor</span></article>`, form("Fornecedor", ["Nome/Razao social", "Contato", "WhatsApp", "E-mail", "Categoria", "obs"])),
    inventory: parts,
    technical: () => placeholder("Laudos tecnicos", "Tela preparada para diagnostico, causa provavel, testes realizados, pecas recomendadas e impressao em PDF."),
    reports: () => `<div class="grid two"><section class="card"><h2>Produtividade</h2>${mechanicDemand()}</section><section class="card"><h2>Pecas mais usadas</h2>${state.data.parts.slice(0,8).map((part, index) => `<p class="row-meta">${part.name} - ${18 - index} usos</p>`).join("")}</section></div>`,
    settings: () => placeholder("Ajustes e permissoes", "Admin, atendente, mecanico, estoquista e financeiro com permissoes separadas."),
    "new-order": newOrder
  };
  $("#view").innerHTML = (views[state.view] || kanban)();
  bindViewEvents();
}

function bindViewEvents() {
  const boardSearch = $("#boardSearch") || $("#orderSearch");
  if (boardSearch) boardSearch.oninput = (event) => { state.search = event.target.value; render(); };
  const mechanicFilter = $("#mechanicFilter");
  if (mechanicFilter) mechanicFilter.onchange = (event) => { state.mechanic = event.target.value; render(); };
  const priorityFilter = $("#priorityFilter");
  if (priorityFilter) priorityFilter.onchange = (event) => { state.priority = event.target.value; render(); };
  const unlock = $("#unlockDashboard");
  if (unlock) unlock.onclick = unlockFinancial;

  ["order", "budget"].forEach((kind) => {
    const save = $(`#${kind}Save`);
    const print = $(`#${kind}Print`);
    if (save) save.onclick = () => saveWork(kind, false);
    if (print) print.onclick = () => saveWork(kind, true);
  });

  document.querySelectorAll("[data-print-order]").forEach((button) => {
    button.onclick = () => printDocument("order", state.data.serviceOrders.find((order) => order.id === button.dataset.printOrder));
  });
  document.querySelectorAll("[data-print-budget]").forEach((button) => {
    button.onclick = () => printDocument("budget", state.data.budgets.find((budget) => budget.id === button.dataset.printBudget));
  });

  document.querySelectorAll(".order-card").forEach((card) => {
    card.addEventListener("dragstart", (event) => event.dataTransfer.setData("text/plain", card.dataset.order));
  });
  document.querySelectorAll(".column").forEach((column) => {
    column.addEventListener("dragover", (event) => { event.preventDefault(); column.classList.add("drag-over"); });
    column.addEventListener("dragleave", () => column.classList.remove("drag-over"));
    column.addEventListener("drop", async (event) => {
      event.preventDefault();
      const id = event.dataTransfer.getData("text/plain");
      const status = column.dataset.status;
      await fetch("/api/orders/status", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, status }) });
      const order = state.data.serviceOrders.find((item) => item.id === id);
      if (order) order.status = status;
      render();
    });
  });
}

$("#menuButton").onclick = () => document.body.classList.toggle("menu-open");
refreshData().then(render);
