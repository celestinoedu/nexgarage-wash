import * as db from "./db.js";
import { $, $$, money, dateBR, today, esc, norm, toast, openModal, closeModal, confirmDialog, formData } from "./ui.js";
import { renderNovoRegistro } from "./novo.js";

const MENU = [
  ["dashboard", "🏠", "Início"],
  ["atendimentos", "🧾", "Atendimentos"],
  ["clientes", "👤", "Clientes"],
  ["carros", "🚗", "Carros"],
  ["parceiros", "🤝", "Parceiros"],
  ["funcionarios", "👷", "Funcionários"],
  ["presenca", "📋", "Presença"],
  ["servicos", "🧴", "Serviços"],
  ["financeiro", "💰", "Financeiro"],
];

const state = { session: null };

// ============================================================ BOOTSTRAP
async function boot() {
  if (!db.isConfigured) return renderSetup();
  state.session = await db.auth.session();
  db.auth.onChange((s) => {
    state.session = s;
    s ? renderShell() : renderLogin();
  });
  state.session ? renderShell() : renderLogin();
}

function renderSetup() {
  $("#app").innerHTML = `
    <div class="auth">
      <div class="auth-card">
        <div class="brand">🚿 Lava Rápidos</div>
        <h2>Configuração necessária</h2>
        <p class="muted">Preencha <code>app/config.js</code> com a URL e a anon key do seu projeto
        Supabase. Veja o <strong>README</strong> para o passo a passo (2 minutos).</p>
      </div>
    </div>`;
}

function renderLogin() {
  $("#app").innerHTML = `
    <div class="auth">
      <form class="auth-card" id="loginForm">
        <div class="brand">🚿 Lava Rápidos</div>
        <p class="muted">Top Line Higienizações</p>
        <label>E-mail<input name="email" type="email" required autocomplete="username" /></label>
        <label>Senha<input name="password" type="password" required autocomplete="current-password" /></label>
        <button class="btn primary block" type="submit">Entrar</button>
        <p class="err" id="loginErr"></p>
      </form>
    </div>`;
  $("#loginForm").onsubmit = async (e) => {
    e.preventDefault();
    const { email, password } = formData(e.target);
    const { error } = await db.auth.signIn(email, password);
    if (error) $("#loginErr").textContent = "E-mail ou senha inválidos.";
  };
}

function renderShell() {
  $("#app").innerHTML = `
    <div class="shell">
      <aside class="sidebar" id="sidebar">
        <div class="brand">🚿 Lava Rápidos</div>
        <nav id="nav"></nav>
        <button class="btn ghost block" id="logout">Sair</button>
      </aside>
      <div class="backdrop-nav" id="navBackdrop"></div>
      <main class="main">
        <header class="topbar">
          <button class="icon-btn only-mobile" id="menuBtn">☰</button>
          <h1 id="pageTitle">Início</h1>
          <button class="btn primary" id="novoBtn">+ Novo Registro</button>
        </header>
        <section id="view" class="view"></section>
      </main>
    </div>`;

  $("#nav").innerHTML = MENU.map(
    ([id, ic, label]) => `<button class="nav-item" data-route="${id}"><span>${ic}</span>${label}</button>`
  ).join("");

  $("#logout").onclick = () => db.auth.signOut();
  $("#novoBtn").onclick = () => renderNovoRegistro({ onSaved: () => route() });
  $("#menuBtn").onclick = () => document.body.classList.toggle("nav-open");
  $("#navBackdrop").onclick = () => document.body.classList.remove("nav-open");
  $$("[data-route]").forEach((b) => (b.onclick = () => { location.hash = b.dataset.route; }));

  window.onhashchange = route;
  route();
}

// ============================================================ ROUTER
const ROUTES = {
  dashboard: viewDashboard,
  atendimentos: viewAtendimentos,
  clientes: viewClientes,
  carros: viewCarros,
  parceiros: viewParceiros,
  funcionarios: viewFuncionarios,
  presenca: viewPresenca,
  servicos: viewServicos,
  financeiro: viewFinanceiro,
};

