import * as db from "./db.js?v=2.1.0";
import { $, $$, esc, openModal, toast } from "./ui.js?v=2.1.0";
import { setVersionPreference, versionPreference, newAppUrl } from "./version-switch.js?v=2.1.0";

// ---- CPF -------------------------------------------------------------------
const onlyDigits = (value) => String(value || "").replace(/[^0-9]/g, "");

function formatCPF(value) {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

// Validação pelos dois dígitos verificadores, para não gravar CPF inexistente.
function isValidCPF(value) {
  const digits = onlyDigits(value);
  if (digits.length !== 11) return false;
  if (new Set(digits).size === 1) return false; // 000..., 111... nao sao CPFs validos
  for (const length of [9, 10]) {
    let sum = 0;
    for (let i = 0; i < length; i += 1) sum += Number(digits[i]) * (length + 1 - i);
    const check = (sum * 10) % 11 % 10;
    if (check !== Number(digits[length])) return false;
  }
  return true;
}

const accountRoleLabel = (role) =>
  role === "owner" ? "Proprietário" : role === "admin" ? "Administrador" : "Membro";
const storeRoleLabel = (role) =>
  ({ admin: "Administrador", manager: "Gerente", operator: "Operador", finance: "Financeiro", viewer: "Somente leitura" })[role] || role;

const errorMessage = (error) => {
  const message = String(error?.message || error || "Não foi possível concluir.");
  if (message.includes("Account admin")) return "Somente o proprietário ou administrador pode gerenciar acessos.";
  if (message.includes("Owner access")) return "O acesso do proprietário é protegido e não pode ser alterado.";
  if (message.includes("User must create")) return "Este e-mail ainda não possui login. O usuário deve criar o login antes da liberação.";
  if (message.includes("Store name")) return "Informe o nome da loja.";
  return message;
};

export async function renderConfiguracoes(context) {
  const root = $("#view");
  const isAdmin = Boolean(context?.permissions?.canManageAccount);
  const accountId = context?.store?.account_id;

  // Meus dados e Visualização valem para qualquer usuário; lojas e acessos
  // continuam restritos a proprietário e administrador.
  const [profile, stores, users] = await Promise.all([
    db.perfil.get(),
    db.access.stores(),
    isAdmin ? db.access.accountUsers(accountId) : Promise.resolve([]),
  ]);

  root.innerHTML = `
    <div class="settings-head">
      <div>
        <h2>Configurações</h2>
        <p class="muted">Seus dados, o formato de visualização e ${isAdmin ? "a administração da conta" : "suas preferências"}.</p>
      </div>
    </div>

    ${profileCardHTML(profile)}
    ${scopeCardHTML(stores)}

    ${!isAdmin ? "" : `
    <div class="card">
      <div class="card-head">
        <div><h3>Lojas</h3><p class="muted small">Cada unidade possui dados operacionais independentes.</p></div>
        <button class="btn primary" id="newStore">+ Nova loja</button>
      </div>
      <div class="settings-grid">
        ${stores.map((store) => `
          <article class="settings-item ${store.id === context.store.id ? "active" : ""}">
            <div class="settings-icon">🏪</div>
            <div class="settings-content">
              <strong>${esc(store.name)}</strong>
              <span class="muted small">${esc([store.city, store.state].filter(Boolean).join(" · ") || "Local não informado")}</span>
              ${store.id === context.store.id ? `<span class="tag ok">Loja ativa</span>` : ""}
            </div>
            <div class="settings-actions">
              ${store.id !== context.store.id ? `<button class="btn small" data-open-store="${esc(store.id)}">Acessar</button>` : ""}
              <button class="btn small ghost" data-edit-store="${esc(store.id)}">Editar</button>
            </div>
          </article>`).join("")}
      </div>
    </div>

    <div class="card">
      <div class="card-head">
        <div><h3>Usuários e acessos</h3><p class="muted small">Administradores acessam todas as lojas. Membros acessam somente as unidades selecionadas.</p></div>
        <button class="btn primary" id="newUser">+ Conceder acesso</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Usuário</th><th>Papel na conta</th><th>Lojas</th><th></th></tr></thead>
          <tbody>
            ${users.map((user) => `
              <tr>
                <td><strong>${esc(user.full_name)}</strong><br><span class="muted small">${esc(user.email)}</span></td>
                <td>${accountRoleLabel(user.account_role)}</td>
                <td>${["owner", "admin"].includes(user.account_role)
                  ? `<span class="tag ok">Todas as lojas</span>`
                  : user.store_ids.length
                    ? user.store_ids.map((id) => {
                        const store = stores.find((item) => item.id === id);
                        return store ? `<span class="tag">${esc(store.name)} · ${esc(storeRoleLabel(user.store_roles?.[id]))}</span>` : "";
                      }).join(" ")
                    : `<span class="tag warn">Sem loja</span>`}
                </td>
                <td class="r">
                  ${user.account_role === "owner"
                    ? `<span class="muted small">Acesso protegido</span>`
                    : `<button class="btn small" data-edit-user="${esc(user.user_id)}">Editar acessos</button>`}
                </td>
              </tr>`).join("")}
          </tbody>
        </table>
      </div>
    </div>`}`;

  mountProfileCard(profile, context);
  mountScopeCard(context);
  if (!isAdmin) return;

  $("#newStore").onclick = () => storeModal({ accountId, stores, context });
  $("#newUser").onclick = () => userModal({ accountId, stores, context });
  $$('[data-edit-store]').forEach((button) => {
    button.onclick = () => storeModal({ accountId, stores, context, store: stores.find((item) => item.id === button.dataset.editStore) });
  });
  $$('[data-open-store]').forEach((button) => {
    button.onclick = async () => {
      const store = stores.find((item) => item.id === button.dataset.openStore);
      if (!store) return;
      db.access.setActiveStore(store);
      location.hash = "dashboard";
      location.reload();
    };
  });
  $$('[data-edit-user]').forEach((button) => {
    button.onclick = () => userModal({ accountId, stores, context, user: users.find((item) => item.user_id === button.dataset.editUser) });
  });
}

// ---- Meus dados ------------------------------------------------------------
function profileCardHTML(profile) {
  const estendido = profile?.extended !== false;
  return `
    <div class="card">
      <div class="card-head">
        <div><h3>Meus dados</h3><p class="muted small">O nome informado aqui é o que aparece na saudação e nas telas de acesso.</p></div>
      </div>
      <form class="form" id="profileForm">
        <div class="grid-2">
          <label>Nome completo<input name="full_name" required value="${esc(profile?.full_name || "")}" placeholder="Seu nome" /></label>
          ${estendido ? `<label>CPF<input name="document" id="profileDoc" inputmode="numeric" maxlength="14" value="${esc(formatCPF(profile?.document || ""))}" placeholder="000.000.000-00" /></label>` : ""}
        </div>
        <div class="grid-2">
          <label>Telefone<input name="phone" value="${esc(profile?.phone || "")}" placeholder="(00) 0000-0000" /></label>
          ${estendido ? `<label>WhatsApp<input name="whatsapp" value="${esc(profile?.whatsapp || "")}" placeholder="(00) 00000-0000" /></label>` : ""}
        </div>
        <div class="grid-2">
          ${estendido ? `<label>Data de nascimento<input name="birth_date" type="date" value="${esc(String(profile?.birth_date || "").slice(0, 10))}" /></label>` : ""}
          <label>E-mail<input name="email" type="email" required value="${esc(profile?.email || "")}" /></label>
        </div>
        <p class="muted small">Trocar o e-mail exige confirmação: um link é enviado para o novo endereço e o acesso só muda depois que você confirmar.</p>
        ${estendido ? "" : `<p class="muted small">CPF, WhatsApp e data de nascimento aparecem aqui depois que a migração <code>supabase/nexwash_profile_fields.sql</code> for aplicada no Supabase.</p>`}
        <p class="err" id="profileError"></p>
        <div class="row gap end"><button class="btn primary" type="submit">Salvar meus dados</button></div>
      </form>
    </div>`;
}

function mountProfileCard(profile, context) {
  const form = $("#profileForm");
  if (!form) return;
  const doc = $("#profileDoc");
  if (doc) doc.oninput = () => { doc.value = formatCPF(doc.value); };

  form.onsubmit = async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.target).entries());
    const error = $("#profileError");
    const submit = event.target.querySelector('[type="submit"]');
    const cpf = onlyDigits(data.document || "");
    if (cpf && !isValidCPF(cpf)) {
      error.textContent = "CPF inválido. Confira os números digitados.";
      return;
    }
    error.textContent = "";
    submit.disabled = true;
    const emailChanged = data.email.trim().toLowerCase() !== String(profile?.email || "").toLowerCase();
    try {
      await db.perfil.save({
        id: profile.id,
        extended: profile.extended !== false,
        full_name: data.full_name.trim(),
        phone: (data.phone || "").trim(),
        whatsapp: (data.whatsapp || "").trim(),
        document: cpf,
        birth_date: data.birth_date || null,
        email: emailChanged ? data.email.trim() : null,
      });
      toast(emailChanged ? "Dados salvos. Confirme o novo e-mail pelo link enviado." : "Dados salvos.");
      await renderConfiguracoes(context);
    } catch (reason) {
      error.textContent = errorMessage(reason);
      submit.disabled = false;
    }
  };
}

