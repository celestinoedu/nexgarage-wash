import { AppShell } from "@/components/AppShell";
import { TechnicalReportForm } from "@/components/forms";
import { cars, customers, mechanics, technicalReports } from "@/lib/data";
import { shortDate } from "@/lib/utils";

export default function TechnicalReportsPage() {
  return (
    <AppShell title="Laudos técnicos">
      <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
        <section className="grid gap-3">
          {technicalReports.map((report) => {
            const car = cars.find((item) => item.id === report.carId);
            const customer = customers.find((item) => item.id === car?.customerId);
            const mechanic = mechanics.find((item) => item.id === report.mechanicId);
            return (
              <article key={report.id} className="rounded-lg border border-line bg-white p-4 shadow-soft">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <strong className="text-lg font-black">{car?.plate} · {customer?.name}</strong>
                    <p className="text-sm text-slate-500">{mechanic?.name} · {shortDate(report.date)}</p>
                  </div>
                  <button className="min-h-10 rounded-md border border-line px-3 text-sm font-black">Imprimir</button>
                </div>
                <p className="mt-3 text-sm text-slate-600">{report.diagnosis}</p>
                <p className="mt-2 text-sm font-semibold text-slate-700">{report.conclusion}</p>
              </article>
            );
          })}
        </section>
        <TechnicalReportForm />
      </div>
    </AppShell>
  );
}