async function route() {
  const id = (location.hash.replace("#", "") || "dashboard");
  const fn = ROUTES[id] || viewDashboard;
  document.body.classList.remove("nav-open");
  $$("[data-route]").forEach((b) => b.classList.toggle("active", b.dataset.route === id));
  const item = MENU.find((m) => m[0] === id);
  $("#pageTitle").textContent = item ? item[2] : "Início";
  $("#view").innerHTML = `<div class="loading">Carregando…</div>`;
  try {
    await fn();
  } catch (e) {
    console.error(e);
    $("#view").innerHTML = `<div class="empty">Erro ao carregar: ${esc(e.message || e)}</div>`;
  }
}

// helpers de listagem
const card = (inner) => `<div class="card">${inner}</div>`;
const kpi = (label, value, hint = "") =>
  `<div class="kpi"><span class="kpi-label">${esc(label)}</span><strong>${value}</strong>${
    hint ? `<small>${esc(hint)}</small>` : ""
  }</div>`;

// ============================================================ DASHBOARD
async function viewDashboard() {
  const [ats, oportRaw, rateio] = await Promise.all([
    db.atendimentos.list(500),
    db.views.ultimaLavagem(),
    db.views.rateio(),
  ]);
  const hoje = today();
  const mesAtual = hoje.slice(0, 7);
  const doMes = ats.filter((a) => String(a.data).slice(0, 7) === mesAtual);
  const carrosHoje = ats.filter((a) => String(a.data).slice(0, 10) === hoje).length;
  const faturMes = doMes.reduce((s, a) => s + Number(a.valor || 0), 0);
  const pendentes = ats.filter((a) => a.status_pg === "PENDENTE");
  const pendValor = pendentes.reduce((s, a) => s + Number(a.valor || 0), 0);

  const opor = (oportRaw || []).filter((o) => o.dias_sem_lavar >= 15);
  const r = (rateio || []).find((x) => String(x.mes).slice(0, 7) === mesAtual) || {};

  $("#view").innerHTML = `
    <div class="kpis">
      ${kpi("Carros hoje", carrosHoje)}
      ${kpi("Carros no mês", doMes.length)}
      ${kpi("Faturamento mês", money(faturMes))}
      ${kpi("A receber", money(pendValor), `${pendentes.length} pendência(s)`)}
    </div>

    <div class="grid-2">
      ${card(`
        <div class="card-head"><h3>🎯 Oportunidades</h3><span class="badge">${opor.length}</span></div>
        <p class="muted small">Clientes há 15+ dias sem lavar — hora de chamar de volta.</p>
        <div class="list">
          ${
            opor.length
              ? opor
                  .slice(0, 30)
                  .map((o) => {
                    const tel = (o.telefone || "").replace(/\D/g, "");
                    const wa = tel ? `https://wa.me/55${tel}` : null;
                    return `<div class="list-row">
                      <div><strong>${esc(o.nome)}</strong><br><small class="muted">${o.dias_sem_lavar} dias · última ${dateBR(o.ultima_data)}</small></div>
                      <div class="row gap">
                        ${o.telefone ? `<span class="muted small">${esc(o.telefone)}</span>` : ""}
                        ${wa ? `<a class="btn small wa" href="${wa}" target="_blank" rel="noopener">WhatsApp</a>` : ""}
                      </div>
                    </div>`;
                  })
                  .join("")
              : `<div class="empty">Nenhuma oportunidade no momento 🎉</div>`
          }
        </div>
      `)}

      ${card(`
        <div class="card-head"><h3>👥 Distribuição de lucro (mês)</h3></div>
        <p class="muted small">Sobre as entradas. Base antiga (tag Yuri): Rennan 40% / Yuri 60%. Demais: 50% / 50%.</p>
        <div class="split">
          <div class="split-box"><span>Rennan</span><strong>${money(r.rennan)}</strong></div>
          <div class="split-box"><span>Yuri</span><strong>${money(r.yuri)}</strong></div>
        </div>
        <div class="list" style="margin-top:12px">
          <div class="list-row"><span class="muted">Entradas base antiga</span><strong>${money(r.entradas_base_antiga)}</strong></div>
          <div class="list-row"><span class="muted">Entradas comuns</span><strong>${money(r.entradas_comuns)}</strong></div>
          <div class="list-row"><span class="muted">Total de entradas</span><strong>${money(r.entradas_total)}</strong></div>
        </div>
      `)}
    </div>

    ${card(`
      <div class="card-head"><h3>🕒 Últimos atendimentos</h3></div>
      ${tableAtend(ats.slice(0, 8))}
    `)}`;
}

