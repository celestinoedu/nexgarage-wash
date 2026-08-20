import * as db from "./db.js?v=2.0.1";
import { $, $$, money, dateBR, today, esc, norm, toast, openModal, closeModal, confirmDialog, formData } from "./ui.js?v=2.0.1";
import { renderNovoRegistro } from "./novo.js?v=2.0.1";
import { renderRelatorios } from "./relatorios.js?v=2.0.1";
import { renderConfiguracoes } from "./settings.js?v=2.0.1";

const BASE_MENU = [
  ["dashboard", "🏠", "Início"],
  ["atendimentos", "🧾", "Atendimentos"],
  ["agenda", "📅", "Agenda"],
  ["clientes", "👤", "Clientes"],
  ["parceiros", "🤝", "Parceiros"],
  ["funcionarios", "👷", "Funcionários"],
  ["presenca", "📋", "Presença"],
  ["servicos", "🧴", "Serviços"],
  ["financeiro", "💰", "Financeiro"],
  ["relatorios", "📊", "Relatórios"],
];

const state = {
  session: null,
  stores: [],
  store: null,
  permissions: null,
};

const APP_VERSION = "2.0.1";
const menuItems = () =>
  state.permissions?.canManageAccount
    ? [...BASE_MENU, ["configuracoes", "⚙️", "Configurações"]]
    : BASE_MENU;

// Rodapé com dados da desenvolvedora + versão.
function footerHTML() {
  return `<footer class="app-footer">
    Desenvolvido por: <strong>LOTUS NEGÓCIOS LTDA</strong> · CNPJ 45.537.878/0001-07
    <span class="sep">·</span> v${APP_VERSION}
  </footer>`;
}

// ============================================================ TEMA
function currentTheme() {
  return localStorage.getItem("tl_theme") || "dark";
}
function applyTheme(t) {
  document.documentElement.setAttribute("data-theme", t);
  localStorage.setItem("tl_theme", t);
}
function toggleTheme() {
  applyTheme(currentTheme() === "dark" ? "light" : "dark");
}
const themeSwitchHTML = () =>
  `<button class="theme-switch" id="themeToggle" role="switch" aria-label="Alternar tema" title="Alternar tema claro/escuro">
    <span class="ts-ico">☀️</span><span class="ts-ico">🌙</span><span class="ts-thumb"></span>
  </button>`;

// ============================================================ BOOTSTRAP
async function boot() {
  applyTheme(currentTheme());
  if (!db.isConfigured) return renderSetup();
  state.session = await db.auth.session();
  db.auth.onChange((s) => {
    if (s) return;
    state.session = null;
    state.stores = [];
    state.store = null;
    state.permissions = null;
    db.access.setActiveStore(null);
    renderLogin();
  });
  if (state.session) await prepareStore(false);
  else renderLogin();
}

async function prepareStore(forcePicker = false) {
  try {
    state.stores = await db.access.stores();
    if (!state.stores.length) return renderNoAccess();
    const savedId = forcePicker ? null : localStorage.getItem("tl_active_store");
    const savedStore = state.stores.find((item) => item.id === savedId);
    if (savedStore) return selectStore(savedStore);
    renderStorePicker();
  } catch (error) {
    console.error(error);
    renderNoAccess("Não foi possível carregar as lojas permitidas.");
  }
}

async function selectStore(store) {
  db.access.setActiveStore(store);
  state.store = store;
  state.permissions = await db.access.permissions(store);
  renderShell();
}

function renderSetup() {
  $("#app").innerHTML = `
    <div class="auth">
      <div class="auth-card">
        <img class="brand-logo" src="assets/logo.png" alt="NexGarage" />
        <h2>Configuração necessária</h2>
        <p class="muted">Preencha <code>app/config.js</code> com a URL e a anon key do seu projeto
        Supabase. Veja o <strong>README</strong> para o passo a passo (2 minutos).</p>
      </div>
      ${footerHTML()}
    </div>`;
}

function renderLogin() {
  $("#app").innerHTML = `
    <div class="auth">
      <form class="auth-card" id="loginForm">
        <img class="brand-logo" src="assets/logo.png" alt="NexGarage" />
        <p class="muted">Top Line Higienizações · Lava Rápidos</p>
        <label>E-mail<input name="email" type="email" required autocomplete="username" /></label>
        <label>Senha<input name="password" type="password" required autocomplete="current-password" /></label>
        <button class="btn primary block" type="submit">Entrar</button>
        <button class="btn ghost block" id="createLogin" type="button">Primeiro acesso: criar login</button>
        <p class="err" id="loginErr"></p>
      </form>
      ${footerHTML()}
    </div>`;
  $("#loginForm").onsubmit = async (e) => {
    e.preventDefault();
    const { email, password } = formData(e.target);
    const button = e.target.querySelector("button[type=submit]");
    button.disabled = true;
    button.textContent = "Validando…";
    db.access.setActiveStore(null);
    const { data, error } = await db.auth.signIn(email, password);
    if (error) {
      $("#loginErr").textContent = "E-mail ou senha inválidos.";
      button.disabled = false;
      button.textContent = "Entrar";
      return;
    }
    state.session = data.session;
    await prepareStore(true);
  };
  $("#createLogin").onclick = renderSignUp;
}

function renderSignUp() {
  const { close } = openModal("Criar login", `
    <form class="form" id="signUpForm">
      <p class="muted small">Crie seu login. Depois, o proprietário ou administrador deverá liberar as lojas permitidas.</p>
      <label>Nome completo<input name="full_name" required autocomplete="name" /></label>
      <label>E-mail<input name="email" type="email" required autocomplete="email" /></label>
      <label>Senha<input name="password" type="password" minlength="6" required autocomplete="new-password" /></label>
      <p class="err" id="signUpError"></p>
      <div class="row gap end"><button class="btn ghost" type="button" data-cancel>Cancelar</button><button class="btn primary" type="submit">Criar login</button></div>
    </form>`);
  $("[data-cancel]").onclick = close;
  $("#signUpForm").onsubmit = async (event) => {
    event.preventDefault();
    const values = formData(event.target);
    const submit = event.target.querySelector('[type="submit"]');
    submit.disabled = true;
    const { data, error } = await db.auth.signUp(values.email, values.password, values.full_name);
    if (error) {
      $("#signUpError").textContent = error.message.includes("already") ? "Este e-mail já possui login." : error.message;
      submit.disabled = false;
      return;
    }
    close();
    if (data.session) {
      state.session = data.session;
      await prepareStore(true);
    } else {
      $("#loginErr").textContent = "Login criado. Confirme o e-mail e peça ao administrador para liberar sua loja.";
    }
  };
}

function renderStorePicker() {
  $("#app").innerHTML = `
    <div class="auth">
      <form class="auth-card" id="storeLoginForm">
        <img class="brand-logo" src="assets/logo.png" alt="Top Line Higienizações" />
        <div>
          <h2>Selecionar loja</h2>
          <p class="muted small">Escolha a unidade que deseja acessar neste login.</p>
        </div>
        <label>Loja
          <select name="store_id" required>
            ${state.stores.map((store) => `<option value="${esc(store.id)}">${esc(store.name)}${store.city ? ` · ${esc(store.city)}` : ""}</option>`).join("")}
          </select>
        </label>
        <button class="btn primary block" type="submit">Acessar loja</button>
        <button class="btn ghost block" id="storeLogout" type="button">Voltar</button>
        <p class="err" id="storeErr"></p>
      </form>
      ${footerHTML()}
    </div>`;
  $("#storeLoginForm").onsubmit = async (event) => {
    event.preventDefault();
    const store = state.stores.find((item) => item.id === formData(event.target).store_id);
    if (!store) return ($("#storeErr").textContent = "Selecione uma loja válida.");
    try {
      await selectStore(store);
    } catch (error) {
      console.error(error);
      $("#storeErr").textContent = "Seu usuário não possui acesso a esta loja.";
    }
  };
  $("#storeLogout").onclick = () => db.auth.signOut();
}

function renderNoAccess(message = "Seu login ainda não possui acesso a nenhuma loja.") {
  $("#app").innerHTML = `
    <div class="auth">
      <div class="auth-card">
        <img class="brand-logo" src="assets/logo.png" alt="Top Line Higienizações" />
        <h2>Acesso pendente</h2>
        <p class="muted">${esc(message)}</p>
        <p class="small muted">Peça ao proprietário ou administrador para liberar sua loja.</p>
        <button class="btn ghost block" id="noAccessLogout">Sair</button>
      </div>
      ${footerHTML()}
    </div>`;
  $("#noAccessLogout").onclick = () => db.auth.signOut();
}

