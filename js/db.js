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
  signOut: () => supabase.auth.signOut(),
  onChange: (cb) => supabase?.auth.onAuthStateChange((_e, s) => cb(s)),
};

// ---- Helpers ---------------------------------------------------------------
const ok = ({ data, error }) => {
  if (error) throw error;
  return data;
};

// ---- Clientes --------------------------------------------------------------
export const clientes = {
  list: () => supabase.from("clientes").select("*").order("nome").then(ok),
  byId: (id) => supabase.from("clientes").select("*").eq("id", id).single().then(ok),
  create: (row) => supabase.from("clientes").insert(row).select().single().then(ok),
  update: (id, row) => supabase.from("clientes").update(row).eq("id", id).select().single().then(ok),
  remove: (id) => supabase.from("clientes").delete().eq("id", id).then(ok),
};

// ---- Carros ----------------------------------------------------------------
export const carros = {
  list: () => supabase.from("carros").select("*, clientes(nome,telefone)").order("placa").then(ok),
  byCliente: (cid) => supabase.from("carros").select("*").eq("cliente_id", cid).then(ok),
  byPlaca: (placa) =>
    supabase
      .from("carros")
      .select("*, clientes(*)")
      .ilike("placa", placa.trim())
      .then(ok),
  create: (row) => supabase.from("carros").insert(row).select().single().then(ok),
  update: (id, row) => supabase.from("carros").update(row).eq("id", id).select().single().then(ok),
  remove: (id) => supabase.from("carros").delete().eq("id", id).then(ok),
};

// ---- Parceiros -------------------------------------------------------------
export const parceiros = {
  list: () => supabase.from("parceiros").select("*").order("nome").then(ok),
  create: (row) => supabase.from("parceiros").insert(row).select().single().then(ok),
  update: (id, row) => supabase.from("parceiros").update(row).eq("id", id).select().single().then(ok),
  remove: (id) => supabase.from("parceiros").delete().eq("id", id).then(ok),
};

// ---- Funcionários ----------------------------------------------------------
export const funcionarios = {
  list: () => supabase.from("funcionarios").select("*").order("nome").then(ok),
  create: (row) => supabase.from("funcionarios").insert(row).select().single().then(ok),
  update: (id, row) => supabase.from("funcionarios").update(row).eq("id", id).select().single().then(ok),
  remove: (id) => supabase.from("funcionarios").delete().eq("id", id).then(ok),
};

// ---- Serviços --------------------------------------------------------------
export const servicos = {
  list: () => supabase.from("servicos").select("*").order("nome").then(ok),
  create: (row) => supabase.from("servicos").insert(row).select().single().then(ok),
  update: (id, row) => supabase.from("servicos").update(row).eq("id", id).select().single().then(ok),
  remove: (id) => supabase.from("servicos").delete().eq("id", id).then(ok),
};

// ---- Atendimentos (OS) -----------------------------------------------------
export const atendimentos = {
  list: (limit = 300) =>
    supabase
      .from("atendimentos")
      .select("*, clientes(nome,telefone), parceiros(nome)")
      .order("data", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit)
      .then(ok),
  byParceiro: (pid) =>
    supabase
      .from("atendimentos")
      .select("*")
      .eq("parceiro_id", pid)
      .order("data", { ascending: false })
      .then(ok),
  create: (row) => supabase.from("atendimentos").insert(row).select().single().then(ok),
  update: (id, row) => supabase.from("atendimentos").update(row).eq("id", id).select().single().then(ok),
  remove: (id) => supabase.from("atendimentos").delete().eq("id", id).then(ok),
};

// ---- Financeiro ------------------------------------------------------------
export const financeiro = {
  list: (limit = 500) =>
    supabase.from("financeiro").select("*").order("data", { ascending: false }).limit(limit).then(ok),
  create: (row) => supabase.from("financeiro").insert(row).select().single().then(ok),
  remove: (id) => supabase.from("financeiro").delete().eq("id", id).then(ok),
};

// ---- Presença --------------------------------------------------------------
export const presenca = {
  byData: (data) =>
    supabase.from("presenca").select("*, funcionarios(nome)").eq("data", data).then(ok),
  list: (limit = 200) =>
    supabase
      .from("presenca")
      .select("*, funcionarios(nome)")
      .order("data", { ascending: false })
      .limit(limit)
      .then(ok),
  upsert: (row) =>
    supabase.from("presenca").upsert(row, { onConflict: "data,funcionario_id" }).select().single().then(ok),
};

// ---- Views -----------------------------------------------------------------
export const views = {
  ultimaLavagem: () =>
    supabase.from("v_ultima_lavagem").select("*").order("dias_sem_lavar", { ascending: false }).then(ok),
  rateio: () => supabase.from("v_rateio_socios").select("*").then(ok),
};