function tableAtend(list) {
  if (!list.length) return `<div class="empty">Sem atendimentos.</div>`;
  return `<div class="table-wrap"><table>
    <thead><tr><th>Data</th><th>OS</th><th>Cliente / Parceiro</th><th>Veículo</th><th>Serviços</th><th class="r">Valor</th><th>Pg</th></tr></thead>
    <tbody>
      ${list
        .map((a) => {
          const quem = a.tipo === "PARCEIRO" ? a.parceiros?.nome : a.clientes?.nome;
          return `<tr>
            <td>${dateBR(a.data)}</td>
            <td>${esc(a.os_numero || "")}</td>
            <td>${esc(quem || "—")} ${a.tipo === "PARCEIRO" ? '<span class="tag">parceiro</span>' : ""}</td>
            <td>${esc(a.veiculo || "")}<br><small class="muted">${esc(a.placa || "")}</small></td>
            <td>${esc(a.servicos || "")}</td>
            <td class="r">${money(a.valor)}</td>
            <td>${a.status_pg === "PAGO" ? '<span class="tag ok">pago</span>' : '<span class="tag warn">pend.</span>'}</td>
          </tr>`;
        })
        .join("")}
    </tbody></table></div>`;
}

// ============================================================ ATENDIMENTOS
async function viewAtendimentos() {
  const list = await db.atendimentos.list(400);
  $("#view").innerHTML = `
    <div class="toolbar">
      <input id="q" class="search" placeholder="Buscar por cliente, placa, OS…" />
      <button class="btn primary" id="novo2">+ Novo Registro</button>
    </div>
    <div id="atTable">${tableAtend(list)}</div>`;
  $("#novo2").onclick = () => renderNovoRegistro({ onSaved: route });
  $("#q").oninput = (e) => {
    const t = norm(e.target.value);
    const f = list.filter((a) =>
      [a.os_numero, a.placa, a.veiculo, a.servicos, a.clientes?.nome, a.parceiros?.nome]
        .map(norm)
        .some((x) => x.includes(t))
    );
    $("#atTable").innerHTML = tableAtend(f);
  };
}

// ============================================================ CLIENTES
async function viewClientes() {
  const list = await db.clientes.list();
  const render = (rows) => `<div class="table-wrap"><table>
    <thead><tr><th>Nome</th><th>Telefone</th><th>Origem</th><th>Base</th><th></th></tr></thead>
    <tbody>${rows
      .map(
        (c) => `<tr>
        <td><strong>${esc(c.nome)}</strong></td>
        <td>${esc(c.telefone || "—")}</td>
        <td>${esc(c.origem || "")}</td>
        <td>${c.base_antiga ? '<span class="tag yuri">Yuri 40/60</span>' : '<span class="tag">50/50</span>'}</td>
        <td class="r"><button class="btn small ghost" data-edit="${c.id}">Editar</button></td>
      </tr>`
      )
      .join("")}</tbody></table></div>`;

  $("#view").innerHTML = `
    <div class="toolbar">
      <input id="q" class="search" placeholder="Buscar cliente…" />
      <button class="btn primary" id="add">+ Cliente</button>
    </div>
    <div id="tbl">${render(list)}</div>`;

  const bind = () =>
    $$("[data-edit]").forEach((b) => (b.onclick = () => formCliente(list.find((c) => c.id === b.dataset.edit))));
  bind();
  $("#add").onclick = () => formCliente();
  $("#q").oninput = (e) => {
    const t = norm(e.target.value);
    $("#tbl").innerHTML = render(list.filter((c) => [c.nome, c.telefone].map(norm).some((x) => x.includes(t))));
    bind();
  };
}