function renderShell() {
  const storeLogo = state.store?.logo_url || "assets/logo.png";
  $("#app").innerHTML = `
    <div class="shell">
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-brand-row">
          <img class="brand-logo side" src="${esc(storeLogo)}" alt="${esc(state.store?.name || "Top Line Higienizações")}" />
          <button class="sidebar-collapse-btn" id="sidebarCollapse" title="Minimizar menu" aria-label="Minimizar menu">«</button>
        </div>
        <button class="active-store" id="switchStore" title="Trocar loja">
          <span>🏪</span><span><small>Loja ativa</small><strong>${esc(state.store?.name || "")}</strong></span><b>⌄</b>
        </button>
        <nav id="nav"></nav>
        <div class="sidebar-bottom">
          <div class="row between" style="align-items:center;gap:10px">
            <button class="btn ghost" id="logout">Sair</button>
            ${themeSwitchHTML()}
          </div>
          <div class="sidebar-footer">Desenvolvido por:<br><strong>LOTUS NEGÓCIOS LTDA</strong><br>CNPJ 45.537.878/0001-07 · v${APP_VERSION}</div>
        </div>
      </aside>
      <div class="backdrop-nav" id="navBackdrop"></div>
      <main class="main">
        <header class="topbar">
          <button class="icon-btn only-mobile" id="menuBtn">☰</button>
          <h1 id="pageTitle">Início</h1>
          <button class="btn primary" id="novoBtn">+ Novo Registro</button>
        </header>
        <section id="view" class="view"></section>
        ${footerHTML()}
      </main>
    </div>`;

  $("#nav").innerHTML = menuItems().map(
    ([id, ic, label]) => `<button class="nav-item" data-route="${id}" title="${label}"><span class="nav-icon">${ic}</span><span class="nav-label">${label}</span></button>`
  ).join("");

  const setSidebarCollapsed = (collapsed) => {
    document.body.classList.toggle("sidebar-collapsed", collapsed);
    localStorage.setItem("tl_sidebar_collapsed", collapsed ? "1" : "0");
    $("#sidebarCollapse").textContent = collapsed ? "»" : "«";
    $("#sidebarCollapse").title = collapsed ? "Expandir menu" : "Minimizar menu";
  };
  setSidebarCollapsed(localStorage.getItem("tl_sidebar_collapsed") === "1");
  $("#sidebarCollapse").onclick = () => setSidebarCollapsed(!document.body.classList.contains("sidebar-collapsed"));
  $("#themeToggle").onclick = toggleTheme;
  $("#logout").onclick = () => db.auth.signOut();
  $("#switchStore").onclick = () => prepareStore(true);
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
  agenda: viewAgenda,
  clientes: viewClientes,
  parceiros: viewParceiros,
  funcionarios: viewFuncionarios,
  presenca: viewPresenca,
  servicos: viewServicos,
  financeiro: viewFinanceiro,
  relatorios: renderRelatorios,
  configuracoes: renderConfiguracoes,
};

