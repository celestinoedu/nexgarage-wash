import { AlertTriangle } from "lucide-react";
import { parts } from "@/lib/data";

export function StockAlertCard() {
  const lowParts = parts.filter((part) => part.stockQty <= part.minStock);
  return (
    <article className="rounded-lg border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-center gap-2">
        <AlertTriangle size={20} className="text-amber-700" />
        <strong className="font-black text-amber-900">Reposição necessária</strong>
      </div>
      <p className="mt-2 text-sm font-semibold text-amber-800">{lowParts.length} peças estão no estoque mínimo ou abaixo.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {lowParts.slice(0, 8).map((part) => <span key={part.id} className="rounded-md bg-white px-2 py-1 text-xs font-bold text-amber-900">{part.name}</span>)}
      </div>
    </article>
  );
}
