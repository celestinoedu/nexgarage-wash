import { AppShell } from "@/components/AppShell";
import { MechanicPerformanceChart } from "@/components/MechanicPerformanceChart";
import { StockAlertCard } from "@/components/StockAlertCard";
import { FinancialDashboard } from "@/components/FinancialDashboard";
import { parts, serviceOrders, services } from "@/lib/data";

export default function ReportsPage() {
  const mostUsed = parts.slice(0, 8).map((part, index) => ({ part, uses: 18 - index }));
  return (
    <AppShell title="Relatórios">
      <div className="grid gap-4">
        <FinancialDashboard />
        <MechanicPerformanceChart />
        <div className="grid gap-4 xl:grid-cols-2">
          <section className="rounded-lg border border-line bg-white p-4 shadow-soft">
            <h2 className="text-lg font-black">Peças mais utilizadas</h2>
            <div className="mt-3 grid gap-2">
              {mostUsed.map(({ part, uses }) => <p key={part.id} className="flex justify-between rounded-md bg-slate-50 p-3"><span>{part.name}</span><b>{uses} usos</b></p>)}
            </div>
          </section>
          <section className="rounded-lg border border-line bg-white p-4 shadow-soft">
            <h2 className="text-lg font-black">Serviços concluídos</h2>
            <div className="mt-3 grid gap-2">
              {services.map((service, index) => <p key={service.id} className="flex justify-between rounded-md bg-slate-50 p-3"><span>{service.name}</span><b>{serviceOrders.filter((order) => order.serviceIds.includes(service.id)).length + index}</b></p>)}
            </div>
          </section>
        </div>
        <StockAlertCard />
      </div>
    </AppShell>
  );
}