async function route() {
  const id = (location.hash.replace("#", "") || "dashboard");
  const fn = ROUTES[id] || viewDashboard;
  document.body.classList.remove("nav-open");
  $$("[data-route]").forEach((b) => b.classList.toggle("active", b.dataset.route === id));
  const item = menuItems().find((m) => m[0] === id);
  $("#pageTitle").textContent = item ? item[2] : "Início";
  $("#novoBtn").style.display = id === "configuracoes" ? "none" : "";
  $("#view").innerHTML = `<div class="loading">Carregando…</div>`;
  try {
    await fn({
      store: state.store,
      stores: state.stores,
      permissions: state.permissions,
      onStoreChanged: () => prepareStore(false),
    });
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

// Card recolhível (minimizar). O estado fica salvo por chave no localStorage.
const isCollapsed = (key) => localStorage.getItem("tl_collapse_" + key) === "1";
const collapsibleCard = (key, titleHTML, bodyHTML) => {
  const col = isCollapsed(key);
  return `<div class="card collapsible ${col ? "collapsed" : ""}" data-collapse="${key}">
    <div class="card-head collapse-head">
      <div class="row gap" style="align-items:center">${titleHTML}</div>
      <button class="icon-btn collapse-btn" title="Minimizar/expandir">${col ? "▸" : "▾"}</button>
    </div>
    <div class="collapsible-body">${bodyHTML}</div>
  </div>`;
};
function bindCollapsibles(root = document) {
  $$("[data-collapse]", root).forEach((cardEl) => {
    const key = cardEl.dataset.collapse;
    cardEl.querySelector(".collapse-head").onclick = () => {
      const col = cardEl.classList.toggle("collapsed");
      localStorage.setItem("tl_collapse_" + key, col ? "1" : "0");
      cardEl.querySelector(".collapse-btn").textContent = col ? "▸" : "▾";
    };
  });
}

// ============================================================ DATAS DO NEGÓCIO
// Formata um Date local como YYYY-MM-DD (sem depender de fuso horário).
const fmtISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
// Data de N dias atrás, a partir de hoje.
const daysAgo = (n) => { const d = new Date(today() + "T12:00:00"); d.setDate(d.getDate() - n); return fmtISO(d); };
// Mês financeiro: começa no dia 15 e vai até o dia 14 do mês seguinte.
function mesFinanceiro(ref = today()) {
  const d = new Date(String(ref).slice(0, 10) + "T12:00:00");
  const inicio = new Date(d.getFullYear(), d.getMonth() + (d.getDate() >= 15 ? 0 : -1), 15, 12);
  const fim = new Date(inicio.getFullYear(), inicio.getMonth() + 1, 14, 12);
  return { inicio: fmtISO(inicio), fim: fmtISO(fim) };
}
// Dia seguinte a uma data ISO.
const nextDay = (iso) => { const d = new Date(String(iso).slice(0, 10) + "T12:00:00"); d.setDate(d.getDate() + 1); return fmtISO(d); };
// Lista de meses financeiros (15→14) do mais antigo com lançamento até o atual, mais recente primeiro.
function periodosFinanceiros(datas) {
  const atual = mesFinanceiro();
  const validas = (datas || []).map((x) => String(x).slice(0, 10)).filter(Boolean);
  if (!validas.length) return [atual];
  const min = validas.reduce((a, b) => (a < b ? a : b));
  const arr = [];
  let p = mesFinanceiro(min), guard = 0;
  while (p.inicio <= atual.inicio && guard++ < 300) { arr.push(p); p = mesFinanceiro(nextDay(p.fim)); }
  return arr.reverse();
}

// ============================================================ DASHBOARD
async function viewDashboard() {
  const [ats, oportRaw, financeiro, funcs, presHoje, agenda] = await Promise.all([
    db.atendimentos.list(500),
    db.views.ultimaLavagem(),
    db.financeiro.list(1000),
    db.funcionarios.list(),
    db.presenca.byData(today()),
    db.agenda.list(500),
  ]);
  const hoje = today();
  const hojeAts = ats.filter((a) => String(a.data).slice(0, 10) === hoje);
  const carrosHoje = hojeAts.length;
  const faturHoje = hojeAts.reduce((s, a) => s + Number(a.valor || 0), 0);
  const pendHoje = hojeAts.filter((a) => a.status_pg === "PENDENTE");
  const receberHoje = pendHoje.reduce((s, a) => s + Number(a.valor || 0), 0);
  const recebHoje = financeiro
    .filter((l) => l.tipo === "ENTRADA" && String(l.data).slice(0, 10) === hoje)
    .reduce((s, l) => s + Number(l.valor || 0), 0);

  const ativos = funcs.filter((f) => f.ativo !== false);
  const lancados = new Set(presHoje.map((p) => p.funcionario_id));
  const semPresenca = ativos.filter((f) => !lancados.has(f.id));
  const proximos = agenda.filter((a) => a.status === "AGENDADO" && String(a.data).slice(0, 10) >= hoje);

  const opor = (oportRaw || []).filter((o) => o.dias_sem_lavar >= 29);

  // Últimos atendimentos: considera os últimos 29 dias.
  const limite29 = daysAgo(29);
  const ultimos29 = ats.filter((a) => String(a.data).slice(0, 10) >= limite29);

  $("#view").innerHTML = `
    ${semPresenca.length ? `<div class="alert alert-action">⚠️ Presença de hoje ainda não lançada para <strong>${semPresenca.map((f) => esc(f.nome)).join(", ")}</strong>.
      <button class="btn small" id="irPresenca">Lançar agora</button></div>` : ""}
    <div class="kpis">
      ${kpi("Carros hoje", carrosHoje)}
      ${kpi("Faturamento hoje", money(faturHoje))}
      ${kpi("Recebido hoje", money(recebHoje), "entradas no caixa")}
      ${kpi("A receber hoje", money(receberHoje), `${pendHoje.length} pendência(s)`)}
    </div>

    ${collapsibleCard("agenda_inicio", `<h3>📅 Próximas lavagens agendadas</h3><span class="badge">${proximos.length}</span>`, `
      <div class="list">
        ${proximos.length ? proximos.slice(0, 12).map((a) => `<div class="list-row">
          <div><strong>${dateBR(a.data)}${a.hora ? ` às ${esc(a.hora.slice(0, 5))}` : ""}</strong> · ${esc(a.clientes?.nome || "—")}<br>
            <small class="muted">${esc(a.carros?.veiculo || "Veículo não informado")} ${esc(a.carros?.placa || "")} ${a.servicos ? `· ${esc(a.servicos)}` : ""}</small></div>
          <button class="btn small ghost" data-agenda-open="${a.id}">Abrir</button>
        </div>`).join("") : `<div class="empty small">Nenhuma lavagem agendada.</div>`}
      </div>
      <button class="btn small primary" id="novaAgendaInicio" style="margin-top:10px">+ Agendar lavagem</button>
    `)}

    ${collapsibleCard("oportunidades", `<h3>🎯 Oportunidades</h3><span class="badge">${opor.length}</span>`, `
      <p class="muted small">Clientes há 29+ dias sem lavar — hora de chamar de volta.</p>
      <div class="list opor-grid">
        ${
          opor.length
            ? opor
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

    ${collapsibleCard("ultimos", `<h3>🕒 Últimos atendimentos</h3><span class="badge">${ultimos29.length}</span>`, `
      <p class="muted small">Atendimentos dos últimos 29 dias.</p>
      ${tableAtend(ultimos29)}
    `)}`;

  bindAtendEdits(ats);
  bindCollapsibles();
  if ($("#irPresenca")) $("#irPresenca").onclick = () => { location.hash = "presenca"; };
  $("#novaAgendaInicio").onclick = () => formAgenda(null, agenda);
  $$('[data-agenda-open]').forEach((b) => b.onclick = () => formAgenda(agenda.find((a) => a.id === b.dataset.agendaOpen), agenda));
}

// Tag do rateio conforme a base do cliente (base antiga = 40/60, demais = 50/50).
function splitTag(a) {
  return a.base_antiga ? '<span class="tag yuri">40/60</span>' : '<span class="tag split50">50/50</span>';
}

function tableAtend(list) {
  if (!list.length) return `<div class="empty">Sem atendimentos.</div>`;
  return `<div class="table-wrap"><table>
    <thead><tr><th>Data</th><th>OS</th><th>Cliente / Parceiro</th><th>Veículo</th><th>Serviços</th><th class="r">Valor</th><th>Pg</th><th></th></tr></thead>
    <tbody>
      ${list
        .map((a) => {
          const quem = a.tipo === "PARCEIRO" ? a.parceiros?.nome : a.clientes?.nome;
          return `<tr>
            <td>${dateBR(a.data)}</td>
            <td>${esc(a.os_numero || "")}</td>
            <td>${esc(quem || "—")} ${a.tipo === "PARCEIRO" ? '<span class="tag">parceiro</span>' : ""} ${splitTag(a)}</td>
            <td>${esc(a.veiculo || "")}<br><small class="muted">${esc(a.placa || "")}</small></td>
            <td>${esc(a.servicos || "")}</td>
            <td class="r">${money(a.valor)}</td>
            <td>${a.status_pg === "PAGO" ? '<span class="tag ok">pago</span>' : '<span class="tag warn">pend.</span>'}</td>
            <td class="r"><button class="btn small ghost" data-edit-at="${a.id}">Editar</button></td>
          </tr>`;
        })
        .join("")}
    </tbody></table></div>`;
}

// Sincroniza o lançamento financeiro de ENTRADA conforme o status de pagamento.
async function syncFinanceiro(atend) {
  const existentes = await db.financeiro.byAtendimento(atend.id);
  if (atend.status_pg === "PAGO") {
    const desc = `${atend.os_numero || "OS"} · ${atend.servicos || ""}`;
    if (existentes.length) {
      await db.financeiro.update(existentes[0].id, {
        valor: atend.valor, descricao: desc, forma_pgto: atend.forma_pgto,
        base_antiga: atend.base_antiga, data: atend.data_pg || atend.data,
      });
    } else {
      await db.financeiro.create({
        data: atend.data_pg || atend.data, tipo: "ENTRADA", atendimento_id: atend.id,
        descricao: desc, valor: atend.valor, forma_pgto: atend.forma_pgto, base_antiga: atend.base_antiga,
      });
    }
  } else if (existentes.length) {
    await db.financeiro.removeByAtendimento(atend.id); // voltou a pendente: tira do caixa
  }
}

async function editAtendimento(a) {
  const servCat = await db.servicos.list();
  const quem = a.tipo === "PARCEIRO" ? a.parceiros?.nome : a.clientes?.nome;
  const chips = servCat
    .filter((s) => s.ativo !== false)
    .map((s) => `<button class="chip" type="button" data-add="${esc(s.nome)}" data-preco="${s.preco_base || 0}">+ ${esc(s.nome)} · ${money(s.preco_base)}</button>`)
    .join("");
  const { card, close } = openModal(`Editar ${a.os_numero || "atendimento"}`, `
    <p class="muted small">${a.tipo === "PARCEIRO" ? "🤝" : "🚗"} ${esc(quem || "—")} — ${esc(a.veiculo || "")} ${esc(a.placa || "")}</p>
    <form id="f" class="form">
      <label>Data<input name="data" type="date" value="${esc(String(a.data).slice(0, 10))}"/></label>
      <label>Serviços<input name="servicos" id="servEdit" value="${esc(a.servicos || "")}"/></label>
      <div class="chips" style="margin:-4px 0 4px">${chips}</div>
      <div class="grid-form">
        <label>Valor<input name="valor" id="valEdit" type="number" step="0.01" value="${a.valor || 0}"/></label>
        <label>Forma de pagamento
          <select name="forma_pgto">
            ${["PIX", "DINHEIRO", "CARTAO", ""].map((o) => `<option ${a.forma_pgto === o ? "selected" : ""} value="${o}">${o || "—"}</option>`).join("")}
          </select></label>
      </div>
      <label>Status de pagamento
        <select name="status_pg">
          <option value="PENDENTE" ${a.status_pg === "PENDENTE" ? "selected" : ""}>Pendente</option>
          <option value="PAGO" ${a.status_pg === "PAGO" ? "selected" : ""}>Pago</option>
        </select></label>
      <label>Observações<input name="observacoes" value="${esc(a.observacoes || "")}"/></label>
      <div class="row gap end">
        <button type="button" class="btn danger" data-del>Excluir</button>
        <button class="btn primary" type="submit">Salvar</button>
      </div>
    </form>`);

  // chips somam ao valor e anexam ao texto de serviços
  $$("[data-add]", card).forEach((b) => (b.onclick = () => {
    const sEl = $("#servEdit", card), vEl = $("#valEdit", card);
    sEl.value = sEl.value.trim() ? `${sEl.value.trim()} + ${b.dataset.add}` : b.dataset.add;
    vEl.value = (Number(vEl.value || 0) + Number(b.dataset.preco || 0)).toFixed(2);
  }));

  $("#f", card).onsubmit = async (e) => {
    e.preventDefault();
    const d = formData(e.target);
    d.valor = Number(d.valor || 0);
    d.data_pg = d.status_pg === "PAGO" ? (a.data_pg || d.data) : null;
    try {
      const upd = await db.atendimentos.update(a.id, d);
      await syncFinanceiro({ ...a, ...d, ...upd });
      toast("Atendimento atualizado.");
      close();
      route();
    } catch (err) { toast(err.message, "err"); }
  };
  $("[data-del]", card).onclick = async () => {
    if (await confirmDialog(`Excluir ${a.os_numero || "este atendimento"}? O lançamento de caixa vinculado também será removido.`)) {
      await db.financeiro.removeByAtendimento(a.id);
      await db.atendimentos.remove(a.id);
      toast("Excluído."); close(); route();
    }
  };
}

// Liga os botões "Editar" da tabela de atendimentos dentro de um container.
function bindAtendEdits(list, root = document) {
  $$("[data-edit-at]", root).forEach((b) => (b.onclick = () => editAtendimento(list.find((a) => a.id === b.dataset.editAt))));
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
  bindAtendEdits(list);
  $("#q").oninput = (e) => {
    const t = norm(e.target.value);
    const f = list.filter((a) =>
      [a.os_numero, a.placa, a.veiculo, a.servicos, a.clientes?.nome, a.parceiros?.nome]
        .map(norm)
        .some((x) => x.includes(t))
    );
    $("#atTable").innerHTML = tableAtend(f);
    bindAtendEdits(list);
  };
}

// ============================================================ AGENDA
async function viewAgenda() {
  const list = await db.agenda.list(500);
  const render = (rows) => rows.length ? `<div class="table-wrap"><table>
    <thead><tr><th>Data / hora</th><th>Cliente</th><th>Carro</th><th>Serviço</th><th>Status</th><th></th></tr></thead>
    <tbody>${rows.map((a) => `<tr>
      <td><strong>${dateBR(a.data)}</strong>${a.hora ? `<br><small>${esc(a.hora.slice(0, 5))}</small>` : ""}</td>
      <td>${esc(a.clientes?.nome || "—")}</td>
      <td>${esc(a.carros?.veiculo || "—")}<br><small class="muted">${esc(a.carros?.placa || "")}</small></td>
      <td>${esc(a.servicos || "—")}</td>
      <td>${a.status === "AGENDADO" ? '<span class="tag warn">agendado</span>' : a.status === "CONCLUIDO" ? '<span class="tag ok">concluído</span>' : '<span class="tag">cancelado</span>'}</td>
      <td class="r"><button class="btn small ghost" data-edit-ag="${a.id}">Editar</button></td>
    </tr>`).join("")}</tbody></table></div>` : `<div class="empty">Nenhum agendamento.</div>`;

  const futuros = list.filter((a) => a.status === "AGENDADO" && String(a.data).slice(0, 10) >= today());
  $("#view").innerHTML = `
    <div class="toolbar">
      <select id="agendaFiltro" class="mini"><option value="PROXIMOS">Próximos agendamentos</option><option value="TODOS">Todos</option><option value="CONCLUIDO">Concluídos</option><option value="CANCELADO">Cancelados</option></select>
      <button class="btn primary" id="addAgenda">+ Agendar lavagem</button>
    </div><div id="agendaTabela">${render(futuros)}</div>`;

  const bind = (rows) => $$('[data-edit-ag]').forEach((b) => b.onclick = () => formAgenda(rows.find((a) => a.id === b.dataset.editAg), list));
  bind(futuros);
  $("#addAgenda").onclick = () => formAgenda(null, list);
  $("#agendaFiltro").onchange = (e) => {
    const v = e.target.value;
    const rows = v === "TODOS" ? list : v === "PROXIMOS" ? futuros : list.filter((a) => a.status === v);
    $("#agendaTabela").innerHTML = render(rows); bind(rows);
  };
}

async function formAgenda(a = null) {
  const [clientes, carros] = await Promise.all([db.clientes.list(), db.carros.list()]);
  const clienteInicial = a?.cliente_id || "";
  const carrosDoCliente = (cid) => carros.filter((c) => c.cliente_id === cid);
  const optionsCarros = (cid, selected = "") => `<option value="">Selecione…</option>${carrosDoCliente(cid)
    .map((c) => `<option value="${c.id}" ${c.id === selected ? "selected" : ""}>${esc(c.placa)}${c.veiculo ? ` · ${esc(c.veiculo)}` : ""}</option>`).join("")}`;
  const { card, close } = openModal(a ? "Editar agendamento" : "Agendar lavagem", `
    <form id="agendaForm" class="form">
      <div class="grid-form">
        <label>Data<input name="data" type="date" required value="${esc(String(a?.data || today()).slice(0, 10))}"/></label>
        <label>Hora<input name="hora" type="time" value="${esc(a?.hora?.slice(0, 5) || "")}"/></label>
      </div>
      <label>Cliente<select name="cliente_id" id="agendaCliente" required><option value="">Selecione…</option>${clientes.map((c) => `<option value="${c.id}" ${c.id === clienteInicial ? "selected" : ""}>${esc(c.nome)}</option>`).join("")}</select></label>
      <label>Carro<select name="carro_id" id="agendaCarro">${optionsCarros(clienteInicial, a?.carro_id)}</select></label>
      <label>Serviço desejado<input name="servicos" value="${esc(a?.servicos || "")}" placeholder="Ex: lavagem completa"/></label>
      <label>Observações<textarea name="observacoes">${esc(a?.observacoes || "")}</textarea></label>
      <label>Status<select name="status"><option value="AGENDADO" ${!a || a.status === "AGENDADO" ? "selected" : ""}>Agendado</option><option value="CONCLUIDO" ${a?.status === "CONCLUIDO" ? "selected" : ""}>Concluído</option><option value="CANCELADO" ${a?.status === "CANCELADO" ? "selected" : ""}>Cancelado</option></select></label>
      <div class="row gap end">${a ? '<button type="button" class="btn danger" data-del-ag>Excluir</button>' : ""}<button class="btn primary">Salvar</button></div>
    </form>`);
  $("#agendaCliente", card).onchange = (e) => { $("#agendaCarro", card).innerHTML = optionsCarros(e.target.value); };
  $("#agendaForm", card).onsubmit = async (e) => {
    e.preventDefault(); const d = formData(e.target); d.hora = d.hora || null; d.carro_id = d.carro_id || null;
    try { a ? await db.agenda.update(a.id, d) : await db.agenda.create(d); toast("Agendamento salvo."); close(); route(); }
    catch (err) { toast(err.message, "err"); }
  };
  if (a) $("[data-del-ag]", card).onclick = async () => {
    if (await confirmDialog("Excluir este agendamento?")) { await db.agenda.remove(a.id); toast("Agendamento excluído."); close(); route(); }
  };
}

// ============================================================ CLIENTES
async function viewClientes() {
  const [list, allCarros] = await Promise.all([db.clientes.list(), db.carros.list()]);
  const carrosByCli = {};
  allCarros.forEach((c) => { (carrosByCli[c.cliente_id] = carrosByCli[c.cliente_id] || []).push(c); });

  const render = (rows) => `<div class="table-wrap"><table>
    <thead><tr><th>Nome</th><th>Telefone</th><th>Base</th><th>Carros</th><th></th></tr></thead>
    <tbody>${rows
      .map((c) => {
        const cars = carrosByCli[c.id] || [];
        const chips = cars.length
          ? cars.map((x) => `<span class="tag">${esc(x.placa)}${x.veiculo ? " · " + esc(x.veiculo) : ""}</span>`).join(" ")
          : '<span class="muted small">sem carro</span>';
        return `<tr>
          <td><strong>${esc(c.nome)}</strong></td>
          <td>${esc(c.telefone || "—")}</td>
          <td>${c.base_antiga ? '<span class="tag yuri">Yuri 40/60</span>' : '<span class="tag">50/50</span>'}</td>
          <td class="chips-cell">${chips}</td>
          <td class="r"><button class="btn small ghost" data-open="${c.id}">Abrir</button></td>
        </tr>`;
      })
      .join("")}</tbody></table></div>`;

  $("#view").innerHTML = `
    <div class="toolbar">
      <input id="q" class="search" placeholder="Buscar cliente ou placa…" />
      <button class="btn primary" id="add">+ Cliente</button>
    </div>
    <div id="tbl">${render(list)}</div>`;

  const bind = () => $$("[data-open]").forEach((b) => (b.onclick = () => clienteDetalhe(b.dataset.open)));
  bind();
  $("#add").onclick = () => formCliente();
  $("#q").oninput = (e) => {
    const t = norm(e.target.value);
    const f = list.filter((c) =>
      [c.nome, c.telefone].map(norm).some((x) => x.includes(t)) ||
      (carrosByCli[c.id] || []).some((car) => norm(car.placa).includes(t) || norm(car.veiculo).includes(t))
    );
    $("#tbl").innerHTML = render(f);
    bind();
  };
}

// Detalhe do cliente com seus carros (1 cliente → N carros).
async function clienteDetalhe(cid) {
  const [c, cars] = await Promise.all([db.clientes.byId(cid), db.carros.byCliente(cid)]);
  const reopen = () => clienteDetalhe(cid);
  const tel = (c.telefone || "").replace(/\D/g, "");
  const wa = tel ? `https://wa.me/55${tel}` : null;
  const { card } = openModal(c.nome, `
    <div class="row between" style="margin-bottom:8px">
      <div>
        <div class="muted small">${esc(c.origem || "PARTICULAR")} · ${c.base_antiga ? "base antiga (Yuri 40/60)" : "50/50"}</div>
        <div style="margin-top:4px">${esc(c.telefone || "sem telefone")}
          ${wa ? `<a class="btn small wa" href="${wa}" target="_blank" rel="noopener">WhatsApp</a>` : ""}</div>
      </div>
      <button class="btn small ghost" id="editCli">Editar</button>
    </div>
    ${c.observacoes ? `<p class="muted small">${esc(c.observacoes)}</p>` : ""}
    <hr/>
    <div class="card-head"><h4 class="sec-title">Carros (${cars.length})</h4>
      <button class="btn small primary" id="addCar">+ Carro</button></div>
    <div class="list">
      ${cars.length
        ? cars.map((x) => `<div class="list-row">
            <div><strong>${esc(x.placa)}</strong> ${x.veiculo ? `· ${esc(x.veiculo)}` : ""}
              ${x.cor ? `<small class="muted">${esc(x.cor)}</small>` : ""}</div>
            <button class="btn small ghost" data-edit-car="${x.id}">Editar</button>
          </div>`).join("")
        : `<div class="empty small">Nenhum carro cadastrado.</div>`}
    </div>`);

  $("#editCli", card).onclick = () => formCliente(c, reopen);
  $("#addCar", card).onclick = () => formCarro(null, cid, reopen);
  $$("[data-edit-car]", card).forEach((b) => (b.onclick = () => formCarro(cars.find((x) => x.id === b.dataset.editCar), cid, reopen)));
}

function formCliente(c = null, onDone = route) {
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
      onDone();
    } catch (err) { toast(err.message, "err"); }
  };
  if (c) $("[data-del]").onclick = async () => {
    if (await confirmDialog(`Excluir ${c.nome}? Os carros vinculados também serão removidos.`)) {
      await db.clientes.remove(c.id); toast("Excluído."); close(); route();
    }
  };
}

// Carro sempre vinculado a um cliente (clienteId fixo).
function formCarro(c, clienteId, onDone = route) {
  const { close } = openModal(c ? "Editar carro" : "Novo carro", `
    <form id="f" class="form">
      <label>Placa<input name="placa" required value="${esc(c?.placa || "")}" style="text-transform:uppercase"/></label>
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
    d.cliente_id = clienteId;
    try { c ? await db.carros.update(c.id, d) : await db.carros.create(d); toast("Carro salvo."); close(); onDone(); }
    catch (err) { toast(err.message, "err"); }
  };
  if (c) $("[data-del]").onclick = async () => {
    if (await confirmDialog(`Excluir o carro ${c.placa}?`)) { await db.carros.remove(c.id); toast("Excluído."); close(); onDone(); }
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
          <div style="margin-bottom:8px">${p.base_antiga ? '<span class="tag yuri">base antiga · 40/60</span>' : '<span class="tag split50">50/50</span>'}</div>
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
      <label class="check"><input type="checkbox" name="base_antiga" ${p?.base_antiga ? "checked" : ""}/>
        Parceiro da base antiga (tag Yuri → Rennan 40% / Yuri 60%)</label>
      <label>Observações<textarea name="observacoes">${esc(p?.observacoes || "")}</textarea></label>
      <div class="row gap end">
        ${p ? '<button type="button" class="btn danger" data-del>Excluir</button>' : ""}
        <button class="btn primary" type="submit">Salvar</button>
      </div>
    </form>`);
  $("#f").onsubmit = async (e) => {
    e.preventDefault();
    const d = formData(e.target);
    d.base_antiga = !!e.target.base_antiga.checked;
    try { p ? await db.parceiros.update(p.id, d) : await db.parceiros.create(d); toast("Salvo."); close(); route(); }
    catch (err) { toast(err.message, "err"); }
  };
  if (p) $("[data-del]").onclick = async () => {
    if (await confirmDialog(`Excluir ${p.nome}?`)) { await db.parceiros.remove(p.id); toast("Excluído."); close(); route(); }
  };
}

async function extratoParceiro(p) {
  const ats = await db.atendimentos.byParceiro(p.id);
  const pendentes = ats.filter((a) => a.status_pg === "PENDENTE");
  const totalPendente = pendentes.reduce((s, a) => s + Number(a.valor || 0), 0);
  const textoCobranca = [
    `Olá, ${p.nome}! Segue o relatório dos serviços pendentes:`,
    "",
    ...pendentes.map((a) => `${dateBR(a.data)} — ${a.veiculo || "Veículo"}${a.placa ? ` (${a.placa})` : ""}\n${a.servicos || "Serviço"} — ${money(a.valor)}`),
    "",
    `TOTAL A PAGAR: ${money(totalPendente)}`,
  ].join("\n");
  const { card } = openModal(`Extrato — ${p.nome}`, `
    <div class="report-actions">
      <div><strong>A cobrar: ${money(totalPendente)}</strong><br><small class="muted">Relatório organizado por data, carro e serviço.</small></div>
      <button class="btn wa" id="copiarCobranca" ${pendentes.length ? "" : "disabled"}>📋 Copiar para WhatsApp</button>
    </div>
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
        <td class="r"><strong>${money(totalPendente)}</strong></td>
        <td colspan="2"></td></tr></tfoot>
    </table></div>`, { wide: true });
  $("#copiarCobranca", card).onclick = async () => {
    try { await navigator.clipboard.writeText(textoCobranca); toast("Relatório copiado. É só colar no WhatsApp."); }
    catch { window.prompt("Copie o relatório abaixo:", textoCobranca); }
  };
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
          <td class="r"><button class="btn small" data-vales="${f.id}">💵 Vales</button>
            <button class="btn small ghost" data-edit="${f.id}">Editar</button></td></tr>`
        )
        .join("")}</tbody></table></div>`;
  $("#add").onclick = () => formFunc();
  $$("[data-edit]").forEach((b) => (b.onclick = () => formFunc(list.find((x) => x.id === b.dataset.edit))));
  $$("[data-vales]").forEach((b) => (b.onclick = () => valesFuncionario(list.find((x) => x.id === b.dataset.vales))));
}

// Registro de vales (adiantamentos) de um funcionário — para descontar no acerto.
async function valesFuncionario(f) {
  let vales;
  try { vales = await db.vales.byFuncionario(f.id); }
  catch (err) { toast("Tabela de vales ainda não existe no banco. Rode migracao-v1.3.0.sql no Supabase.", "err"); return; }
  const total = vales.reduce((s, v) => s + Number(v.valor || 0), 0);
  const reopen = () => valesFuncionario(f);
  const { card } = openModal(`Vales — ${f.nome}`, `
    <div class="report-actions">
      <div><strong>Total em vales: ${money(total)}</strong><br>
        <small class="muted">${vales.length} lançamento(s) · descontar no acerto do funcionário.</small></div>
      <button class="btn primary" id="addVale">+ Registrar vale</button>
    </div>
    <div class="table-wrap"><table>
      <thead><tr><th>Data</th><th>Descrição</th><th class="r">Valor</th><th></th></tr></thead>
      <tbody>${vales.length ? vales.map((v) => `<tr>
        <td>${dateBR(v.data)}</td>
        <td>${esc(v.descricao || "—")}</td>
        <td class="r">${money(v.valor)}</td>
        <td class="r"><button class="btn small ghost" data-del-vale="${v.id}">✕</button></td>
      </tr>`).join("") : '<tr><td colspan="4" class="empty small">Nenhum vale registrado.</td></tr>'}</tbody>
      <tfoot><tr><td colspan="2"><strong>Total</strong></td><td class="r"><strong>${money(total)}</strong></td><td></td></tr></tfoot>
    </table></div>`, { wide: true });
  $("#addVale", card).onclick = () => formVale(f, reopen);
  $$("[data-del-vale]", card).forEach((b) => (b.onclick = async () => {
    if (await confirmDialog("Excluir este vale?")) { await db.vales.remove(b.dataset.delVale); toast("Vale excluído."); reopen(); }
  }));
}

function formVale(f, onDone = route) {
  const { close } = openModal(`Novo vale — ${f.nome}`, `
    <form id="fvale" class="form">
      <label>Data<input name="data" type="date" value="${today()}" required /></label>
      <label>Valor<input name="valor" type="number" step="0.01" min="0" required placeholder="0,00" /></label>
      <label>Descrição / motivo<input name="descricao" placeholder="Ex: adiantamento, vale-transporte…" /></label>
      <div class="row gap end"><button class="btn primary" type="submit">Salvar vale</button></div>
    </form>`);
  $("#fvale").onsubmit = async (e) => {
    e.preventDefault();
    const d = formData(e.target); d.valor = Number(d.valor || 0); d.funcionario_id = f.id;
    try { await db.vales.create(d); toast("Vale registrado."); close(); onDone(); }
    catch (err) { toast(err.message, "err"); }
  };
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

// Chave de semana ISO (ano-Wnn) para agrupar faltas e descontar 1 domingo por semana.
function isoWeekKey(dateStr) {
  const d = new Date(String(dateStr).slice(0, 10) + "T12:00:00");
  const t = new Date(d);
  t.setDate(t.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(t.getFullYear(), 0, 4);
  const wk = 1 + Math.round(((t - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return t.getFullYear() + "-W" + String(wk).padStart(2, "0");
}

// ============================================================ PRESENÇA
async function viewPresenca() {
  const [funcsAll, resetStr] = await Promise.all([db.funcionarios.list(), db.config.get("presenca_reset", "")]);
  const funcs = funcsAll.filter((f) => f.ativo !== false);
  const reset = resetStr || "";
  const ps = { data: today(), filtro: "" };

  $("#view").innerHTML = `
    <div class="card">
      <div class="card-head">
        <h3>Lançar presença</h3>
        <div class="row gap" style="align-items:center">
          <button class="btn small danger" id="faltaRetro">+ Falta retroativa</button>
          <label class="inline-date">Dia <input type="date" id="presData" value="${ps.data}" max="${today()}"/></label>
        </div>
      </div>
      <div id="marcar" class="list"></div>
    </div>

    <div class="card">
      <div class="card-head"><h3>Contagem / Acerto</h3>
        <button class="btn small danger" id="zerar">Zerar contador</button></div>
      <p class="muted small">Contando ${reset ? `desde <strong>${dateBR(reset)}</strong>` : "<strong>desde o início</strong>"}.
        Uma falta na semana desconta 1 domingo (DSR). Os registros não são apagados ao zerar.</p>
      <div id="dsrAlert"></div>
      <div id="contagem"></div>
    </div>

    <div class="card">
      <div class="card-head"><h3>Histórico completo</h3>
        <select id="presFiltro" class="mini">
          <option value="">Todos os colaboradores</option>
          ${funcs.map((f) => `<option value="${f.id}">${esc(f.nome)}</option>`).join("")}
        </select>
      </div>
      <div id="histTabela"></div>
    </div>`;

  $("#zerar").onclick = async () => {
    if (await confirmDialog("Zerar o contador a partir de hoje? Os registros NÃO serão apagados — apenas a contagem recomeça.")) {
      await db.config.set("presenca_reset", today());
      toast("Contador zerado. Nova contagem iniciada.");
      route();
    }
  };

  function formFaltaRetroativa() {
    const ontem = daysAgo(1);
    const { close } = openModal("Lançar falta retroativa", `
      <form id="fFaltaRetro" class="form">
        <label>Colaborador
          <select name="funcionario_id" required>
            <option value="">Selecione</option>
            ${funcs.map((f) => `<option value="${f.id}">${esc(f.nome)}</option>`).join("")}
          </select>
        </label>
        <label>Data da falta
          <input name="data" type="date" value="${ontem}" max="${ontem}" required />
        </label>
        <p class="muted small">Use para registrar faltas de dias anteriores a hoje. Se já houver presença nessa data, o registro será alterado para falta.</p>
        <div class="row gap end">
          <button class="btn ghost" type="button" data-cancel>Cancelar</button>
          <button class="btn danger" type="submit">Registrar falta</button>
        </div>
      </form>`);
    $("[data-cancel]").onclick = close;
    $("#fFaltaRetro").onsubmit = async (e) => {
      e.preventDefault();
      const d = formData(e.target);
      if (!d.data || d.data >= today()) {
        toast("Escolha uma data anterior a hoje.", "err");
        return;
      }
      try {
        await db.presenca.upsert({ data: d.data, funcionario_id: d.funcionario_id, status: "FALTA", hora: null });
        ps.data = d.data;
        $("#presData").value = d.data;
        toast("Falta retroativa registrada.");
        close();
        renderMarcar();
        renderHist();
      } catch (err) { toast(err.message, "err"); }
    };
  }

  async function renderMarcar() {
    const host = $("#marcar");
    host.innerHTML = `<div class="loading small">Carregando…</div>`;
    const pres = await db.presenca.byData(ps.data);
    const map = Object.fromEntries(pres.map((p) => [p.funcionario_id, p]));
    host.innerHTML = funcs
      .map((f) => {
        const p = map[f.id];
        const marca = p ? `<small class="muted">${p.hora ? p.hora.slice(0, 5) : ""}</small>` : "";
        return `<div class="list-row">
          <div><strong>${esc(f.nome)}</strong> ${marca}</div>
          <div class="row gap" data-func="${f.id}">
            <button class="btn small ${p?.status === "PRESENTE" ? "ok-active" : "ghost"}" data-st="PRESENTE">Presente</button>
            <button class="btn small ${p?.status === "FALTA" ? "danger" : "ghost"}" data-st="FALTA">Falta</button>
          </div>
        </div>`;
      })
      .join("");
    $$("[data-func]", host).forEach((wrap) => {
      $$("[data-st]", wrap).forEach((b) => (b.onclick = async () => {
        const hora = new Date().toTimeString().slice(0, 8);
        await db.presenca.upsert({ data: ps.data, funcionario_id: wrap.dataset.func, status: b.dataset.st, hora });
        toast("Presença registrada.");
        renderMarcar();
        renderHist();
      }));
    });
  }

  async function renderHist() {
    const all = await db.presenca.list(500);

    // CONTAGEM (desde o reset) com desconto de domingo por semana com falta
    const naContagem = all.filter((p) => !reset || String(p.data).slice(0, 10) >= reset);
    const resumo = {};
    naContagem.forEach((p) => {
      const n = p.funcionarios?.nome || "—";
      resumo[n] = resumo[n] || { p: 0, f: 0, semanasFalta: new Set() };
      if (p.status === "PRESENTE") resumo[n].p++;
      else { resumo[n].f++; resumo[n].semanasFalta.add(isoWeekKey(p.data)); }
    });
    const linhas = Object.entries(resumo).map(([n, r]) => {
      const dom = r.semanasFalta.size; // 1 domingo descontado por semana com falta
      return { n, p: r.p, f: r.f, dom };
    });
    const totalDom = linhas.reduce((s, l) => s + l.dom, 0);

    $("#dsrAlert").innerHTML = totalDom
      ? `<div class="alert">⚠️ Desconto de DSR: ${linhas.filter((l) => l.dom).map((l) => `<strong>${esc(l.n)}</strong> −${l.dom} domingo${l.dom > 1 ? "s" : ""}`).join(" · ")}</div>`
      : "";
    $("#contagem").innerHTML = linhas.length
      ? `<div class="table-wrap"><table>
          <thead><tr><th>Colaborador</th><th class="r">Presenças</th><th class="r">Faltas</th><th class="r">Domingos descontados</th></tr></thead>
          <tbody>${linhas
            .map((l) => `<tr><td><strong>${esc(l.n)}</strong></td>
              <td class="r">${l.p}</td>
              <td class="r">${l.f ? `<span class="warn-txt">${l.f}</span>` : 0}</td>
              <td class="r">${l.dom ? `<span class="tag warn">−${l.dom} dom.</span>` : "—"}</td></tr>`)
            .join("")}</tbody></table></div>`
      : `<div class="empty small">Nenhum registro na contagem atual.</div>`;

    // HISTÓRICO COMPLETO (todos os registros, com filtro)
    const list = ps.filtro ? all.filter((p) => p.funcionario_id === ps.filtro) : all;
    $("#histTabela").innerHTML = list.length
      ? `<div class="table-wrap"><table>
          <thead><tr><th>Data</th><th>Colaborador</th><th>Status</th><th>Hora</th></tr></thead>
          <tbody>${list
            .map(
              (p) => `<tr>
            <td>${dateBR(p.data)}</td>
            <td>${esc(p.funcionarios?.nome || "—")}</td>
            <td>${p.status === "PRESENTE" ? '<span class="tag ok">presente</span>' : '<span class="tag warn">falta</span>'}</td>
            <td>${p.hora ? p.hora.slice(0, 5) : "—"}</td>
          </tr>`
            )
            .join("")}</tbody></table></div>`
      : `<div class="empty">Sem registros.</div>`;
  }

  $("#presData").onchange = (e) => { ps.data = e.target.value || today(); renderMarcar(); };
  $("#faltaRetro").onclick = formFaltaRetroativa;
  $("#presFiltro").onchange = (e) => { ps.filtro = e.target.value; renderHist(); };
  renderMarcar();
  renderHist();
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
const formaKey = (f) => {
  const k = norm(f);
  if (k.includes("DINHEIRO")) return "DINHEIRO";
  if (k.includes("CART")) return "CARTAO";
  if (k.includes("PIX")) return "PIX";
  return "OUTRO";
};

// Divisão do período: primeiro calcula o montante a receber de cada sócio pelas regras
// (empresa % por cima; restante Rennan 40% / Yuri 60% na base antiga, 50/50 nas demais).
// Depois as saídas seguem a proporção consolidada dos sócios no período.
function calcRateio(entradasList, saidas, pct) {
  const base = entradasList.filter((l) => l.base_antiga).reduce((s, l) => s + Number(l.valor || 0), 0);
  const comum = entradasList.filter((l) => !l.base_antiga).reduce((s, l) => s + Number(l.valor || 0), 0);
  const total = base + comum;
  const empresa = total * pct;
  const restoBase = base * (1 - pct);
  const restoComum = comum * (1 - pct);
  const rennanBruto = restoBase * 0.40 + restoComum * 0.50;
  const yuriBruto = restoBase * 0.60 + restoComum * 0.50;
  const totalSocios = rennanBruto + yuriBruto;
  // Sem entradas distribuíveis no período, mantém 50/50 para evitar uma proporção indefinida.
  const rennanPct = totalSocios > 0 ? rennanBruto / totalSocios : 0.50;
  const yuriPct = totalSocios > 0 ? yuriBruto / totalSocios : 0.50;
  const saidasRennan = saidas * rennanPct;
  const saidasYuri = saidas * yuriPct;
  return {
    base, comum, total, saidas, empresa, rennanPct, yuriPct, saidasRennan, saidasYuri,
    rennanBruto, yuriBruto,
    rennan: rennanBruto - saidasRennan,
    yuri: yuriBruto - saidasYuri,
    liquido: total - saidas,
  };
}

async function viewFinanceiro() {
  const [list, ats, pctStr] = await Promise.all([
    db.financeiro.list(1000),
    db.atendimentos.list(1000),
    db.config.get("empresa_pct", "0"),
  ]);
  // Mês financeiro do dia 15 ao dia 14 do mês seguinte.
  const { inicio, fim } = mesFinanceiro();
  const periodoLabel = `${dateBR(inicio)} a ${dateBR(fim)}`;
  const doMes = list.filter((l) => { const dd = String(l.data).slice(0, 10); return dd >= inicio && dd <= fim; });
  const entradasMes = doMes.filter((l) => l.tipo === "ENTRADA");
  const entradas = entradasMes.reduce((s, l) => s + Number(l.valor || 0), 0);
  const saidas = doMes.filter((l) => l.tipo === "SAIDA").reduce((s, l) => s + Number(l.valor || 0), 0);

  // Caixa acumulado + discriminação das entradas por forma de pagamento
  const entAll = list.filter((l) => l.tipo === "ENTRADA");
  const totalEnt = entAll.reduce((s, l) => s + Number(l.valor || 0), 0);
  const totalSai = list.filter((l) => l.tipo === "SAIDA").reduce((s, l) => s + Number(l.valor || 0), 0);
  const caixa = totalEnt - totalSai;
  const porForma = { DINHEIRO: 0, CARTAO: 0, PIX: 0, OUTRO: 0 };
  entAll.forEach((l) => (porForma[formaKey(l.forma_pgto)] += Number(l.valor || 0)));

  // Total pendente (a receber) = atendimentos ainda não pagos
  const pendentesAts = ats.filter((a) => a.status_pg === "PENDENTE");
  const totalPendente = pendentesAts.reduce((s, a) => s + Number(a.valor || 0), 0);

  const pct = Number(pctStr || 0) / 100;
  const atsMap = Object.fromEntries(ats.map((a) => [a.id, a]));
  const periodos = periodosFinanceiros(list.map((l) => l.data)); // mais recente primeiro

  // Fechamento diário reconstruído dos atendimentos e movimentos do caixa.
  const dias = {};
  const dia = (data) => dias[String(data).slice(0, 10)] ||= { carros: 0, faturado: 0, recebido: 0, saidas: 0 };
  ats.forEach((a) => { const d = dia(a.data); d.carros++; d.faturado += Number(a.valor || 0); });
  list.forEach((l) => { const d = dia(l.data); l.tipo === "ENTRADA" ? d.recebido += Number(l.valor || 0) : d.saidas += Number(l.valor || 0); });
  const fechamentos = Object.entries(dias).sort(([a], [b]) => b.localeCompare(a));

  $("#view").innerHTML = `
    <nav class="finance-nav" aria-label="Visualizações do financeiro">
      <button class="finance-nav-item active" data-fin-tab="dashboard">📊 Dashboard</button>
      <button class="finance-nav-item" data-fin-tab="divisao">👥 Resumo da Divisão</button>
      <button class="finance-nav-item" data-fin-tab="fechamento">📚 Histórico de Fechamento</button>
      <button class="finance-nav-item" data-fin-tab="lancamentos">🧾 Lançamentos Detalhados</button>
    </nav>

    <section data-fin-section="dashboard">
    <div class="kpis">
      ${kpi("Entradas (mês)", money(entradas), periodoLabel)}
      ${kpi("Saídas (mês)", money(saidas), periodoLabel)}
      ${kpi("Total em caixa", money(caixa), "recebido − saídas (acum.)")}
      ${kpi("Total pendente", money(totalPendente), `${pendentesAts.length} a receber`)}
    </div>

    <div class="grid-2 finance-single-grid">
      ${card(`
        <div class="card-head"><h3>💵 Caixa discriminado (acum.)</h3></div>
        <div class="list">
          <div class="list-row"><span class="muted">Dinheiro</span><strong>${money(porForma.DINHEIRO)}</strong></div>
          <div class="list-row"><span class="muted">Cartão</span><strong>${money(porForma.CARTAO)}</strong></div>
          <div class="list-row"><span class="muted">PIX</span><strong>${money(porForma.PIX)}</strong></div>
          ${porForma.OUTRO ? `<div class="list-row"><span class="muted">Outros</span><strong>${money(porForma.OUTRO)}</strong></div>` : ""}
          <div class="list-row"><span class="muted">(−) Saídas</span><strong class="warn-txt">${money(totalSai)}</strong></div>
          <div class="list-row"><span>Total em caixa</span><strong>${money(caixa)}</strong></div>
        </div>
        <div class="row gap" style="margin-top:12px">
          <button class="btn ok block" id="addEnt">+ Entrada</button>
          <button class="btn danger block" id="addSai">+ Saída</button>
        </div>`)}
    </div>
    </section>

    <section data-fin-section="divisao" hidden>
      <div class="card" style="margin-bottom:14px">
        <div class="card-head">
          <h3>👥 Resumo da Divisão</h3>
          <label class="inline-date">Período
            <select id="divPeriodo" class="mini">
              ${periodos.map((p) => `<option value="${p.inicio}">${dateBR(p.inicio)} a ${dateBR(p.fim)}</option>`).join("")}
            </select>
          </label>
        </div>
      </div>
      <div id="divConteudo"></div>
    </section>

    <section data-fin-section="fechamento" hidden>
    ${card(`
      <div class="card-head"><h3>📚 Histórico de fechamento diário</h3></div>
      <div class="table-wrap"><table>
        <thead><tr><th>Dia</th><th class="r">Carros</th><th class="r">Faturado</th><th class="r">Recebido</th><th class="r">Saídas</th><th class="r">Saldo do dia</th></tr></thead>
        <tbody>${fechamentos.length ? fechamentos.slice(0, 180).map(([data, f]) => `<tr><td><strong>${dateBR(data)}</strong></td><td class="r">${f.carros}</td><td class="r">${money(f.faturado)}</td><td class="r">${money(f.recebido)}</td><td class="r">${money(f.saidas)}</td><td class="r"><strong>${money(f.recebido - f.saidas)}</strong></td></tr>`).join("") : '<tr><td colspan="6" class="empty small">Sem fechamentos.</td></tr>'}</tbody>
      </table></div>`) }
    </section>

    <section data-fin-section="lancamentos" hidden>
    ${card(`
      <div class="card-head"><h3>Lançamentos</h3></div>
      <div class="table-wrap"><table>
        <thead><tr><th>Data</th><th>Tipo</th><th>Descrição</th><th class="r">Valor</th><th>Forma</th><th></th></tr></thead>
        <tbody>${list
          .slice(0, 150)
          .map(
            (l) => `<tr>
          <td>${dateBR(l.data)}</td>
          <td>${l.tipo === "ENTRADA" ? '<span class="tag ok">entrada</span>' : '<span class="tag warn">saída</span>'}</td>
          <td>${esc(l.descricao || "")} ${l.base_antiga ? '<span class="tag yuri">40/60</span>' : ""}</td>
          <td class="r">${money(l.valor)}</td>
          <td>${esc(l.forma_pgto || "")}</td>
          <td class="r"><button class="btn small ghost" data-del="${l.id}">✕</button></td>
        </tr>`
          )
          .join("")}</tbody>
      </table></div>`) }
    </section>`;

  const setFinanceTab = (tab) => {
    const valido = ["dashboard", "divisao", "fechamento", "lancamentos"].includes(tab) ? tab : "dashboard";
    $$('[data-fin-section]').forEach((s) => { s.hidden = s.dataset.finSection !== valido; });
    $$('[data-fin-tab]').forEach((b) => b.classList.toggle("active", b.dataset.finTab === valido));
    localStorage.setItem("tl_finance_tab", valido);
  };
  $$('[data-fin-tab]').forEach((b) => b.onclick = () => setFinanceTab(b.dataset.finTab));
  setFinanceTab(localStorage.getItem("tl_finance_tab") || "dashboard");

  $("#addEnt").onclick = () => formFinanceiro("ENTRADA");
  $("#addSai").onclick = () => formFinanceiro("SAIDA");
  $$("[data-del]").forEach((b) => (b.onclick = async () => {
    if (await confirmDialog("Excluir lançamento?")) { await db.financeiro.remove(b.dataset.del); toast("Excluído."); route(); }
  }));

  // Resumo da Divisão — renderiza conforme o período selecionado.
  const renderDivisao = (pInicio) => {
    const periodo = periodos.find((x) => x.inicio === pInicio) || periodos[0];
    const label = `${dateBR(periodo.inicio)} a ${dateBR(periodo.fim)}`;
    const doP = list.filter((l) => { const dd = String(l.data).slice(0, 10); return dd >= periodo.inicio && dd <= periodo.fim; });
    const entP = doP.filter((l) => l.tipo === "ENTRADA");
    const saiP = doP.filter((l) => l.tipo === "SAIDA").reduce((s, l) => s + Number(l.valor || 0), 0);
    const r = calcRateio(entP, saiP, pct);
    const itens = entP.map((l) => {
      const valor = Number(l.valor || 0), distribuivel = valor * (1 - pct);
      return {
        ...l, atendimento: atsMap[l.atendimento_id], recebido: valor, empresa: valor * pct,
        rennan: distribuivel * (l.base_antiga ? 0.40 : 0.50),
        yuri: distribuivel * (l.base_antiga ? 0.60 : 0.50),
      };
    });
    const servicos = itens.filter((l) => l.atendimento_id);
    const totServ = servicos.reduce((t, l) => ({ rec: t.rec + l.recebido, emp: t.emp + l.empresa, ren: t.ren + l.rennan, yur: t.yur + l.yuri }), { rec: 0, emp: 0, ren: 0, yur: 0 });

    $("#divConteudo").innerHTML = `
      <div class="grid-2 finance-single-grid">
        ${card(`
          <div class="card-head"><h3>💰 Montante a receber (${label})</h3>
            <button class="btn small" id="relFechamento">📄 Relatório de fechamento</button></div>
          <p class="muted small">A % da empresa sai primeiro. Do restante, clientes da <strong>base antiga</strong> são divididos em Rennan 40% / Yuri 60% e clientes da <strong>base nova</strong> em 50% / 50%. O peso consolidado dessas entradas define também o rateio proporcional das saídas do período.</p>
          <div class="row gap" style="align-items:flex-end;margin-bottom:12px">
            <label style="flex:0 0 140px">% da empresa
              <input id="empresaPct" type="number" min="0" max="100" step="1" value="${esc(pctStr || 0)}"/></label>
            <button class="btn primary" id="salvarPct">Salvar %</button>
          </div>
          <div class="list" style="margin-bottom:12px">
            <div class="list-row"><span class="muted">Entradas (bruto)</span><strong>${money(r.total)}</strong></div>
            <div class="list-row"><span class="muted">(−) Saídas do período</span><strong class="warn-txt">${money(r.saidas)}</strong></div>
            <div class="list-row"><span>Lucro líquido</span><strong>${money(r.liquido)}</strong></div>
          </div>
          <div class="split split-3">
            <div class="split-box"><span>Empresa (${esc(pctStr || 0)}%)</span><strong>${money(r.empresa)}</strong></div>
            <div class="split-box clickable" data-extrato="rennan" role="button" tabindex="0" title="Ver extrato do Rennan"><span>Rennan 🔍</span><strong>${money(r.rennan)}</strong></div>
            <div class="split-box clickable" data-extrato="yuri" role="button" tabindex="0" title="Ver extrato do Yuri"><span>Yuri 🔍</span><strong>${money(r.yuri)}</strong></div>
          </div>
          <p class="muted small" style="margin-top:8px">Rateio das saídas neste período: <strong>Rennan ${(r.rennanPct * 100).toFixed(2)}%</strong> (${money(r.saidasRennan)}) e <strong>Yuri ${(r.yuriPct * 100).toFixed(2)}%</strong> (${money(r.saidasYuri)}). Esses percentuais refletem o mix de clientes das bases antiga e nova. Clique no sócio para ver o extrato.</p>`)}
      </div>

      ${card(`
        <div class="card-head"><h3>🧮 Montante por serviço (${label})</h3></div>
        <p class="muted small">Montante bruto de cada serviço por sócio (antes de abater as saídas). A parte da empresa (${esc(pctStr || 0)}%) sai por cima; o restante segue 40/60 (base antiga) ou 50/50 (base nova). As saídas são rateadas pela proporção consolidada resultante: Rennan ${(r.rennanPct * 100).toFixed(2)}% e Yuri ${(r.yuriPct * 100).toFixed(2)}%.</p>
        <div class="table-wrap"><table>
          <thead><tr><th>Data</th><th>Cliente / serviço</th><th>Regra</th><th class="r">Recebido</th><th class="r">Empresa</th><th class="r">Rennan</th><th class="r">Yuri</th></tr></thead>
          <tbody>${servicos.length ? servicos.map((l) => {
            const a = l.atendimento || {};
            const quem = a.tipo === "PARCEIRO" ? a.parceiros?.nome : a.clientes?.nome;
            return `<tr><td>${dateBR(l.data)}</td><td><strong>${esc(quem || a.veiculo || "Serviço")}</strong><br><small class="muted">${esc(a.servicos || l.descricao || "")}</small></td>
              <td>${l.base_antiga ? '<span class="tag yuri">40/60</span>' : '<span class="tag split50">50/50</span>'}</td><td class="r">${money(l.recebido)}</td><td class="r">${money(l.empresa)}</td><td class="r">${money(l.rennan)}</td><td class="r"><strong>${money(l.yuri)}</strong></td></tr>`;
          }).join("") : '<tr><td colspan="7" class="empty small">Nenhum serviço recebido neste período.</td></tr>'}</tbody>
          ${servicos.length ? `<tfoot><tr><td colspan="3"><strong>Total dos serviços</strong></td><td class="r"><strong>${money(totServ.rec)}</strong></td><td class="r"><strong>${money(totServ.emp)}</strong></td><td class="r"><strong>${money(totServ.ren)}</strong></td><td class="r"><strong>${money(totServ.yur)}</strong></td></tr></tfoot>` : ""}
        </table></div>`) }`;

    $("#salvarPct").onclick = async () => {
      const v = Math.max(0, Math.min(100, Number($("#empresaPct").value || 0)));
      await db.config.set("empresa_pct", v);
      toast("% da empresa salva."); route();
    };
    $("#relFechamento").onclick = () => relatorioFechamento(label, itens, r, pctStr || 0);
    $$('[data-extrato]').forEach((b) => {
      const abrir = () => extratoDistribuicao(b.dataset.extrato, itens, r, pctStr || 0, label);
      b.onclick = abrir;
      b.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); abrir(); } };
    });
  };
  $("#divPeriodo").onchange = (e) => renderDivisao(e.target.value);
  renderDivisao(periodos[0].inicio);
}

// Extrato do montante a receber de um sócio no período: soma dos serviços (bruto)
// e o abatimento proporcional das saídas do período, deixando o total final explícito.
function extratoDistribuicao(socio, itens, r, pctLabel, periodoLabel) {
  const nome = socio === "yuri" ? "Yuri" : "Rennan";
  const bruto = socio === "yuri" ? r.yuriBruto : r.rennanBruto;
  const total = socio === "yuri" ? r.yuri : r.rennan;
  const socioPct = socio === "yuri" ? r.yuriPct : r.rennanPct;
  const saidaSocio = socio === "yuri" ? r.saidasYuri : r.saidasRennan;
  const pctOf = (l) => (l.base_antiga ? (socio === "yuri" ? "60%" : "40%") : "50%");
  const rows = itens.slice().sort((a, b) => String(a.data).localeCompare(String(b.data)));
  const linhas = rows.map((l) => {
    const a = l.atendimento;
    const titulo = a ? ((a.tipo === "PARCEIRO" ? a.parceiros?.nome : a.clientes?.nome) || a.veiculo || "Serviço") : (l.descricao || "Entrada avulsa");
    const sub = a ? (a.servicos || l.descricao || "") : "";
    const valSocio = socio === "yuri" ? l.yuri : l.rennan;
    return `<tr>
      <td>${dateBR(l.data)}</td>
      <td><strong>${esc(titulo)}</strong>${sub ? `<br><small class="muted">${esc(sub)}</small>` : ""}</td>
      <td>${l.base_antiga ? '<span class="tag yuri">40/60</span>' : '<span class="tag split50">50/50</span>'}</td>
      <td class="r">${money(l.recebido)}</td>
      <td class="r">${pctOf(l)}</td>
      <td class="r"><strong>${money(valSocio)}</strong></td>
    </tr>`;
  }).join("");
  const notaPct = Number(pctLabel) ? ` (após ${esc(pctLabel)}% da empresa)` : "";
  openModal(`Montante a receber — ${nome}`, `
    <p class="muted small">Período <strong>${esc(periodoLabel)}</strong>. Em cada serviço o ${nome} recebe o percentual da sua base${notaPct}. No final, as saídas são abatidas na proporção consolidada das entradas: <strong>${(socioPct * 100).toFixed(2)}%</strong> para ${nome}.</p>
    <div class="table-wrap"><table>
      <thead><tr><th>Data</th><th>Cliente / serviço</th><th>Regra</th><th class="r">Recebido</th><th class="r">% ${nome}</th><th class="r">${nome}</th></tr></thead>
      <tbody>${linhas || `<tr><td colspan="6" class="empty small">Sem entradas no período.</td></tr>`}</tbody>
      <tfoot>
        <tr><td colspan="5"><strong>Montante bruto (soma dos serviços)</strong></td><td class="r"><strong>${money(bruto)}</strong></td></tr>
        <tr><td colspan="5">(−) ${(socioPct * 100).toFixed(2)}% das saídas do período</td><td class="r warn-txt">${money(saidaSocio)}</td></tr>
        <tr><td colspan="5"><strong>Total a receber</strong></td><td class="r"><strong>${money(total)}</strong></td></tr>
      </tfoot>
    </table></div>`, { wide: true });
}

// Abre uma janela imprimível com o fechamento geral do período:
// divisão de cada sócio detalhada por serviço (estratificada) e consolidada.
function relatorioFechamento(periodoLabel, itens, r, pct) {
  const rows = itens.slice().sort((a, b) => String(a.data).localeCompare(String(b.data)));
  const linhas = rows.map((l) => {
    const a = l.atendimento;
    const titulo = a ? ((a.tipo === "PARCEIRO" ? a.parceiros?.nome : a.clientes?.nome) || a.veiculo || "Serviço") : (l.descricao || "Entrada avulsa");
    const sub = a ? (a.servicos || l.descricao || "") : "";
    const desc = sub ? `${titulo} — ${sub}` : titulo;
    return `<tr>
      <td>${dateBR(l.data)}</td>
      <td>${esc(desc)}</td>
      <td style="text-align:center">${l.base_antiga ? "40/60" : "50/50"}</td>
      <td class="tot">${money(l.recebido)}</td>
      <td class="tot">${money(l.empresa)}</td>
      <td class="tot">${money(l.rennan)}</td>
      <td class="tot">${money(l.yuri)}</td>
    </tr>`;
  }).join("");
  const w = window.open("", "_blank", "width=940,height=940");
  w.document.write(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"/>
    <title>Fechamento ${periodoLabel} — Top Line</title>
    <style>
      body{font:14px/1.5 -apple-system,Segoe UI,Roboto,sans-serif;color:#111;padding:32px;max-width:900px;margin:auto}
      h1{font-size:20px;margin:0} h2{font-size:15px;margin:24px 0 8px}
      .muted{color:#666} table{width:100%;border-collapse:collapse;margin-top:8px}
      th,td{padding:7px 8px;border-bottom:1px solid #ddd;font-size:13px} th{text-align:left;background:#f4f6fa}
      .boxes{display:flex;gap:12px;margin-top:10px} .box{flex:1;border:1px solid #ddd;border-radius:10px;padding:14px}
      .box span{color:#666;font-size:12px;display:block} .box strong{font-size:18px}
      .tot{text-align:right} .foot{margin-top:28px;color:#888;font-size:12px}
      tfoot td{background:#fafbfe} tr.sum td{border-top:2px solid #cbd5e1}
      @media print{button{display:none}}
    </style></head><body>
    <h1>Top Line Higienizações — Fechamento ${periodoLabel}</h1>
    <p class="muted">Relatório geral de fechamento. Divisão de cada sócio, detalhada por serviço e consolidada. Gerado em ${dateBR(today())}.</p>
    <div class="boxes">
      <div class="box"><span>Entradas (bruto)</span><strong>${money(r.total)}</strong></div>
      <div class="box"><span>(−) Saídas</span><strong>${money(r.saidas)}</strong></div>
      <div class="box"><span>Lucro líquido</span><strong>${money(r.liquido)}</strong></div>
    </div>
    <div class="boxes">
      <div class="box"><span>Empresa (${pct}%)</span><strong>${money(r.empresa)}</strong></div>
      <div class="box"><span>Rennan a receber</span><strong>${money(r.rennan)}</strong></div>
      <div class="box"><span>Yuri a receber</span><strong>${money(r.yuri)}</strong></div>
    </div>

    <h2>Divisão consolidada</h2>
    <table><tbody>
      <tr><td>Entradas base antiga (40/60)</td><td class="tot">${money(r.base)}</td></tr>
      <tr><td>Entradas demais (50/50)</td><td class="tot">${money(r.comum)}</td></tr>
      <tr><td>Parte da empresa (${pct}%)</td><td class="tot">${money(r.empresa)}</td></tr>
      <tr><td>Montante bruto Rennan</td><td class="tot">${money(r.rennanBruto)}</td></tr>
      <tr><td>Montante bruto Yuri</td><td class="tot">${money(r.yuriBruto)}</td></tr>
      <tr><td>(−) Saídas do período (rateio proporcional ao mix das bases)</td><td class="tot">${money(r.saidas)}</td></tr>
      <tr><td>Parte das saídas — Rennan (${(r.rennanPct * 100).toFixed(2)}%)</td><td class="tot">${money(r.saidasRennan)}</td></tr>
      <tr><td>Parte das saídas — Yuri (${(r.yuriPct * 100).toFixed(2)}%)</td><td class="tot">${money(r.saidasYuri)}</td></tr>
      <tr class="sum"><td><strong>Rennan a receber</strong></td><td class="tot"><strong>${money(r.rennan)}</strong></td></tr>
      <tr class="sum"><td><strong>Yuri a receber</strong></td><td class="tot"><strong>${money(r.yuri)}</strong></td></tr>
    </tbody></table>

    <h2>Detalhamento por serviço (${rows.length})</h2>
    <table>
      <thead><tr><th>Data</th><th>Descrição</th><th style="text-align:center">Regra</th><th class="tot">Recebido</th><th class="tot">Empresa</th><th class="tot">Rennan</th><th class="tot">Yuri</th></tr></thead>
      <tbody>${linhas || '<tr><td colspan="7" class="muted">Sem entradas no período.</td></tr>'}</tbody>
      <tfoot>
        <tr class="sum"><td colspan="3"><strong>Montante bruto (total)</strong></td><td class="tot"><strong>${money(r.total)}</strong></td><td class="tot"><strong>${money(r.empresa)}</strong></td><td class="tot"><strong>${money(r.rennanBruto)}</strong></td><td class="tot"><strong>${money(r.yuriBruto)}</strong></td></tr>
        <tr><td colspan="5">(−) Saídas proporcionais (${(r.rennanPct * 100).toFixed(2)}% / ${(r.yuriPct * 100).toFixed(2)}%)</td><td class="tot">${money(r.saidasRennan)}</td><td class="tot">${money(r.saidasYuri)}</td></tr>
        <tr class="sum"><td colspan="5"><strong>Total a receber por sócio</strong></td><td class="tot"><strong>${money(r.rennan)}</strong></td><td class="tot"><strong>${money(r.yuri)}</strong></td></tr>
      </tfoot>
    </table>
    <p class="foot">Gerado pelo sistema Top Line Higienizações.</p>
    <button onclick="window.print()" style="margin-top:20px;padding:10px 18px;border:none;border-radius:8px;background:#2f7cff;color:#fff;font-weight:600;cursor:pointer">Imprimir / Salvar PDF</button>
    </body></html>`);
  w.document.close();
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