function formCliente(c = null) {
  const { close } = openModal(c ? "Editar cliente" : "Novo cliente", `
    <form id="f" class="form">
      <label>Nome<input name="nome" required value="${esc(c?.nome || "")}" /></label>
      <label>Telefone<input name="telefone" value="${esc(c?.telefone || "")}" placeholder="11999998888" /></label>
      <label>Origem<input name="origem" value="${esc(c?.origem || "PARTICULAR")}" /></label>
      <label class="check"><input type="checkbox" name="base_antiga" ${c?.base_antiga ? "checked" : ""}/>
        Cliente da base antiga (tag Yuri → Rennan 40% / Yuri 60%)</label>
      <label>Observações<textarea name="observacoes">${esc(c?.observacoes || "")}</textarea></label>
      <div class="row gap end">
        ${c ? '<button type="button" class="btn danger" data-del>Excluir</button>' : ""}
        <button class="btn primary" type="submit">Salvar</button>
      </div>
    </form>`);
  $("#f").onsubmit = async (e) => {
    e.preventDefault();
    const d = formData(e.target);
    d.base_antiga = !!e.target.base_antiga.checked;
    try {
      c ? await db.clientes.update(c.id, d) : await db.clientes.create(d);
      toast("Cliente salvo.");
      close();
      route();
    } catch (err) { toast(err.message, "err"); }
  };
  if (c) $("[data-del]").onclick = async () => {
    if (await confirmDialog(`Excluir ${c.nome}? Os carros vinculados também serão removidos.`)) {
      await db.clientes.remove(c.id); toast("Excluído."); close(); route();
    }
  };
}

// ============================================================ CARROS
async function viewCarros() {
  const [list, cli] = await Promise.all([db.carros.list(), db.clientes.list()]);
  const render = (rows) => `<div class="table-wrap"><table>
    <thead><tr><th>Placa</th><th>Veículo</th><th>Cliente</th><th></th></tr></thead>
    <tbody>${rows
      .map(
        (c) => `<tr>
        <td><strong>${esc(c.placa)}</strong></td>
        <td>${esc(c.veiculo || "—")}${c.cor ? ` · ${esc(c.cor)}` : ""}</td>
        <td>${esc(c.clientes?.nome || "—")}</td>
        <td class="r"><button class="btn small ghost" data-edit="${c.id}">Editar</button></td>
      </tr>`
      )
      .join("")}</tbody></table></div>`;
  $("#view").innerHTML = `
    <div class="toolbar">
      <input id="q" class="search" placeholder="Buscar placa ou veículo…" />
      <button class="btn primary" id="add">+ Carro</button>
    </div>
    <div id="tbl">${render(list)}</div>`;
  const bind = () => $$("[data-edit]").forEach((b) => (b.onclick = () => formCarro(list.find((x) => x.id === b.dataset.edit), cli)));
  bind();
  $("#add").onclick = () => formCarro(null, cli);
  $("#q").oninput = (e) => {
    const t = norm(e.target.value);
    $("#tbl").innerHTML = render(list.filter((c) => [c.placa, c.veiculo, c.clientes?.nome].map(norm).some((x) => x.includes(t))));
    bind();
  };
}

function formCarro(c, cli) {
  const opts = cli.map((x) => `<option value="${x.id}" ${c?.cliente_id === x.id ? "selected" : ""}>${esc(x.nome)}</option>`).join("");
  const { close } = openModal(c ? "Editar carro" : "Novo carro", `
    <form id="f" class="form">
      <label>Cliente<select name="cliente_id" required><option value="">—</option>${opts}</select></label>
      <label>Placa<input name="placa" required value="${esc(c?.placa || "")}" /></label>
      <label>Veículo<input name="veiculo" value="${esc(c?.veiculo || "")}" placeholder="HRV, Civic, Moto…" /></label>
      <label>Cor<input name="cor" value="${esc(c?.cor || "")}" /></label>
      <div class="row gap end">
        ${c ? '<button type="button" class="btn danger" data-del>Excluir</button>' : ""}
        <button class="btn primary" type="submit">Salvar</button>
      </div>
    </form>`);
  $("#f").onsubmit = async (e) => {
    e.preventDefault();
    const d = formData(e.target);
    try { c ? await db.carros.update(c.id, d) : await db.carros.create(d); toast("Carro salvo."); close(); route(); }
    catch (err) { toast(err.message, "err"); }
  };
  if (c) $("[data-del]").onclick = async () => {
    if (await confirmDialog(`Excluir o carro ${c.placa}?`)) { await db.carros.remove(c.id); toast("Excluído."); close(); route(); }
  };
}

