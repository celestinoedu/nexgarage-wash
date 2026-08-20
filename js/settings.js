import * as db from "./db.js?v=2.0";
import { $, $$, esc, openModal, toast } from "./ui.js?v=2.0";

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
  if (!context?.permissions?.canManageAccount) {
    root.innerHTML = `<div class="card"><div class="empty">Somente o proprietário ou administrador pode acessar estas configurações.</div></div>`;
    return;
  }

  const accountId = context.store.account_id;
  const [stores, users] = await Promise.all([db.access.stores(), db.access.accountUsers(accountId)]);
  root.innerHTML = `
    <div class="settings-head">
      <div>
        <h2>Configurações da conta</h2>
        <p class="muted">Gerencie as lojas da TOP LINE, usuários e permissões de acesso.</p>
      </div>
    </div>

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
    </div>`;

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
