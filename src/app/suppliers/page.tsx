import { AppShell } from "@/components/AppShell";
import { ListPage } from "@/components/ListPage";
import { SupplierForm } from "@/components/forms";
import { parts, suppliers } from "@/lib/data";

export default function SuppliersPage() {
  return (
    <AppShell title="Fornecedores">
      <ListPage title="Fornecedores" placeholder="Buscar fornecedor ou categoria" form={<SupplierForm />}>
        <div className="grid gap-3 md:grid-cols-2">
          {suppliers.map((supplier) => (
            <article key={supplier.id} className="rounded-lg border border-line bg-white p-4 shadow-soft">
              <strong className="text-lg font-black">{supplier.name}</strong>
              <p className="text-sm text-slate-500">{supplier.category} · {supplier.contact} · {supplier.whatsapp}</p>
              <p className="mt-3 text-sm font-bold text-lotus">{parts.filter((part) => part.supplierId === supplier.id).length} peças vinculadas</p>
            </article>
          ))}
        </div>
      </ListPage>
    </AppShell>
  );
}