// ============================================================ PARCEIROS
async function viewParceiros() {
  const [list, ats] = await Promise.all([db.parceiros.list(), db.atendimentos.list(500)]);
  const byParceiro = {};
  ats.filter((a) => a.tipo === "PARCEIRO" && a.parceiro_id).forEach((a) => {
    const k = a.parceiro_id;
    byParceiro[k] = byParceiro[k] || { total: 0, pend: 0, n: 0 };
    byParceiro[k].total += Number(a.valor || 0);
    byParceiro[k].n += 1;
    if (a.status_pg === "PENDENTE") byParceiro[k].pend += Number(a.valor || 0);
  });
  $("#view").innerHTML = `
    <div class="toolbar"><div></div><button class="btn primary" id="add">+ Parceiro</button></div>
    <div class="cards-grid">${list
      .map((p) => {
        const s = byParceiro[p.id] || { total: 0, pend: 0, n: 0 };
        return `<div class="card">
          <div class="card-head"><h3>${esc(p.nome)}</h3>
            <button class="btn small ghost" data-edit="${p.id}">Editar</button></div>
          <div class="list">
            <div class="list-row"><span class="muted">Serviços</span><strong>${s.n}</strong></div>
            <div class="list-row"><span class="muted">Total</span><strong>${money(s.total)}</strong></div>
            <div class="list-row"><span class="muted">A cobrar</span><strong class="${s.pend ? "warn-txt" : ""}">${money(s.pend)}</strong></div>
          </div>
          <button class="btn small block" data-extrato="${p.id}">Ver extrato</button>
        </div>`;
      })
      .join("")}</div>`;
  $("#add").onclick = () => formParceiro();
  $$("[data-edit]").forEach((b) => (b.onclick = () => formParceiro(list.find((x) => x.id === b.dataset.edit))));
  $$("[data-extrato]").forEach((b) => (b.onclick = () => extratoParceiro(list.find((x) => x.id === b.dataset.extrato))));
}

function formParceiro(p = null) {
  const { close } = openModal(p ? "Editar parceiro" : "Novo parceiro", `
    <form id="f" class="form">
      <label>Nome<input name="nome" required value="${esc(p?.nome || "")}" /></label>
      <label>Telefone<input name="telefone" value="${esc(p?.telefone || "")}" /></label>
      <label>Observações<textarea name="observacoes">${esc(p?.observacoes || "")}</textarea></label>
      <div class="row gap end">
        ${p ? '<button type="button" class="btn danger" data-del>Excluir</button>' : ""}
        <button class="btn primary" type="submit">Salvar</button>
      </div>
    </form>`);
  $("#f").onsubmit = async (e) => {
    e.preventDefault();
    try { const d = formData(e.target); p ? await db.parceiros.update(p.id, d) : await db.parceiros.create(d); toast("Salvo."); close(); route(); }
    catch (err) { toast(err.message, "err"); }
  };
  if (p) $("[data-del]").onclick = async () => {
    if (await confirmDialog(`Excluir ${p.nome}?`)) { await db.parceiros.remove(p.id); toast("Excluído."); close(); route(); }
  };
}

