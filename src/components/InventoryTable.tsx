import { parts, suppliers } from "@/lib/data";
import { brl } from "@/lib/utils";

export function InventoryTable() {
  return (
    <div className="grid gap-3">
      {parts.map((part) => {
        const low = part.stockQty <= part.minStock;
        const supplier = suppliers.find((item) => item.id === part.supplierId);
        return (
          <article key={part.id} className={`rounded-lg border bg-white p-4 shadow-soft ${low ? "border-rose-300" : "border-line"}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <strong className="text-lg font-black">{part.name}</strong>
                <p className="text-sm text-slate-500">{part.code} · {part.category} · {supplier?.name}</p>
              </div>
              <span className={`rounded-md px-3 py-1 text-sm font-black ${low ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>{part.stockQty} un.</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
              <span><b>Mínimo:</b> {part.minStock}</span>
              <span><b>Custo:</b> {brl(part.unitCost)}</span>
              <span><b>Venda:</b> {brl(part.salePrice)}</span>
              <span><b>Local:</b> {part.location}</span>
            </div>
          </article>
        );
      })}
    </div>
  );
}
