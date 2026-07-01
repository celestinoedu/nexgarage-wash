import Link from "next/link";
import { ClipboardList, Gauge, Home, Package, Receipt } from "lucide-react";

const items = [
  { href: "/dashboard", label: "Painel", icon: Home },
  { href: "/kanban", label: "Kanban", icon: ClipboardList },
  { href: "/orders/new", label: "Nova OS", icon: Receipt },
  { href: "/parts", label: "Peças", icon: Package },
  { href: "/mechanics", label: "Equipe", icon: Gauge }
];

export function MobileBottomNavigation() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-white lg:hidden">
      {items.map((item) => (
        <Link key={item.href} href={item.href} className="flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-bold text-slate-600">
          <item.icon size={21} aria-hidden />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
