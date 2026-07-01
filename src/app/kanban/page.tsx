import { AppShell } from "@/components/AppShell";
import { KanbanBoard } from "@/components/KanbanBoard";
import { cars, customers, mechanics, serviceOrders } from "@/lib/data";

export default function KanbanPage() {
  return (
    <AppShell title="Kanban de ordens">
      <KanbanBoard orders={serviceOrders} customers={customers} cars={cars} mechanics={mechanics} />
    </AppShell>
  );
}
