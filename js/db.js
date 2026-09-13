// Camada de dados — encapsula o cliente Supabase e as queries do domínio.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cfg = window.LAVA_CONFIG || {};
export const isConfigured = !!(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY);

export const supabase = isConfigured
  ? createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY)
  : null;

// ---- Auth ------------------------------------------------------------------
export const auth = {
  async session() {
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    return data.session;
  },
  signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
  signUp: (email, password, fullName) =>
    supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } }),
  signOut: () => supabase.auth.signOut(),
  onChange: (cb) => supabase?.auth.onAuthStateChange((_e, s) => cb(s)),
};

// ---- Helpers ---------------------------------------------------------------
const ok = ({ data, error }) => {
  if (error) throw error;
  return data;
};

let activeStore = null;
let allStores = [];
// "single": uma loja por vez, como sempre foi. "consolidated": todas as lojas
// permitidas de uma vez, com filtro opcional por loja.
let scopeMode = localStorage.getItem("nexwash:store-scope") === "consolidated" ? "consolidated" : "single";
let scopeFilter = localStorage.getItem("nexwash:store-filter") || "all";

let writeOverride = null;

// Loja de gravação: todo registro novo pertence a uma loja só.
const storeId = () => {
  if (writeOverride) return writeOverride;
  if (isConsolidated() && scopeFilter !== "all") return scopeFilter;
  if (!activeStore?.id) throw new Error("Selecione uma loja para continuar.");
  return activeStore.id;
};

function isConsolidated() {
  return scopeMode === "consolidated" && allStores.length > 1;
}

// Lojas consultadas nas leituras, já com o filtro aplicado.
function storeIds() {
  if (!isConsolidated()) return [storeId()];
  if (scopeFilter !== "all" && allStores.some((store) => store.id === scopeFilter)) return [scopeFilter];
  const ids = allStores.map((store) => store.id);
  if (!ids.length) throw new Error("Selecione uma loja para continuar.");
  return ids;
}

const scoped = (query) => query.in("store_id", storeIds());
const withStore = (row) => ({ ...row, store_id: storeId() });

// ---- Conta, lojas e permissões ---------------------------------------------
export const access = {
  activeStore: () => activeStore,
  setActiveStore(store) {
    activeStore = store || null;
    if (store?.id) localStorage.setItem("tl_active_store", store.id);
    else localStorage.removeItem("tl_active_store");
  },
  // ---- Escopo: uma loja por vez ou todas consolidadas ----------------------
  knownStores: () => allStores,
  setKnownStores(list) {
    allStores = Array.isArray(list) ? list : [];
    if (scopeFilter !== "all" && !allStores.some((store) => store.id === scopeFilter)) {
      access.setScopeFilter("all");
    }
  },
  isConsolidated,
  scopeMode: () => scopeMode,
  setScopeMode(mode) {
    scopeMode = mode === "consolidated" ? "consolidated" : "single";
    localStorage.setItem("nexwash:store-scope", scopeMode);
  },
  scopeFilter: () => (isConsolidated() ? scopeFilter : "all"),
  setScopeFilter(storeId) {
    scopeFilter = storeId || "all";
    localStorage.setItem("nexwash:store-filter", scopeFilter);
  },
  storeIds,
  writeStoreId: () => storeId(),
  // Fixa a loja de gravação durante uma operação (ex.: salvar um registro na
  // visão consolidada) sem mexer no filtro de leitura das telas.
  async runInStore(id, fn) {
    writeOverride = id || null;
    try {
      return await fn();
    } finally {
      writeOverride = null;
    }
  },
  storeName(id) {
    return allStores.find((store) => store.id === id)?.name || "Loja";
  },
  async stores() {
    const list = await supabase
      .from("stores")
      .select("id,account_id,name,city,state,logo_url")
      .eq("active", true)
      .order("name")
      .then(ok);
    access.setKnownStores(list);
    return list;
  },
  async permissions(store) {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId || !store) return { accountRole: null, storeRole: null, canManageAccount: false };
    const [accountResult, storeResult] = await Promise.all([
      supabase
        .from("account_memberships")
        .select("role")
        .eq("account_id", store.account_id)
        .eq("user_id", userId)
        .eq("active", true)
        .maybeSingle(),
      supabase
        .from("store_memberships")
        .select("role")
        .eq("store_id", store.id)
        .eq("user_id", userId)
        .eq("active", true)
        .maybeSingle(),
    ]);
    if (accountResult.error) throw accountResult.error;
    if (storeResult.error) throw storeResult.error;
    const accountRole = accountResult.data?.role || null;
    return {
      accountRole,
      storeRole: storeResult.data?.role || null,
      canManageAccount: accountRole === "owner" || accountRole === "admin",
    };
  },
  accountUsers: (accountId) =>
    supabase.rpc("list_account_users_with_access", { p_account_id: accountId }).then(ok),
  grantUser: (accountId, email, accountRole, storeIds, storeRole) =>
    supabase
      .rpc("grant_existing_user_access", {
        p_account_id: accountId,
        p_email: email,
        p_account_role: accountRole,
        p_store_ids: storeIds,
        p_store_role: storeRole,
      })
      .then(ok),
  updateUser: (accountId, userId, accountRole, storeAccess) =>
    supabase
      .rpc("update_account_user_access", {
        p_account_id: accountId,
        p_user_id: userId,
        p_account_role: accountRole,
        p_store_access: storeAccess,
      })
      .then(ok),
  createStore: (accountId, name, city, state) =>
    supabase
      .rpc("create_legacy_store_for_account", {
        p_account_id: accountId,
        p_store_name: name,
        p_city: city || null,
        p_state: state || null,
      })
      .then(ok),
  updateStore: (id, row) =>
    supabase.from("stores").update(row).eq("id", id).select().single().then(ok),
};

