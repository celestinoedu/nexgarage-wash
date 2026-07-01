import Link from "next/link";
import Image from "next/image";
import {
  BarChart3,
  Boxes,
  Car,
  ClipboardList,
  FileText,
  Gauge,
  Home,
  Menu,
  Package,
  Receipt,
  Settings,
  Users,
  Wrench
} from "lucide-react";
import { MobileBottomNavigation } from "./MobileBottomNavigation";
import { workshop } from "@/lib/data";

const nav = [
  { href: "/dashboard", label: "Painel", icon: Home },
  { href: "/kanban", label: "Kanban", icon: ClipboardList },
  { href: "/orders", label: "OS", icon: Receipt },
  { href: "/customers", label: "Clientes", icon: Users },
  { href: "/cars", label: "Carros", icon: Car },
  { href: "/parts", label: "Peças", icon: Package },
  { href: "/services", label: "Serviços", icon: Wrench },
  { href: "/mechanics", label: "Mecânicos", icon: Gauge },
  { href: "/suppliers", label: "Fornecedores", icon: Boxes },
  { href: "/inventory", label: "Estoque", icon: Boxes },
  { href: "/technical-reports", label: "Laudos", icon: FileText },
  { href: "/finance", label: "Financeiro", icon: BarChart3 },
  { href: "/reports", label: "Relatórios", icon: BarChart3 },
  { href: "/settings", label: "Ajustes", icon: Settings }
];

export function AppShell({ children, title, action }: { children: React.ReactNode; title: string; action?: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-line bg-white lg:block">
        <div className="border-b border-line p-5">
          <Image src="/branding/logo.png" alt="NexGarage" width={170} height={62} className="h-11 w-auto object-contain" priority />
          <span className="text-xs font-semibold text-slate-500">{workshop.company}</span>
        </div>
        <nav className="flex flex-col gap-1 p-3">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className="flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-semibold text-slate-700 hover:bg-teal-50 hover:text-lotus">
              <item.icon size={19} aria-hidden />
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="pb-24 lg:ml-64 lg:pb-0">
        <header className="sticky top-0 z-10 border-b border-line bg-white/95 px-4 py-3 backdrop-blur lg:px-8">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button className="grid h-11 w-11 place-items-center rounded-md border border-line bg-white lg:hidden" aria-label="Abrir menu">
                <Menu size={22} />
              </button>
              <div>
                <p className="text-xs font-bold uppercase text-slate-500">{workshop.name}</p>
                <h1 className="text-xl font-black tracking-normal text-ink sm:text-2xl">{title}</h1>
              </div>
            </div>
            {action}
          </div>
        </header>
        <div className="px-4 py-5 lg:px-8">{children}</div>
      </main>
      <MobileBottomNavigation />
    </div>
  );
}
