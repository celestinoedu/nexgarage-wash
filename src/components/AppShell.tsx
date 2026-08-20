"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart3, Building2, CalendarDays, Car, ChevronDown, CircleDollarSign,
  Handshake, LayoutDashboard, Menu, Settings, Sparkles, Target,
  UserRoundCheck, Users, X
} from "lucide-react";
import { MobileBottomNavigation } from "./MobileBottomNavigation";
import { NexWashLogo } from "./NexWashLogo";
import { useAuth } from "./AuthProvider";
import { useStore } from "./StoreProvider";

const navGroups = [
  {
    label: "Operação",
    items: [
      { href: "/dashboard", label: "Visão geral", icon: LayoutDashboard },
      { href: "/orders", label: "Atendimentos", icon: Sparkles },
      { href: "/orders/new", label: "Novo atendimento", icon: CalendarDays },
      { href: "/customers", label: "Clientes", icon: Users },
      { href: "/cars", label: "Veículos", icon: Car }
    ]
  },
  {
    label: "Relacionamento",
    items: [
      { href: "/partners", label: "Parceiros", icon: Handshake },
      { href: "/opportunities", label: "Oportunidades", icon: Target }
    ]
  },
  {
    label: "Gestão",
    items: [
      { href: "/services", label: "Serviços", icon: Sparkles },
      { href: "/team", label: "Equipe e presença", icon: UserRoundCheck },
      { href: "/finance", label: "Financeiro", icon: CircleDollarSign },
      { href: "/reports", label: "Relatórios", icon: BarChart3 },
      { href: "/settings", label: "Configurações", icon: Settings }
    ]
  }
];

function SidebarContent({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  const { stores, currentStore, selectStore } = useStore();
  return (
    <>
      <div className="border-b border-white/10 px-5 py-5">
        <NexWashLogo inverse />
        <p className="mt-2 text-xs font-medium text-sky-200">Gestão que deixa seu negócio brilhando.</p>
      </div>

      <div className="relative mx-3 mt-4 flex items-center gap-3 rounded-xl border border-white/10 bg-white/10 p-3 transition hover:bg-white/15">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-cyan-300 text-wash-950"><Building2 size={18} /></span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs text-sky-200">Loja ativa</span>
          <strong className="block truncate text-sm text-white">{currentStore?.name ?? "Carregando..."}</strong>
        </span>
        <ChevronDown size={17} className="text-sky-200" />
        <select value={currentStore?.id ?? ""} onChange={(event) => selectStore(event.target.value)} className="absolute inset-0 cursor-pointer opacity-0" aria-label="Selecionar loja">
          {stores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}
        </select>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-5 pt-4" aria-label="Navegação principal">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-5">
            <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-sky-300/80">{group.label}</p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));
                return (
                  <Link key={item.href} href={item.href} onClick={onNavigate} className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition ${active ? "bg-white text-wash-900 shadow-sm" : "text-sky-100 hover:bg-white/10 hover:text-white"}`}>
                    <item.icon size={18} aria-hidden />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </>
  );
}

export function AppShell({ children, title, action }: { children: React.ReactNode; title: string; action?: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { configured, loading, user, signOut } = useAuth();
  const { currentStore } = useStore();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (configured && !loading && !user) router.replace("/login");
  }, [configured, loading, router, user]);

  if (configured && (loading || !user)) {
    return <div className="grid min-h-screen place-items-center bg-wash-50"><NexWashLogo /></div>;
  }

  const fullName = String(user?.user_metadata?.full_name ?? user?.email?.split("@")[0] ?? "Prévia");
  const initials = fullName.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col bg-gradient-to-b from-wash-950 to-wash-800 lg:flex">
        <SidebarContent pathname={pathname} />
      </aside>

      {menuOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm" onClick={() => setMenuOpen(false)} aria-label="Fechar menu" />
          <aside className="relative flex h-full w-[min(88vw,20rem)] flex-col bg-gradient-to-b from-wash-950 to-wash-800 shadow-2xl">
            <button className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-xl text-white hover:bg-white/10" onClick={() => setMenuOpen(false)} aria-label="Fechar menu"><X size={22} /></button>
            <SidebarContent pathname={pathname} onNavigate={() => setMenuOpen(false)} />
          </aside>
        </div>
      ) : null}

      <main className="pb-24 lg:ml-72 lg:pb-0">
        <header className="sticky top-0 z-20 border-b border-line/80 bg-white/90 px-4 py-3 backdrop-blur-xl lg:px-8">
          <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <button className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-line bg-white text-wash-900 lg:hidden" onClick={() => setMenuOpen(true)} aria-label="Abrir menu"><Menu size={22} /></button>
              <div className="min-w-0">
                <p className="truncate text-[11px] font-bold uppercase tracking-[0.12em] text-wash-700 lg:hidden">{currentStore?.name ?? "NexWash"}</p>
                <h1 className="truncate text-xl font-extrabold tracking-[-0.035em] text-ink sm:text-2xl">{title}</h1>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {action}
              <button onClick={async () => { if (configured) { await signOut(); router.replace("/login"); } }} className="hidden min-h-11 items-center gap-2 rounded-xl border border-line bg-white px-3 text-sm font-semibold text-slate-700 sm:flex" title={configured ? "Sair da conta" : "Modo de prévia local"}>
                <span className="grid h-7 w-7 place-items-center rounded-full bg-wash-100 text-xs font-extrabold text-wash-800">{initials || "NW"}</span>
                <span className="hidden max-w-28 truncate xl:inline">{fullName}</span>
                <ChevronDown size={15} />
              </button>
            </div>
          </div>
        </header>
        <div className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">{children}</div>
      </main>
      <MobileBottomNavigation />
    </div>
  );
}
