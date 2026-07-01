import { AlertTriangle, Banknote, CreditCard, TrendingUp } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { DashboardCard } from "@/components/DashboardCard";
import { FinanceTable } from "@/components/FinanceTable";
import { FinancialDashboard } from "@/components/FinancialDashboard";
import { financialTransactions } from "@/lib/data";
import { brl } from "@/lib/utils";

export default function FinancePage() {
  const revenue = financialTransactions.filter((item) => item.type === "receita").reduce((sum, item) => sum + item.value, 0);
  const expenses = financialTransactions.filter((item) => item.type === "despesa").reduce((sum, item) => sum + item.value, 0);
  const pending = financialTransactions.filter((item) => item.status === "pendente" || item.status === "parcial").reduce((sum, item) => sum + item.value, 0);
  const overdue = financialTransactions.filter((item) => item.status === "vencido").reduce((sum, item) => sum + item.value, 0);
  return (
    <AppShell title="Financeiro">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardCard title="Receitas" value={brl(revenue)} icon={Banknote} tone="success" />
        <DashboardCard title="Despesas" value={brl(expenses)} icon={CreditCard} tone="danger" />
        <DashboardCard title="Pendente" value={brl(pending)} icon={TrendingUp} tone="warning" />
        <DashboardCard title="Vencido" value={brl(overdue)} icon={AlertTriangle} tone="danger" />
      </div>
      <div className="mt-5"><FinancialDashboard /></div>
      <div className="mt-5"><FinanceTable /></div>
    </AppShell>
  );
}