async function extratoParceiro(p) {
  const ats = await db.atendimentos.byParceiro(p.id);
  const { card } = openModal(`Extrato — ${p.nome}`, `
    <div class="table-wrap"><table>
      <thead><tr><th>Data</th><th>Veículo</th><th>Serviços</th><th class="r">Valor</th><th>Pg</th><th></th></tr></thead>
      <tbody id="ext">${ats
        .map(
          (a) => `<tr>
        <td>${dateBR(a.data)}</td><td>${esc(a.veiculo || "")}<br><small class="muted">${esc(a.placa || "")}</small></td>
        <td>${esc(a.servicos || "")}</td><td class="r">${money(a.valor)}</td>
        <td>${a.status_pg === "PAGO" ? '<span class="tag ok">pago</span>' : `<button class="btn small wa" data-pay="${a.id}">Cobrar</button>`}</td>
        <td></td></tr>`
        )
        .join("")}</tbody>
      <tfoot><tr><td colspan="3"><strong>Total a cobrar</strong></td>
        <td class="r"><strong>${money(ats.filter((a) => a.status_pg === "PENDENTE").reduce((s, a) => s + Number(a.valor || 0), 0))}</strong></td>
        <td colspan="2"></td></tr></tfoot>
    </table></div>`, { wide: true });
  $$("[data-pay]", card).forEach((b) => (b.onclick = async () => {
    const a = ats.find((x) => x.id === b.dataset.pay);
    await db.atendimentos.update(a.id, { status_pg: "PAGO", data_pg: today() });
    await db.financeiro.create({ data: today(), tipo: "ENTRADA", atendimento_id: a.id, descricao: `Cobrança parceiro ${p.nome}`, valor: a.valor, base_antiga: a.base_antiga });
    toast("Marcado como pago + entrada lançada.");
    closeModal(); route();
  }));
}

// ============================================================ FUNCIONÁRIOS
async function viewFuncionarios() {
  const list = await db.funcionarios.list();
  $("#view").innerHTML = `
    <div class="toolbar"><div></div><button class="btn primary" id="add">+ Funcionário</button></div>
    <div class="table-wrap"><table>
      <thead><tr><th>Nome</th><th>Telefone</th><th>Status</th><th></th></tr></thead>
      <tbody>${list
        .map(
          (f) => `<tr><td><strong>${esc(f.nome)}</strong></td><td>${esc(f.telefone || "—")}</td>
          <td>${f.ativo ? '<span class="tag ok">ativo</span>' : '<span class="tag">inativo</span>'}</td>
          <td class="r"><button class="btn small ghost" data-edit="${f.id}">Editar</button></td></tr>`
        )
        .join("")}</tbody></table></div>`;
  $("#add").onclick = () => formFunc();
  $$("[data-edit]").forEach((b) => (b.onclick = () => formFunc(list.find((x) => x.id === b.dataset.edit))));
}

function formFunc(f = null) {
  const { close } = openModal(f ? "Editar funcionário" : "Novo funcionário", `
    <form id="f" class="form">
      <label>Nome<input name="nome" required value="${esc(f?.nome || "")}" /></label>
      <label>Telefone<input name="telefone" value="${esc(f?.telefone || "")}" /></label>
      <label class="check"><input type="checkbox" name="ativo" ${f?.ativo !== false ? "checked" : ""}/> Ativo</label>
      <div class="row gap end">
        ${f ? '<button type="button" class="btn danger" data-del>Excluir</button>' : ""}
        <button class="btn primary" type="submit">Salvar</button>
      </div>
    </form>`);
  $("#f").onsubmit = async (e) => {
    e.preventDefault();
    const d = formData(e.target); d.ativo = !!e.target.ativo.checked;
    try { f ? await db.funcionarios.update(f.id, d) : await db.funcionarios.create(d); toast("Salvo."); close(); route(); }
    catch (err) { toast(err.message, "err"); }
  };
  if (f) $("[data-del]").onclick = async () => {
    if (await confirmDialog(`Excluir ${f.nome}?`)) { await db.funcionarios.remove(f.id); toast("Excluído."); close(); route(); }
  };
}

