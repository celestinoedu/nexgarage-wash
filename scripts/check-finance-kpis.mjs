import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import ts from "typescript";
import { allPages } from "../js/pagination.mjs";
import { calcRateio, calcRateioPorLoja, splitEntrada } from "../js/rateio.mjs";

const source = await readFile(resolve("src/lib/finance-metrics.ts"), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { financeMetrics, paymentDate, unifyFinanceRows } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

const legacy = Array.from({ length: 1202 }, (_, index) => ({
  id: `f${String(index).padStart(4, "0")}`,
  store_id: index % 2 ? "loja-b" : "loja-a",
  tipo: "ENTRADA", valor: 1, data: "2026-09-20", descricao: "Serviço", forma_pgto: "PIX",
}));
legacy.push({ id: "despesa-antiga", store_id: "loja-a", tipo: "SAIDA", valor: 30, data: "2026-08-20", descricao: "Insumos", forma_pgto: "PIX" });
let calls = 0;
const loaded = await allPages(() => ({
  range: async (from, to) => {
    calls += 1;
    return { data: legacy.slice(from, to + 1), error: null };
  },
}));
assert.equal(loaded.length, 1203);
assert.equal(calls, 3);

const modern = legacy.slice(0, 658).map((row) => ({
  id: row.id, store_id: row.store_id, kind: "income", amount: 1,
  due_date: row.data, paid_at: null, order_id: null,
  description: row.descricao, category: "Serviço", payment_method: "PIX",
}));
modern.push(
  { id: "nova-receita", store_id: "loja-b", kind: "income", amount: 120, due_date: "2026-09-10", paid_at: "2026-09-16T15:00:00Z", order_id: null, description: "Receita", category: "Serviço", payment_method: "PIX" },
  { id: "nova-despesa", store_id: "loja-a", kind: "expense", amount: 35, due_date: "2026-09-10", paid_at: "2026-09-16T15:00:00Z", order_id: null, description: "Despesa", category: "Insumos", payment_method: "PIX" },
  { id: "nova-pendencia", store_id: "loja-b", kind: "income", amount: 80, due_date: "2026-09-18", paid_at: null, order_id: null, description: "Pendente", category: "Serviço", payment_method: null },
  { id: "pendencia-espelhada", store_id: "loja-a", kind: "income", amount: 60, due_date: "2026-09-18", paid_at: null, order_id: "at-1", description: "Pendente", category: "Serviço", payment_method: null },
);
const attendances = [
  { id: "at-1", store_id: "loja-a", status_pg: "PENDENTE", valor: 60 },
  { id: "at-2", store_id: "loja-b", status_pg: "PENDENTE", valor: 100 },
];
const ledger = unifyFinanceRows(loaded, modern, attendances);
const totals = financeMetrics(ledger, { start: "2026-09-15", end: "2026-10-14" });
assert.deepEqual([totals.revenue, totals.expenses, totals.cash, totals.pending, totals.pendingCount, totals.movements.length], [1322, 35, 1257, 240, 3, 1204]);
assert.equal(ledger.movements.filter((row) => row.store_id === "loja-a" && row.kind === "income").length, 601);
assert.equal(ledger.movements.filter((row) => row.store_id === "loja-b" && row.kind === "income").length, 602);
assert.equal(paymentDate("2026-09-15T01:00:00Z"), "2026-09-14");
assert.equal(paymentDate("2026-09-15T00:00:00Z", "2026-09-15"), "2026-09-15");
const entradas = [
  { store_id: "loja-a", valor: 1000, base_antiga: true },
  { store_id: "loja-b", valor: 1000, base_antiga: false },
];
const saidas = [
  { store_id: "loja-a", valor: 900 },
  { store_id: "loja-b", valor: 100 },
];
const rateio = calcRateioPorLoja(entradas, saidas, { "loja-a": 0, "loja-b": 0 });
assert.deepEqual([rateio.rennan, rateio.yuri, rateio.liquido, rateio.saidasRennan, rateio.saidasYuri], [490, 510, 1000, 410, 590]);
assert.equal(rateio.rennan, calcRateio([entradas[0]], 900, 0).rennan + calcRateio([entradas[1]], 100, 0).rennan);
const comEmpresa = calcRateioPorLoja(entradas, saidas, { "loja-a": 0.1, "loja-b": 0 });
assert.deepEqual([comEmpresa.empresa, comEmpresa.rennan, comEmpresa.yuri], [100, 450, 450]);
assert.equal(splitEntrada({ valor: 0.01, base_antiga: false }).rennan + splitEntrada({ valor: 0.01, base_antiga: false }).yuri, 0.01);
await assert.rejects(allPages(() => ({ range: async () => ({ data: null, error: new Error("falha na consulta") }) })), /falha na consulta/);
console.log("KPIs financeiros: paginação, duas lojas, espelhos, pendências e rateio por loja conferidos.");
