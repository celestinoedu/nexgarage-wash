import { AppShell } from "@/components/AppShell";
import { ListPage } from "@/components/ListPage";
import { CarForm } from "@/components/forms";
import { cars, customers, serviceOrders } from "@/lib/data";

export default function CarsPage() {
  return (
    <AppShell title="Carros">
      <ListPage title="Carros" placeholder="Buscar por placa, cliente ou modelo" form={<CarForm />}>
        <div className="grid gap-3 md:grid-cols-2">
          {cars.map((car) => (
            <article key={car.id} className="rounded-lg border border-line bg-white p-4 shadow-soft">
              <strong className="text-xl font-black">{car.plate}</strong>
              <p className="font-semibold text-slate-600">{car.brand} {car.model} · {car.year}</p>
              <p className="text-sm text-slate-500">{customers.find((customer) => customer.id === car.customerId)?.name} · {car.mileage.toLocaleString("pt-BR")} km</p>
              <p className="mt-3 text-sm font-bold text-lotus">{serviceOrders.filter((order) => order.carId === car.id).length} ordens no histórico</p>
            </article>
          ))}
        </div>
      </ListPage>
    </AppShell>
  );
}
