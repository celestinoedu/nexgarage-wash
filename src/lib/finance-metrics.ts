export type FinancePeriod = { start: string; end: string };

export type LegacyFinanceRow = {
  id: string; store_id: string; tipo: "ENTRADA" | "SAIDA"; valor: number;
  data: string; descricao: string | null; forma_pgto: string | null;
};

export type ModernFinanceRow = {
  id: string; store_id: string; kind: "income" | "expense"; amount: number;
  due_date: string; paid_at: string | null; order_id: string | null;
  description: string; category: string; payment_method: string | null;
};

export type LegacyAttendanceRow = {
  id: string; store_id: string; status_pg: string; valor: number;
};

export type FinanceMovement = {
  id: string; store_id: string; kind: "income" | "expense"; amount: number;
  date: string; description: string; category: string; payment_method: string | null;
};

const businessDateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
});
const cents = (value: number) => Math.round((Number(value) || 0) * 100);

// paid_at é timestamptz; a data financeira é o dia civil da operação no Brasil.
export function paymentDate(paidAt: string | null, dueDate?: string): string | null {
  if (!paidAt) return null;
  const date = new Date(paidAt);
  if (Number.isNaN(date.getTime())) return null;
  // A migração legada gravou a data civil como meia-noite UTC.
  if (dueDate && date.toISOString().endsWith("T00:00:00.000Z") && date.toISOString().slice(0, 10) === dueDate)
    return dueDate;
  const parts = Object.fromEntries(businessDateFormatter.formatToParts(date).map(({ type, value }) => [type, value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

// A tabela nova contém parte do legado com os mesmos IDs. O lançamento legado
// prevalece porque é a fonte usada na operação atual; IDs novos são incluídos.
export function unifyFinanceRows(
  legacy: LegacyFinanceRow[], modern: ModernFinanceRow[], attendances: LegacyAttendanceRow[],
) {
  const legacyIds = new Set(legacy.map((row) => row.id));
  const attendanceIds = new Set(attendances.map((row) => row.id));
  const movements: FinanceMovement[] = legacy.map((row) => ({
    id: row.id, store_id: row.store_id, kind: row.tipo === "ENTRADA" ? "income" : "expense",
    amount: Number(row.valor) || 0, date: row.data.slice(0, 10),
    description: row.descricao || (row.tipo === "ENTRADA" ? "Entrada" : "Saída"),
    category: row.tipo === "ENTRADA" ? "Entrada" : "Saída",
    payment_method: row.forma_pgto,
  }));

  let pendingCents = 0;
  let pendingCount = 0;
  for (const row of attendances) {
    if (row.status_pg !== "PENDENTE") continue;
    pendingCents += cents(row.valor);
    pendingCount += 1;
  }
  for (const row of modern) {
    if (legacyIds.has(row.id)) continue;
    const date = paymentDate(row.paid_at, row.due_date);
    if (date) {
      movements.push({
        id: row.id, store_id: row.store_id, kind: row.kind,
        amount: Number(row.amount) || 0, date,
        description: row.description, category: row.category,
        payment_method: row.payment_method,
      });
    } else if (row.kind === "income" && (!row.order_id || !attendanceIds.has(row.order_id))) {
      pendingCents += cents(row.amount);
      pendingCount += 1;
    }
  }
  movements.sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  const totalIncome = movements.filter((row) => row.kind === "income").reduce((sum, row) => sum + cents(row.amount), 0);
  const totalExpense = movements.filter((row) => row.kind === "expense").reduce((sum, row) => sum + cents(row.amount), 0);
  return { movements, cash: (totalIncome - totalExpense) / 100, pending: pendingCents / 100, pendingCount };
}

export function financeMetrics(ledger: ReturnType<typeof unifyFinanceRows>, period: FinancePeriod) {
  const movements = ledger.movements.filter((row) => row.date >= period.start && row.date <= period.end);
  const revenue = movements.filter((row) => row.kind === "income").reduce((sum, row) => sum + cents(row.amount), 0) / 100;
  const expenses = movements.filter((row) => row.kind === "expense").reduce((sum, row) => sum + cents(row.amount), 0) / 100;
  return { revenue, expenses, cash: ledger.cash, pending: ledger.pending, pendingCount: ledger.pendingCount, movements };
}
