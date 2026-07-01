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
  success: "bg-emerald-50 text-emerald-900 border-emerald-200",
  warning: "bg-amber-50 text-amber-900 border-amber-200",
  danger: "bg-rose-50 text-rose-900 border-rose-200"
};

export function DashboardCard({ title, value, detail, icon: Icon, tone = "default" }: Props) {
  return (
    <article className={`rounded-lg border p-4 shadow-soft ${tones[tone]}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold opacity-80">{title}</p>
        <Icon size={22} aria-hidden />
      </div>
      <strong className="mt-3 block text-2xl font-extrabold tracking-normal">{value}</strong>
      {detail ? <span className="mt-1 block text-sm opacity-75">{detail}</span> : null}
    </article>
  );
}
