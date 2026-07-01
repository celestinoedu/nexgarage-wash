import { AppShell } from "@/components/AppShell";
import { InventoryTable } from "@/components/InventoryTable";
import { StockAlertCard } from "@/components/StockAlertCard";
import { inventoryMovements, parts } from "@/lib/data";

export default function InventoryPage() {
  return (
    <AppShell title="Estoque">
      <StockAlertCard />
      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_380px]">
        <InventoryTable />
        <aside className="rounded-lg border border-line bg-white p-4 shadow-soft">
          <h2 className="text-lg font-black">Movimentações</h2>
          <div className="mt-3 grid gap-2">
            {inventoryMovements.map((movement) => (
              <div key={movement.id} className="rounded-md bg-slate-50 p-3 text-sm">
                <b>{movement.type === "entrada" ? "Entrada" : "Saída"} de {movement.quantity}</b>
                <p className="text-slate-500">{parts.find((part) => part.id === movement.partId)?.name} · {movement.reason}</p>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