// ============================================================ PRESENÇA
async function viewPresenca() {
  const d = today();
  const [funcs, pres] = await Promise.all([db.funcionarios.list(), db.presenca.byData(d)]);
  const ativos = funcs.filter((f) => f.ativo !== false);
  const map = Object.fromEntries(pres.map((p) => [p.funcionario_id, p]));
  $("#view").innerHTML = `
    <div class="card">
      <div class="card-head"><h3>Presença — ${dateBR(d)}</h3></div>
      <div class="list">
        ${ativos
          .map((f) => {
            const p = map[f.id];
            return `<div class="list-row">
              <strong>${esc(f.nome)}</strong>
              <div class="row gap" data-func="${f.id}">
                <button class="btn small ${p?.status === "PRESENTE" ? "ok-active" : "ghost"}" data-st="PRESENTE">Presente</button>
                <button class="btn small ${p?.status === "FALTA" ? "danger" : "ghost"}" data-st="FALTA">Falta</button>
              </div>
            </div>`;
          })
          .join("")}
      </div>
    </div>`;
  $$("[data-func]").forEach((wrap) => {
    $$("[data-st]", wrap).forEach((b) => (b.onclick = async () => {
      const hora = new Date().toTimeString().slice(0, 8);
      await db.presenca.upsert({ data: d, funcionario_id: wrap.dataset.func, status: b.dataset.st, hora });
      toast("Presença registrada.");
      route();
    }));
  });
}

// ============================================================ SERVIÇOS
async function viewServicos() {
  const list = await db.servicos.list();
  $("#view").innerHTML = `
    <div class="toolbar"><div></div><button class="btn primary" id="add">+ Serviço</button></div>
    <div class="table-wrap"><table>
      <thead><tr><th>Serviço</th><th class="r">Preço base</th><th>Status</th><th></th></tr></thead>
      <tbody>${list
        .map(
          (s) => `<tr><td><strong>${esc(s.nome)}</strong></td><td class="r">${money(s.preco_base)}</td>
          <td>${s.ativo !== false ? '<span class="tag ok">ativo</span>' : '<span class="tag">inativo</span>'}</td>
          <td class="r"><button class="btn small ghost" data-edit="${s.id}">Editar</button></td></tr>`
        )
        .join("")}</tbody></table></div>`;
  $("#add").onclick = () => formServico();
  $$("[data-edit]").forEach((b) => (b.onclick = () => formServico(list.find((x) => x.id === b.dataset.edit))));
}

function formServico(s = null) {
  const { close } = openModal(s ? "Editar serviço" : "Novo serviço", `
    <form id="f" class="form">
      <label>Nome<input name="nome" required value="${esc(s?.nome || "")}" /></label>
      <label>Preço base<input name="preco_base" type="number" step="0.01" value="${s?.preco_base ?? 0}" /></label>
      <label class="check"><input type="checkbox" name="ativo" ${s?.ativo !== false ? "checked" : ""}/> Ativo</label>
      <div class="row gap end">
        ${s ? '<button type="button" class="btn danger" data-del>Excluir</button>' : ""}
        <button class="btn primary" type="submit">Salvar</button>
      </div>
    </form>`);
  $("#f").onsubmit = async (e) => {
    e.preventDefault();
    const d = formData(e.target); d.ativo = !!e.target.ativo.checked; d.preco_base = Number(d.preco_base || 0);
    try { s ? await db.servicos.update(s.id, d) : await db.servicos.create(d); toast("Salvo."); close(); route(); }
    catch (err) { toast(err.message, "err"); }
  };
  if (s) $("[data-del]").onclick = async () => {
    if (await confirmDialog(`Excluir ${s.nome}?`)) { await db.servicos.remove(s.id); toast("Excluído."); close(); route(); }
  };
}