// ---- Visualização ----------------------------------------------------------
function scopeOptionHTML({ active, icon, title, detail, action }) {
  return `<button type="button" class="scope-option ${active ? "active" : ""}" data-scope-action="${esc(action)}" aria-pressed="${active}">
    <span class="scope-icon">${icon}</span>
    <strong>${esc(title)}${active ? ' <span class="tag ok">em uso</span>' : ""}</strong>
    <span class="muted small">${esc(detail)}</span>
  </button>`;
}

function scopeCardHTML(stores) {
  const consolidated = db.access.scopeMode() === "consolidated";
  const onNewVersion = versionPreference() === "next";
  return `
    <div class="card">
      <div class="card-head">
        <div><h3>Visualização</h3><p class="muted small">Escolha o escopo dos dados e a versão da interface.</p></div>
      </div>
      <strong class="small">Escopo dos dados</strong>
      <div class="scope-grid">
        ${scopeOptionHTML({
          active: !consolidated,
          icon: "🏪",
          title: "Uma loja por vez",
          detail: "Cada tela mostra apenas os dados da loja selecionada, como no acesso atual.",
          action: "single",
        })}
        ${scopeOptionHTML({
          active: consolidated,
          icon: "🏢",
          title: "Todas as lojas consolidadas",
          detail: "As telas somam os dados de todas as lojas, com filtro por loja e coluna de origem em cada registro.",
          action: "consolidated",
        })}
      </div>
      ${consolidated && stores.length < 2 ? `<p class="muted small">Sua conta tem apenas uma loja, então a visão consolidada mostra o mesmo conteúdo até você cadastrar outra.</p>` : ""}

      <hr />
      <strong class="small">Versão da interface</strong>
      <div class="scope-grid">
        ${scopeOptionHTML({
          active: onNewVersion,
          icon: "✨",
          title: "Versão nova",
          detail: "Interface reformulada do NexWash. É a versão principal.",
          action: "version-next",
        })}
        ${scopeOptionHTML({
          active: !onNewVersion,
          icon: "🖥️",
          title: "Versão atual (legado)",
          detail: "Mantém esta interface, que sua equipe já usa.",
          action: "version-legacy",
        })}
      </div>
    </div>`;
}

