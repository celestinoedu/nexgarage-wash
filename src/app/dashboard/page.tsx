import { AlertTriangle, Banknote, Boxes, CheckCircle2, Clock, Receipt, TrendingUp, Wrench } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { DashboardCard } from "@/components/DashboardCard";
import { FinancialDashboard } from "@/components/FinancialDashboard";
import { MechanicDemandPanel } from "@/components/MechanicDemandPanel";
import { MechanicPerformanceChart } from "@/components/MechanicPerformanceChart";
import { StockAlertCard } from "@/components/StockAlertCard";
import { financialTransactions, parts, serviceOrders } from "@/lib/data";
import { brl, isLate } from "@/lib/utils";

export default function DashboardPage() {
  const revenue = financialTransactions.filter((item) => item.type === "receita").reduce((sum, item) => sum + item.value, 0);
  const expenses = financialTransactions.filter((item) => item.type === "despesa").reduce((sum, item) => sum + item.value, 0);
  const pending = financialTransactions.filter((item) => item.type === "receita" && item.status !== "pago").reduce((sum, item) => sum + item.value, 0);
  const overdue = financialTransactions.filter((item) => item.status === "vencido").length;
  const openOrders = serviceOrders.filter((order) => !["Entregue", "Cancelado"].includes(order.status)).length;
  const doneOrders = serviceOrders.filter((order) => order.status === "Finalizado" || order.status === "Entregue").length;
  const lateOrders = serviceOrders.filter((order) => isLate(order.dueDate, order.status)).length;
  const lowParts = parts.filter((part) => part.stockQty <= part.minStock).length;

  return (
    <AppShell title="Painel de controle">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardCard title="Faturamento do mês" value={brl(revenue)} detail="Receitas por OS" icon={Banknote} tone="success" />
        <DashboardCard title="Receitas pendentes" value={brl(pending)} detail="A receber" icon={Clock} tone="warning" />
        <DashboardCard title="Contas vencidas" value={String(overdue)} detail="Atenção financeira" icon={AlertTriangle} tone="danger" />
        <DashboardCard title="Lucro estimado" value={brl(revenue - expenses)} detail="Receitas - despesas" icon={TrendingUp} />
        <DashboardCard title="Ticket médio" value={brl(revenue / serviceOrders.length)} icon={Receipt} />
        <DashboardCard title="OS abertas" value={String(openOrders)} icon={Wrench} />
        <DashboardCard title="OS concluídas" value={String(doneOrders)} icon={CheckCircle2} tone="success" />
        <DashboardCard title="OS atrasadas" value={String(lateOrders)} icon={AlertTriangle} tone="danger" />
        <DashboardCard title="Peças baixo estoque" value={String(lowParts)} icon={Boxes} tone="warning" />
      </div>
      <div className="mt-5"><StockAlertCard /></div>
      <div className="mt-5"><MechanicDemandPanel /></div>
      <div className="mt-5 grid gap-4 xl:grid-cols-2"><FinancialDashboard /><MechanicPerformanceChart /></div>
    </AppShell>
  );
}
