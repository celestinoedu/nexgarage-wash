import { AppShell } from "@/components/AppShell";
import { InventoryTable } from "@/components/InventoryTable";
import { ListPage } from "@/components/ListPage";
import { PartForm } from "@/components/forms";

export default function PartsPage() {
  return (
    <AppShell title="Peças">
      <ListPage title="Peças" placeholder="Buscar peça, código ou fornecedor" form={<PartForm />}>
        <InventoryTable />
      </ListPage>
    </AppShell>
  );
}
