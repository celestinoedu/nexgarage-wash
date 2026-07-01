import { AlertTriangle, CheckCircle2, Clock, PauseCircle, Wrench } from "lucide-react";
import { OrderStatus, Priority } from "@/lib/types";

const statusStyles: Record<OrderStatus, string> = {
  Recebido: "bg-sky-50 text-sky-800 border-sky-200",
  Diagnóstico: "bg-amber-50 text-amber-800 border-amber-200",
  "Aguardando aprovação": "bg-violet-50 text-violet-800 border-violet-200",
  "Aguardando peças": "bg-orange-50 text-orange-800 border-orange-200",
  "Em execução": "bg-teal-50 text-teal-800 border-teal-200",
  Finalizado: "bg-emerald-50 text-emerald-800 border-emerald-200",
  Entregue: "bg-slate-100 text-slate-700 border-slate-200",
  Cancelado: "bg-rose-50 text-rose-800 border-rose-200"
};

const priorityStyles: Record<Priority, string> = {
  Baixa: "bg-slate-100 text-slate-700",
  Normal: "bg-blue-50 text-blue-800",
  Alta: "bg-amber-50 text-amber-800",
  Urgente: "bg-rose-50 text-rose-800"
};

const statusIcons: Partial<Record<OrderStatus, React.ReactNode>> = {
  Recebido: <Clock size={14} />,
  Diagnóstico: <Wrench size={14} />,
  "Aguardando aprovação": <PauseCircle size={14} />,
  "Aguardando peças": <AlertTriangle size={14} />,
  "Em execução": <Wrench size={14} />,
  Finalizado: <CheckCircle2 size={14} />
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-semibold ${statusStyles[status]}`}>
      {statusIcons[status]}
      {status}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return <span className={`rounded-md px-2.5 py-1 text-xs font-semibold ${priorityStyles[priority]}`}>{priority}</span>;
}
