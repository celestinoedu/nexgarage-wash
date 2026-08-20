// Central de relatórios em Excel (.xlsx).
import * as db from "./db.js?v=1.8";
import { $, $$, today, toast } from "./ui.js?v=1.8";

const XLSX_URL = "https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs";
const MOEDA = 'R$ #,##0.00';

const REPORTS = [
  ["atendimentos", "🧾", "Atendimentos", "Ordens de serviço, clientes, veículos, descontos e pagamentos."],
  ["clientes", "👤", "Clientes e veículos", "Cadastro dos clientes com todos os carros vinculados."],
  ["parceiros", "🤝", "Parceiros e pendências", "Resumo por parceiro e detalhamento dos serviços a cobrar."],
  ["agenda", "📅", "Agenda de lavagens", "Agendamentos, horários, carros, serviços e situação."],
  ["presenca", "📋", "Presença", "Histórico completo de presença e faltas dos colaboradores."],
  ["financeiro", "💰", "Movimentação financeira", "Entradas e saídas com forma de pagamento e origem."],
  ["fechamentos", "📚", "Fechamentos diários", "Carros, faturamento, recebimentos, saídas e saldo por dia."],
  ["divisao", "👥", "Divisão dos sócios", "Memória de cálculo por serviço para empresa, Rennan e Yuri."],
  ["cadastros", "🗂️", "Cadastros operacionais", "Serviços disponíveis e colaboradores cadastrados."],
];

const valor = (n) => Number(n || 0);
const dataISO = (d) => String(d || "").slice(0, 10);
const regra = (base) => base ? "Base antiga — Rennan 40% / Yuri 60%" : "Base nova — 50% / 50%";

async function carregarDados() {
  const [atendimentos, clientes, carros, parceiros, funcionarios, servicos, financeiro, presenca, agenda, empresaPct] = await Promise.all([
    db.atendimentos.list(5000), db.clientes.list(), db.carros.list(), db.parceiros.list(),
    db.funcionarios.list(), db.servicos.list(), db.financeiro.list(5000), db.presenca.list(5000),
    db.agenda.list(5000), db.config.get("empresa_pct", "0"),
  ]);
  return { atendimentos, clientes, carros, parceiros, funcionarios, servicos, financeiro, presenca, agenda, empresaPct: valor(empresaPct) };
}