// ============================================================ FINANCEIRO
async function viewFinanceiro() {
  const [list, rateio] = await Promise.all([db.financeiro.list(500), db.views.rateio()]);
  const mes = today().slice(0, 7);
  const doMes = list.filter((l) => String(l.data).slice(0, 7) === mes);
  const entradas = doMes.filter((l) => l.tipo === "ENTRADA").reduce((s, l) => s + Number(l.valor || 0), 0);
  const saidas = doMes.filter((l) => l.tipo === "SAIDA").reduce((s, l) => s + Number(l.valor || 0), 0);
  const totalEnt = list.filter((l) => l.tipo === "ENTRADA").reduce((s, l) => s + Number(l.valor || 0), 0);
  const totalSai = list.filter((l) => l.tipo === "SAIDA").reduce((s, l) => s + Number(l.valor || 0), 0);
  const r = (rateio || []).find((x) => String(x.mes).slice(0, 7) === mes) || {};

  $("#view").innerHTML = `
    <div class="kpis">
      ${kpi("Entradas (mês)", money(entradas))}
      ${kpi("Saídas (mês)", money(saidas))}
      ${kpi("Resultado (mês)", money(entradas - saidas))}
      ${kpi("Caixa (acum.)", money(totalEnt - totalSai))}
    </div>
    <div class="grid-2">
      ${card(`
        <div class="card-head"><h3>👥 Distribuição de lucro (mês)</h3></div>
        <p class="muted small">Sobre as entradas. Base antiga: Rennan 40% / Yuri 60%. Demais: 50% / 50%.</p>
        <div class="split">
          <div class="split-box"><span>Rennan</span><strong>${money(r.rennan)}</strong></div>
          <div class="split-box"><span>Yuri</span><strong>${money(r.yuri)}</strong></div>
        </div>`)}
      ${card(`
        <div class="card-head"><h3>Lançar</h3></div>
        <div class="row gap">
          <button class="btn ok block" id="addEnt">+ Entrada</button>
          <button class="btn danger block" id="addSai">+ Saída</button>
        </div>`)}
    </div>
    ${card(`
      <div class="card-head"><h3>Lançamentos</h3></div>
      <div class="table-wrap"><table>
        <thead><tr><th>Data</th><th>Tipo</th><th>Descrição</th><th class="r">Valor</th><th>Forma</th><th></th></tr></thead>
        <tbody>${list
          .slice(0, 100)
          .map(
            (l) => `<tr>
          <td>${dateBR(l.data)}</td>
          <td>${l.tipo === "ENTRADA" ? '<span class="tag ok">entrada</span>' : '<span class="tag warn">saída</span>'}</td>
          <td>${esc(l.descricao || "")} ${l.base_antiga ? '<span class="tag yuri">yuri</span>' : ""}</td>
          <td class="r">${money(l.valor)}</td>
          <td>${esc(l.forma_pgto || "")}</td>
          <td class="r"><button class="btn small ghost" data-del="${l.id}">✕</button></td>
        </tr>`
          )
          .join("")}</tbody>
      </table></div>`)}`;

  $("#addEnt").onclick = () => formFinanceiro("ENTRADA");
  $("#addSai").onclick = () => formFinanceiro("SAIDA");
  $$("[data-del]").forEach((b) => (b.onclick = async () => {
    if (await confirmDialog("Excluir lançamento?")) { await db.financeiro.remove(b.dataset.del); toast("Excluído."); route(); }
  }));
}

function formFinanceiro(tipo) {
  const { close } = openModal(tipo === "ENTRADA" ? "Nova entrada" : "Nova saída", `
    <form id="f" class="form">
      <label>Data<input name="data" type="date" value="${today()}" required /></label>
      <label>Descrição<input name="descricao" required placeholder="${tipo === "SAIDA" ? "Ex: transporte, produtos…" : "Ex: serviço avulso"}" /></label>
      <label>Valor<input name="valor" type="number" step="0.01" required /></label>
      <label>Forma de pagamento
        <select name="forma_pgto"><option>PIX</option><option>DINHEIRO</option><option>CARTAO</option><option value="">—</option></select></label>
      ${tipo === "ENTRADA" ? `<label class="check"><input type="checkbox" name="base_antiga"/> Entrada da base antiga (tag Yuri)</label>` : ""}
      <label>Observações<input name="observacoes" /></label>
      <div class="row gap end"><button class="btn primary" type="submit">Salvar</button></div>
    </form>`);
  $("#f").onsubmit = async (e) => {
    e.preventDefault();
    const d = formData(e.target);
    d.tipo = tipo; d.valor = Number(d.valor || 0);
    d.base_antiga = tipo === "ENTRADA" ? !!e.target.base_antiga?.checked : false;
    try { await db.financeiro.create(d); toast("Lançado."); close(); route(); }
    catch (err) { toast(err.message, "err"); }
  };
}

boot();
