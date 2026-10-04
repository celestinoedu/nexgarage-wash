export type FinanceRow = {
  kind: "income" | "expense";
  amount: number;
  due_date: string;
  paid_at: string | null;
};

export type FinancePeriod = { start: string; end: string };

const businessDateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
});

// paid_at é timestamptz; o dia financeiro é o dia civil da operação no Brasil.
export function paymentDate(paidAt: string | null, dueDate?: string): string | null {
  if (!paidAt) return null;
  const date = new Date(paidAt);
  if (Number.isNaN(date.getTime())) return null;
  // A migração legada gravou a data civil do lançamento como meia-noite UTC.
  // Nesse caso, preservar o dia original evita deslocá-lo para a véspera.
  if (dueDate && date.toISOString().endsWith("T00:00:00.000Z") && date.toISOString().slice(0, 10) === dueDate)
    return dueDate;
  const parts = Object.fromEntries(businessDateFormatter.formatToParts(date).map(({ type, value }) => [type, value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function inFinancePeriod(date: string | null, period: FinancePeriod): boolean {
  return !!date && date >= period.start && date <= period.end;
}

export function financeMetrics<T extends FinanceRow>(rows: T[], period: FinancePeriod, today: string) {
  let revenue = 0;
  let expenses = 0;
  let pending = 0;
  let overdue = 0;
  const movements: T[] = [];

  for (const row of rows) {
    const paidDate = paymentDate(row.paid_at, row.due_date);
    const paidInPeriod = inFinancePeriod(paidDate, period);
    const dueInPeriod = inFinancePeriod(row.due_date, period);
    const amount = Number(row.amount) || 0;

    if (paidInPeriod) {
      if (row.kind === "income") revenue += amount;
      else expenses += amount;
    } else if (!row.paid_at && dueInPeriod && row.kind === "income") {
      pending += amount;
      if (row.due_date < today) overdue += amount;
    }

    // Inclui pagamentos do ciclo e títulos em aberto com vencimento no ciclo.
    if (paidInPeriod || (!row.paid_at && dueInPeriod)) movements.push(row);
  }

  return { revenue, expenses, balance: revenue - expenses, pending, overdue, movements };
}