function montarRelatorios(d) {
  const atsMap = Object.fromEntries(d.atendimentos.map((a) => [a.id, a]));
  const carrosCli = {};
  d.carros.forEach((c) => (carrosCli[c.cliente_id] ||= []).push(c));

  const atendimentos = d.atendimentos.map((a) => ({
    Data: dataISO(a.data), OS: a.os_numero || "", Tipo: a.tipo || "",
    "Cliente / Parceiro": a.tipo === "PARCEIRO" ? a.parceiros?.nome || "" : a.clientes?.nome || "",
    Veículo: a.veiculo || "", Placa: a.placa || "", Serviços: a.servicos || "",
    "Valor bruto": valor(a.valor) + valor(a.desconto), Desconto: valor(a.desconto), "Valor líquido": valor(a.valor),
    Pagamento: a.forma_pgto || "", Status: a.status_pg || "", "Data pagamento": dataISO(a.data_pg),
    Divisão: regra(a.base_antiga), Observações: a.observacoes || "",
  }));

  const clientes = d.clientes.flatMap((c) => {
    const cars = carrosCli[c.id] || [null];
    return cars.map((car) => ({
      Cliente: c.nome || "", Telefone: c.telefone || "", Origem: c.origem || "PARTICULAR",
      Base: c.base_antiga ? "Antiga" : "Nova", Veículo: car?.veiculo || "", Placa: car?.placa || "",
      Observações: c.observacoes || "",
    }));
  });

  const resumoParceiros = d.parceiros.map((p) => {
    const ats = d.atendimentos.filter((a) => a.parceiro_id === p.id);
    const pend = ats.filter((a) => a.status_pg === "PENDENTE");
    return { Parceiro: p.nome, Telefone: p.telefone || "", Base: p.base_antiga ? "Antiga" : "Nova",
      "Qtd. serviços": ats.length, "Total serviços": ats.reduce((s, a) => s + valor(a.valor), 0),
      "Qtd. pendente": pend.length, "Total a cobrar": pend.reduce((s, a) => s + valor(a.valor), 0) };
  });
  const pendenciasParceiros = d.atendimentos.filter((a) => a.tipo === "PARCEIRO" && a.status_pg === "PENDENTE").map((a) => ({
    Data: dataISO(a.data), Parceiro: a.parceiros?.nome || "", Veículo: a.veiculo || "", Placa: a.placa || "",
    Serviços: a.servicos || "", "Valor a cobrar": valor(a.valor), OS: a.os_numero || "",
  }));

  const agenda = d.agenda.map((a) => ({ Data: dataISO(a.data), Hora: a.hora?.slice(0, 5) || "",
    Cliente: a.clientes?.nome || "", Telefone: a.clientes?.telefone || "", Veículo: a.carros?.veiculo || "",
    Placa: a.carros?.placa || "", Serviços: a.servicos || "", Status: a.status || "", Observações: a.observacoes || "" }));

  const presenca = d.presenca.map((p) => ({ Data: dataISO(p.data), Colaborador: p.funcionarios?.nome || "",
    Status: p.status || "", Hora: p.hora?.slice(0, 5) || "" }));

  const financeiro = d.financeiro.map((l) => ({ Data: dataISO(l.data), Tipo: l.tipo || "", Descrição: l.descricao || "",
    Valor: valor(l.valor), "Forma de pagamento": l.forma_pgto || "", Divisão: l.tipo === "ENTRADA" ? regra(l.base_antiga) : "",
    "Vinculado a atendimento": l.atendimento_id ? "Sim" : "Não", Observações: l.observacoes || "" }));

  const dias = {};
  const getDia = (data) => (dias[dataISO(data)] ||= { carros: 0, faturado: 0, recebido: 0, saidas: 0 });
  d.atendimentos.forEach((a) => { const x = getDia(a.data); x.carros++; x.faturado += valor(a.valor); });
  d.financeiro.forEach((l) => { const x = getDia(l.data); l.tipo === "ENTRADA" ? x.recebido += valor(l.valor) : x.saidas += valor(l.valor); });
  const fechamentos = Object.entries(dias).sort(([a], [b]) => b.localeCompare(a)).map(([data, x]) => ({
    Data: data, Carros: x.carros, Faturado: x.faturado, Recebido: x.recebido, Saídas: x.saidas, "Saldo do dia": x.recebido - x.saidas,
  }));

  const pct = d.empresaPct / 100;
  const divisao = d.financeiro.filter((l) => l.tipo === "ENTRADA" && l.atendimento_id).map((l) => {
    const a = atsMap[l.atendimento_id] || {}, recebido = valor(l.valor), distribuivel = recebido * (1 - pct);
    return { Data: dataISO(l.data), OS: a.os_numero || "", "Cliente / Parceiro": a.tipo === "PARCEIRO" ? a.parceiros?.nome || "" : a.clientes?.nome || "",
      Serviços: a.servicos || l.descricao || "", Regra: regra(l.base_antiga), Recebido: recebido,
      [`Empresa (${d.empresaPct}%)`]: recebido * pct, Rennan: distribuivel * (l.base_antiga ? .4 : .5), Yuri: distribuivel * (l.base_antiga ? .6 : .5) };
  });

  const servicos = d.servicos.map((s) => ({ Serviço: s.nome || "", "Preço base": valor(s.preco_base), Status: s.ativo !== false ? "Ativo" : "Inativo" }));
  const funcionarios = d.funcionarios.map((f) => ({ Colaborador: f.nome || "", Telefone: f.telefone || "", Status: f.ativo !== false ? "Ativo" : "Inativo" }));

  return {
    atendimentos: [["Atendimentos", atendimentos]], clientes: [["Clientes e Carros", clientes]],
    parceiros: [["Resumo Parceiros", resumoParceiros], ["Pendências Parceiros", pendenciasParceiros]],
    agenda: [["Agenda", agenda]], presenca: [["Presença", presenca]], financeiro: [["Financeiro", financeiro]],
    fechamentos: [["Fechamentos", fechamentos]], divisao: [["Divisão Sócios", divisao]],
    cadastros: [["Serviços", servicos], ["Colaboradores", funcionarios]],
  };
}