function mountScopeCard(context) {
  $$("[data-scope-action]").forEach((button) => {
    button.onclick = () => {
      const action = button.dataset.scopeAction;
      if (action === "single" || action === "consolidated") {
        db.access.setScopeMode(action);
        if (action === "single") db.access.setScopeFilter("all");
        // O escopo muda o cabeçalho e as colunas de todas as telas.
        location.reload();
        return;
      }
      setVersionPreference(action === "version-next" ? "next" : "legacy");
      if (action === "version-next") location.href = newAppUrl();
      else renderConfiguracoes(context);
    };
  });
}

function storeModal({ accountId, context, store = null }) {
  const { close } = openModal(store ? "Editar loja" : "Nova loja", `
    <form class="form" id="storeForm">
      <label>Nome da loja<input name="name" required value="${esc(store?.name || "")}" /></label>
      <div class="grid-2">
        <label>Cidade<input name="city" value="${esc(store?.city || "")}" /></label>
        <label>UF<input name="state" maxlength="2" value="${esc(store?.state || "")}" /></label>
      </div>
      <p class="err" id="storeFormError"></p>
      <div class="row gap end"><button class="btn ghost" type="button" data-cancel>Cancelar</button><button class="btn primary" type="submit">Salvar</button></div>
    </form>`);
  $("[data-cancel]").onclick = close;
  $("#storeForm").onsubmit = async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.target).entries());
    const submit = event.target.querySelector('[type="submit"]');
    submit.disabled = true;
    try {
      if (store) await db.access.updateStore(store.id, { name: data.name.trim(), city: data.city.trim() || null, state: data.state.trim().toUpperCase() || null });
      else await db.access.createStore(accountId, data.name, data.city, data.state);
      close();
      toast(store ? "Loja atualizada." : "Nova loja criada.");
      await renderConfiguracoes(context);
    } catch (error) {
      $("#storeFormError").textContent = errorMessage(error);
      submit.disabled = false;
    }
  };
}

