import { financialTransactions } from "@/lib/data";
import { brl, shortDate } from "@/lib/utils";

export function FinanceTable() {
  return (
    <div className="grid gap-3">
      {financialTransactions.map((item) => (
        <article key={item.id} className="rounded-lg border border-line bg-white p-4 shadow-soft">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <strong className="text-base font-black">{item.description}</strong>
              <p className="text-sm text-slate-500">{item.category} · vence {shortDate(item.dueDate)}</p>
            </div>
            <div className="text-right">
              <span className={item.type === "receita" ? "font-black text-emerald-700" : "font-black text-rose-700"}>{brl(item.value)}</span>
              <p className="text-xs font-bold uppercase text-slate-500">{item.status}</p>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
