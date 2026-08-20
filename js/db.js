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
const storeId = () => {
  if (!activeStore?.id) throw new Error("Selecione uma loja para continuar.");
  return activeStore.id;
};
const scoped = (query) => query.eq("store_id", storeId());
const withStore = (row) => ({ ...row, store_id: storeId() });

// ---- Conta, lojas e permissões ---------------------------------------------
export const access = {
  activeStore: () => activeStore,
  setActiveStore(store) {
    activeStore = store || null;
    if (store?.id) localStorage.setItem("tl_active_store", store.id);
    else localStorage.removeItem("tl_active_store");
  },
  async stores() {
    return supabase
      .from("stores")
      .select("id,account_id,name,city,state,logo_url")
      .eq("active", true)
      .order("name")
      .then(ok);
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
      .eq("store_id", storeId())
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
      .eq("store_id", storeId())
      .order("data", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit)
      .then(ok),
  byParceiro: (pid) =>
    supabase
      .from("atendimentos")
      .select("*")
      .eq("parceiro_id", pid)
      .eq("store_id", storeId())
      .order("data", { ascending: false })
      .then(ok),
  create: (row) => supabase.from("atendimentos").insert(withStore(row)).select().single().then(ok),
  update: (id, row) => scoped(supabase.from("atendimentos").update(row).eq("id", id)).select().single().then(ok),
  remove: (id) => scoped(supabase.from("atendimentos").delete().eq("id", id)).then(ok),
};

// ---- Agenda de lavagens ---------------------------------------------------
export const agenda = {
  list: (limit = 500) =>
    supabase
      .from("agenda_lavagens")
      .select("*, clientes(nome,telefone), carros(placa,veiculo)")
      .eq("store_id", storeId())
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
      .eq("store_id", storeId())
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