// ---- Perfil do usuário -----------------------------------------------------
export const perfil = {
  async get() {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return null;
    const estendido = await supabase
      .from("profiles")
      .select("id,full_name,phone,whatsapp,document,birth_date")
      .eq("id", user.id)
      .maybeSingle();
    // Sem a migração nexwash_profile_fields.sql as colunas extras não existem;
    // o cadastro continua funcionando com nome e telefone.
    const extended = !estendido.error;
    const base = extended
      ? estendido
      : await supabase.from("profiles").select("id,full_name,phone").eq("id", user.id).maybeSingle();
    if (base.error) throw base.error;
    const data = base.data;
    return {
      id: user.id,
      email: user.email || "",
      extended,
      full_name: data?.full_name || user.user_metadata?.full_name || "",
      phone: data?.phone || "",
      whatsapp: data?.whatsapp || "",
      document: data?.document || "",
      birth_date: data?.birth_date || "",
    };
  },
  async save({ id, full_name, phone, whatsapp, document, birth_date, email, extended = true }) {
    const row = { id, full_name, phone: phone || null };
    if (extended) {
      row.whatsapp = whatsapp || null;
      row.document = document || null;
      row.birth_date = birth_date || null;
    }
    // upsert cobre usuários migrados do legado que ainda não têm linha em profiles.
    await supabase.from("profiles").upsert(row).then(ok);
    const payload = { data: { full_name } };
    if (email) payload.email = email;
    const { error } = await supabase.auth.updateUser(payload);
    if (error) throw error;
  },
};

// ---- Clientes --------------------------------------------------------------
export const clientes = {
  list: () => scoped(supabase.from("clientes").select("*")).order("nome").then(ok),
  byId: (id) => scoped(supabase.from("clientes").select("*").eq("id", id)).single().then(ok),
  create: (row) => supabase.from("clientes").insert(withStore(row)).select().single().then(ok),
  update: (id, row) => scoped(supabase.from("clientes").update(row).eq("id", id)).select().single().then(ok),
  remove: (id) => scoped(supabase.from("clientes").delete().eq("id", id)).then(ok),
};

// ---- Carros ----------------------------------------------------------------
export const carros = {
  list: () => scoped(supabase.from("carros").select("*, clientes(nome,telefone)")).order("placa").then(ok),
  byCliente: (cid) => scoped(supabase.from("carros").select("*").eq("cliente_id", cid)).then(ok),
  byPlaca: (placa) =>
    supabase
      .from("carros")
      .select("*, clientes(*)")
      .ilike("placa", placa.trim())
      .in("store_id", storeIds())
      .then(ok),
  create: (row) => supabase.from("carros").insert(withStore(row)).select().single().then(ok),
  update: (id, row) => scoped(supabase.from("carros").update(row).eq("id", id)).select().single().then(ok),
  remove: (id) => scoped(supabase.from("carros").delete().eq("id", id)).then(ok),
};

// ---- Parceiros -------------------------------------------------------------
export const parceiros = {
  list: () => scoped(supabase.from("parceiros").select("*")).order("nome").then(ok),
  create: (row) => supabase.from("parceiros").insert(withStore(row)).select().single().then(ok),
  update: (id, row) => scoped(supabase.from("parceiros").update(row).eq("id", id)).select().single().then(ok),
  remove: (id) => scoped(supabase.from("parceiros").delete().eq("id", id)).then(ok),
};

// ---- Funcionários ----------------------------------------------------------
export const funcionarios = {
  list: () => scoped(supabase.from("funcionarios").select("*")).order("nome").then(ok),
  create: (row) => supabase.from("funcionarios").insert(withStore(row)).select().single().then(ok),
  update: (id, row) => scoped(supabase.from("funcionarios").update(row).eq("id", id)).select().single().then(ok),
  remove: (id) => scoped(supabase.from("funcionarios").delete().eq("id", id)).then(ok),
};

