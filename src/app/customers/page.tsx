import { AppShell } from "@/components/AppShell";
import { ListPage } from "@/components/ListPage";
import { CustomerForm } from "@/components/forms";
import { cars, customers, serviceOrders } from "@/lib/data";

export default function CustomersPage() {
  return (
    <AppShell title="Clientes">
      <ListPage title="Clientes" placeholder="Buscar por nome, WhatsApp ou CPF/CNPJ" form={<CustomerForm />}>
        <div className="grid gap-3 md:grid-cols-2">
          {customers.map((customer) => (
            <article key={customer.id} className="rounded-lg border border-line bg-white p-4 shadow-soft">
              <strong className="text-lg font-black">{customer.name}</strong>
              <p className="text-sm font-semibold text-slate-600">{customer.whatsapp}</p>
              <p className="mt-3 text-sm text-slate-500">{cars.filter((car) => car.customerId === customer.id).length} carros · {serviceOrders.filter((order) => order.customerId === customer.id).length} OS</p>
            </article>
          ))}
        </div>
      </ListPage>
    </AppShell>
  );
}