function userModal({ accountId, stores, context, user = null }) {
  const isEditing = Boolean(user);
  const { close } = openModal(isEditing ? "Editar acessos" : "Conceder acesso", `
    <form class="form" id="userAccessForm">
      <label>E-mail<input name="email" type="email" required ${isEditing ? "readonly" : ""} value="${esc(user?.email || "")}" /></label>
      <label>Papel na conta
        <select name="account_role">
          <option value="member" ${user?.account_role === "member" ? "selected" : ""}>Membro com lojas selecionadas</option>
          <option value="admin" ${user?.account_role === "admin" ? "selected" : ""}>Administrador de todas as lojas</option>
        </select>
      </label>
      ${!isEditing ? `<label>Função nas lojas selecionadas
        <select name="store_role">${roleOptions("operator")}</select>
      </label>` : ""}
      <div class="access-store-list">
        <strong class="small">Lojas permitidas</strong>
        ${stores.map((store) => `
          <div class="access-store-row">
            <label class="check"><input type="checkbox" name="store_ids" value="${esc(store.id)}" ${user?.store_ids?.includes(store.id) ? "checked" : ""} /> ${esc(store.name)}</label>
            ${isEditing ? `<select class="mini" name="store_role_${esc(store.id)}">${roleOptions(user?.store_roles?.[store.id] || "operator")}</select>` : ""}
          </div>`).join("")}
      </div>
      <p class="muted small">Para um novo acesso, o usuário precisa primeiro criar o próprio login na tela inicial.</p>
      <p class="err" id="userFormError"></p>
      <div class="row gap end"><button class="btn ghost" type="button" data-cancel>Cancelar</button><button class="btn primary" type="submit">Salvar acesso</button></div>
    </form>` , { wide: true });
  $("[data-cancel]").onclick = close;
  $("#userAccessForm").onsubmit = async (event) => {
    event.preventDefault();
    const form = new FormData(event.target);
    const storeIds = form.getAll("store_ids").map(String);
    const submit = event.target.querySelector('[type="submit"]');
    submit.disabled = true;
    try {
      if (isEditing) {
        const storeAccess = Object.fromEntries(storeIds.map((id) => [id, String(form.get(`store_role_${id}`) || "operator")]));
        await db.access.updateUser(accountId, user.user_id, String(form.get("account_role")), storeAccess);
      } else {
        await db.access.grantUser(accountId, String(form.get("email")), String(form.get("account_role")), storeIds, String(form.get("store_role")));
      }
      close();
      toast("Acesso atualizado.");
      await renderConfiguracoes(context);
    } catch (error) {
      $("#userFormError").textContent = errorMessage(error);
      submit.disabled = false;
    }
  };
}

function roleOptions(selected) {
  return [
    ["operator", "Operador"],
    ["manager", "Gerente"],
    ["finance", "Financeiro"],
    ["viewer", "Somente leitura"],
    ["admin", "Administrador da loja"],
  ].map(([value, label]) => `<option value="${value}" ${selected === value ? "selected" : ""}>${label}</option>`).join("");
}
