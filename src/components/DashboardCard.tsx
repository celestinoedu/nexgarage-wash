import { LucideIcon } from "lucide-react";

type Props = {
  title: string;
  value: string;
  detail?: string;
  icon: LucideIcon;
  tone?: "default" | "success" | "warning" | "danger";
};

const tones = {
  default: "bg-white text-ink border-line",
  success: "bg-emerald-50/80 text-emerald-950 border-emerald-200",
  warning: "bg-amber-50/80 text-amber-950 border-amber-200",
  danger: "bg-rose-50/80 text-rose-950 border-rose-200"
};

export function DashboardCard({ title, value, detail, icon: Icon, tone = "default" }: Props) {
  return (
    <article className={`rounded-2xl border p-4 shadow-soft sm:p-5 ${tones[tone]}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold opacity-80">{title}</p>
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/70"><Icon size={19} aria-hidden /></span>
      </div>
      <strong className="mt-4 block text-2xl font-extrabold tracking-[-0.035em]">{value}</strong>
      {detail ? <span className="mt-1 block text-sm opacity-75">{detail}</span> : null}
    </article>
  );
}