// ---- Vales de funcionários -------------------------------------------------
export const vales = {
  byFuncionario: (fid) =>
    scoped(supabase.from("vales").select("*").eq("funcionario_id", fid)).order("data", { ascending: false }).then(ok),
  list: (limit = 500) =>
    scoped(supabase.from("vales").select("*, funcionarios(nome)")).order("data", { ascending: false }).limit(limit).then(ok),
  create: (row) => supabase.from("vales").insert(withStore(row)).select().single().then(ok),
  remove: (id) => scoped(supabase.from("vales").delete().eq("id", id)).then(ok),
};

// ---- Serviços --------------------------------------------------------------
export const servicos = {
  list: () => scoped(supabase.from("servicos").select("*")).order("nome").then(ok),
  create: (row) => supabase.from("servicos").insert(withStore(row)).select().single().then(ok),
  update: (id, row) => scoped(supabase.from("servicos").update(row).eq("id", id)).select().single().then(ok),
  remove: (id) => scoped(supabase.from("servicos").delete().eq("id", id)).then(ok),
};

// ---- Atendimentos (OS) -----------------------------------------------------
export const atendimentos = {
  list: (limit = 300) =>
    supabase
      .from("atendimentos")
      .select("*, clientes(nome,telefone), parceiros(nome)")
      .in("store_id", storeIds())
      .order("data", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit)
      .then(ok),
  byParceiro: (pid) =>
    supabase
      .from("atendimentos")
      .select("*")
      .eq("parceiro_id", pid)
      .in("store_id", storeIds())
      .order("data", { ascending: false })
      .then(ok),
  async create(row) {
    const id = await supabase
      .rpc("create_legacy_atendimento", {
        p_store_id: storeId(),
        p_atendimento: row,
      })
      .then(ok);
    return { ...row, id, store_id: storeId() };
  },
  update: (id, row) => scoped(supabase.from("atendimentos").update(row).eq("id", id)).select().single().then(ok),
  remove: (id) => scoped(supabase.from("atendimentos").delete().eq("id", id)).then(ok),
};

// ---- Agenda de lavagens ---------------------------------------------------
export const agenda = {
  list: (limit = 500) =>
    supabase
      .from("agenda_lavagens")
      .select("*, clientes(nome,telefone), carros(placa,veiculo)")
      .in("store_id", storeIds())
      .order("data", { ascending: true })
      .order("hora", { ascending: true })
      .limit(limit)
      .then(ok),
  create: (row) => supabase.from("agenda_lavagens").insert(withStore(row)).select().single().then(ok),
  update: (id, row) => scoped(supabase.from("agenda_lavagens").update(row).eq("id", id)).select().single().then(ok),
  remove: (id) => scoped(supabase.from("agenda_lavagens").delete().eq("id", id)).then(ok),
};

// ---- Financeiro ------------------------------------------------------------
export const financeiro = {
  list: (limit = 500) =>
    scoped(supabase.from("financeiro").select("*")).order("data", { ascending: false }).limit(limit).then(ok),
  byAtendimento: (id) =>
    scoped(supabase.from("financeiro").select("*").eq("atendimento_id", id).eq("tipo", "ENTRADA")).then(ok),
  create: (row) => supabase.from("financeiro").insert(withStore(row)).select().single().then(ok),
  update: (id, row) => scoped(supabase.from("financeiro").update(row).eq("id", id)).select().single().then(ok),
  remove: (id) => scoped(supabase.from("financeiro").delete().eq("id", id)).then(ok),
  removeByAtendimento: (id) =>
    scoped(supabase.from("financeiro").delete().eq("atendimento_id", id).eq("tipo", "ENTRADA")).then(ok),
};

// ---- Presença --------------------------------------------------------------
export const presenca = {
  byData: (data) =>
    scoped(supabase.from("presenca").select("*, funcionarios(nome)").eq("data", data)).then(ok),
  list: (limit = 200) =>
    supabase
      .from("presenca")
      .select("*, funcionarios(nome)")
      .in("store_id", storeIds())
      .order("data", { ascending: false })
      .limit(limit)
      .then(ok),
  upsert: (row) =>
    supabase.from("presenca").upsert(withStore(row), { onConflict: "data,funcionario_id" }).select().single().then(ok),
};

// ---- Configurações (chave/valor) ------------------------------------------
export const config = {
  async get(chave, fallback = null) {
    const { data, error } = await supabase
      .from("configuracoes")
      .select("valor")
      // Configurações são por loja: vale sempre a loja de gravação, mesmo na
      // visão consolidada.
      .eq("store_id", storeId())
      .eq("chave", chave)
      .maybeSingle();
    if (error) throw error;
    return data ? data.valor : fallback;
  },
  set: (chave, valor) =>
    supabase
      .from("configuracoes")
      .upsert(withStore({ chave, valor: String(valor) }), { onConflict: "store_id,chave" })
      .then(ok),
};

// ---- Views -----------------------------------------------------------------
export const views = {
  ultimaLavagem: () =>
    scoped(supabase.from("v_ultima_lavagem").select("*")).order("dias_sem_lavar", { ascending: false }).then(ok),
  rateio: () => scoped(supabase.from("v_rateio_socios").select("*")).then(ok),
};
