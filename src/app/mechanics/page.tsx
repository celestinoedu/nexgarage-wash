import { AppShell } from "@/components/AppShell";
import { MechanicDemandPanel } from "@/components/MechanicDemandPanel";
import { MechanicPerformanceChart } from "@/components/MechanicPerformanceChart";
import { ListPage } from "@/components/ListPage";
import { MechanicForm } from "@/components/forms";
import { mechanics, serviceOrders } from "@/lib/data";

export default function MechanicsPage() {
  return (
    <AppShell title="Mecânicos">
      <div className="mb-4"><MechanicDemandPanel /></div>
      <ListPage title="Mecânicos" placeholder="Buscar mecânico ou especialidade" form={<MechanicForm />}>
        <div className="grid gap-3 md:grid-cols-2">
          {mechanics.map((mechanic) => (
            <article key={mechanic.id} className="rounded-lg border border-line bg-white p-4 shadow-soft">
              <strong className="text-lg font-black">{mechanic.name}</strong>
              <p className="text-sm text-slate-500">{mechanic.specialty} · {mechanic.phone}</p>
              <p className="mt-3 text-sm font-bold text-lotus">{serviceOrders.filter((order) => order.mechanicId === mechanic.id).length} OS atribuídas</p>
            </article>
          ))}
        </div>
      </ListPage>
      <div className="mt-4"><MechanicPerformanceChart /></div>
    </AppShell>
  );
}
