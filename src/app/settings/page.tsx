import { ShieldCheck, Users } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { workshop } from "@/lib/data";

const roles = [
  ["Admin", "Acesso total"],
  ["Atendente", "Clientes, carros, OS e Kanban"],
  ["Mecânico", "OS atribuídas, diagnóstico e conclusão técnica"],
  ["Estoquista", "Peças, fornecedores e estoque"],
  ["Financeiro", "Contas, dashboard e relatórios financeiros"]
];

export default function SettingsPage() {
  return (
    <AppShell title="Ajustes">
      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-lg border border-line bg-white p-4 shadow-soft">
          <h2 className="flex items-center gap-2 text-lg font-black"><Users size={20} />Oficina</h2>
          <div className="mt-4 grid gap-3">
            <input className="focus-ring min-h-12 rounded-md border border-line px-4" defaultValue={workshop.name} />
            <input className="focus-ring min-h-12 rounded-md border border-line px-4" defaultValue={workshop.company} />
            <input className="focus-ring min-h-12 rounded-md border border-line px-4" defaultValue={workshop.whatsapp} />
            <button className="min-h-12 rounded-md bg-lotus px-5 font-black text-white">Salvar ajustes</button>
          </div>
        </section>
        <section className="rounded-lg border border-line bg-white p-4 shadow-soft">
          <h2 className="flex items-center gap-2 text-lg font-black"><ShieldCheck size={20} />Permissões</h2>
          <div className="mt-4 grid gap-3">
            {roles.map(([role, description]) => (
              <div key={role} className="rounded-md bg-slate-50 p-3">
                <strong>{role}</strong>
                <p className="text-sm text-slate-500">{description}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
