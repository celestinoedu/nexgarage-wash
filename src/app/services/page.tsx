import { AppShell } from "@/components/AppShell";
import { ListPage } from "@/components/ListPage";
import { ServiceForm } from "@/components/forms";
import { services } from "@/lib/data";
import { brl } from "@/lib/utils";

export default function ServicesPage() {
  return (
    <AppShell title="Serviços">
      <ListPage title="Serviços" placeholder="Buscar serviço ou categoria" form={<ServiceForm />}>
        <div className="grid gap-3 md:grid-cols-2">
          {services.map((service) => (
            <article key={service.id} className="rounded-lg border border-line bg-white p-4 shadow-soft">
              <strong className="text-lg font-black">{service.name}</strong>
              <p className="text-sm text-slate-500">{service.category} · {service.estimatedHours}h estimadas</p>
              <p className="mt-2 text-sm text-slate-600">{service.description}</p>
              <p className="mt-3 text-lg font-black text-lotus">{brl(service.laborPrice)}</p>
            </article>
          ))}
        </div>
      </ListPage>
    </AppShell>
  );
}
