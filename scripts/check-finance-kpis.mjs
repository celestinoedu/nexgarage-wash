import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import ts from "typescript";
import { allPages } from "../js/pagination.mjs";

const source = await readFile(resolve("src/lib/finance-metrics.ts"), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { financeMetrics, paymentDate } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

const rows = Array.from({ length: 1202 }, (_, index) => ({
  id: `f${String(index).padStart(4, "0")}`,
  store_id: index % 2 ? "loja-b" : "loja-a",
  kind: "income",
  amount: 1,
  due_date: "2026-09-20",
  paid_at: "2026-09-20T15:00:00Z",
}));
let calls = 0;
const loaded = await allPages(() => ({
  range: async (from, to) => {
    calls += 1;
    return { data: rows.slice(from, to + 1), error: null };
  },
}));
assert.equal(loaded.length, 1202);
assert.equal(calls, 3);
assert.equal(financeMetrics(loaded, { start: "2026-09-15", end: "2026-10-14" }, "2026-10-03").revenue, 1202);
assert.equal(financeMetrics(loaded.filter((row) => row.store_id === "loja-a"), { start: "2026-09-15", end: "2026-10-14" }, "2026-10-03").revenue, 601);
assert.equal(financeMetrics(loaded.filter((row) => row.store_id === "loja-b"), { start: "2026-09-15", end: "2026-10-14" }, "2026-10-03").revenue, 601);

const period = { start: "2026-09-15", end: "2026-10-14" };
const exceptional = [
  { kind: "income", amount: 120, due_date: "2026-09-10", paid_at: "2026-09-16T01:00:00Z" },
  { kind: "expense", amount: 35, due_date: "2026-09-10", paid_at: "2026-09-16T15:00:00Z" },
  { kind: "income", amount: 80, due_date: "2026-09-18", paid_at: null },
  { kind: "expense", amount: 50, due_date: "2026-09-17", paid_at: null },
  { kind: "income", amount: 60, due_date: "2026-09-16", paid_at: "2026-10-16T15:00:00Z" },
];
const totals = financeMetrics(exceptional, period, "2026-10-03");
assert.deepEqual([totals.revenue, totals.expenses, totals.balance, totals.pending, totals.overdue, totals.movements.length], [120, 35, 85, 80, 80, 4]);
assert.equal(paymentDate("2026-09-15T01:00:00Z"), "2026-09-14");
assert.equal(paymentDate("2026-09-15T00:00:00Z", "2026-09-15"), "2026-09-15");
await assert.rejects(allPages(() => ({ range: async () => ({ data: null, error: new Error("falha na consulta") }) })), /falha na consulta/);
console.log("KPIs financeiros: paginação multiloja, datas, saldos e pendências conferidos.");
