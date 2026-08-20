"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarPlus, CircleDollarSign, LayoutDashboard, Sparkles, Users } from "lucide-react";

const items = [
  { href: "/dashboard", label: "Início", icon: LayoutDashboard },
  { href: "/orders", label: "Atendimentos", icon: Sparkles },
  { href: "/orders/new", label: "Novo", icon: CalendarPlus, primary: true },
  { href: "/customers", label: "Clientes", icon: Users },
  { href: "/finance", label: "Financeiro", icon: CircleDollarSign }
];

export function MobileBottomNavigation() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line/80 bg-white/95 px-2 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-8px_30px_rgba(15,76,117,0.10)] backdrop-blur-xl lg:hidden" aria-label="Navegação rápida">
      <div className="mx-auto grid max-w-lg grid-cols-5">
        {items.map((item) => {
          const active = pathname === item.href || (!item.primary && item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));
          return (
            <Link key={item.href} href={item.href} className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-bold transition ${active ? "text-wash-700" : "text-slate-500"}`}>
              <span className={item.primary ? "-mt-6 grid h-12 w-12 place-items-center rounded-2xl bg-wash-700 text-white shadow-float" : active ? "grid h-7 w-10 place-items-center rounded-full bg-wash-100" : "grid h-7 w-10 place-items-center"}>
                <item.icon size={item.primary ? 22 : 20} aria-hidden />
              </span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