function criarPlanilha(XLSX, titulo, linhas) {
  const headers = linhas.length ? Object.keys(linhas[0]) : ["Sem dados"];
  const dados = linhas.length ? linhas.map((r) => headers.map((h) => r[h] ?? "")) : [["Nenhum registro encontrado"]];
  const ws = XLSX.utils.aoa_to_sheet([[`TOP LINE HIGIENIZAÇÕES — ${titulo}`], [`Gerado em ${new Date().toLocaleString("pt-BR")}`], [], headers, ...dados]);
  ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: Math.max(0, headers.length - 1) } }];
  ws["!autofilter"] = { ref: XLSX.utils.encode_range({ r: 3, c: 0 }, { r: 3 + dados.length, c: headers.length - 1 }) };
  ws["!cols"] = headers.map((h, i) => ({ wch: Math.min(50, Math.max(String(h).length + 3, ...dados.map((r) => String(r[i] ?? "").length + 2))) }));
  headers.forEach((h, c) => {
    const head = ws[XLSX.utils.encode_cell({ r: 3, c })];
    if (head) head.s = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "2F7CFF" } }, alignment: { horizontal: "center" } };
    if (/valor|preço|total|faturado|recebido|saída|saldo|empresa|rennan|yuri|desconto/i.test(h)) {
      for (let r = 4; r < 4 + dados.length; r++) { const cell = ws[XLSX.utils.encode_cell({ r, c })]; if (cell?.t === "n") cell.z = MOEDA; }
    }
  });
  const title = ws.A1; if (title) title.s = { font: { bold: true, sz: 16, color: { rgb: "17365D" } } };
  return ws;
}

async function baixar(tipo, button) {
  const original = button.innerHTML;
  button.disabled = true; button.textContent = "Preparando…";
  try {
    const [XLSX, dados] = await Promise.all([import(XLSX_URL), carregarDados()]);
    const grupos = montarRelatorios(dados);
    const selecionados = tipo === "completo" ? Object.values(grupos).flat() : grupos[tipo];
    const wb = XLSX.utils.book_new();
    selecionados.forEach(([nome, linhas]) => XLSX.utils.book_append_sheet(wb, criarPlanilha(XLSX, nome, linhas), nome.slice(0, 31)));
    XLSX.writeFile(wb, `Top-Line-${tipo}-${today()}.xlsx`, { compression: true, cellStyles: true });
    toast("Relatório Excel gerado.");
  } catch (err) {
    console.error(err); toast("Não foi possível gerar o Excel: " + (err.message || err), "err");
  } finally { button.disabled = false; button.innerHTML = original; }
}

export async function renderRelatorios() {
  $("#view").innerHTML = `
    <div class="report-hero card">
      <div><h2>Central de Relatórios</h2><p class="muted">Exporte dados organizados e prontos para abrir no Excel.</p></div>
      <button class="btn primary" data-report="completo">📦 Baixar relatório completo</button>
    </div>
    <div class="cards-grid report-grid">${REPORTS.map(([id, icon, nome, desc]) => `<article class="card report-card">
      <span class="report-icon">${icon}</span><div><h3>${nome}</h3><p class="muted small">${desc}</p></div>
      <button class="btn block" data-report="${id}">Baixar Excel</button>
    </article>`).join("")}</div>`;
  $$('[data-report]').forEach((b) => b.onclick = () => baixar(b.dataset.report, b));
}
