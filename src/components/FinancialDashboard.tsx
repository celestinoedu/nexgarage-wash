"use client";

import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { financialTransactions, serviceOrders } from "@/lib/data";
import { brl } from "@/lib/utils";

export function FinancialDashboard() {
  const revenue = financialTransactions.filter((item) => item.type === "receita");
  const expense = financialTransactions.filter((item) => item.type === "despesa");
  const revenueByDay = revenue.slice(0, 8).map((item) => ({ name: item.dueDate.slice(5), valor: item.value }));
  const statusData = ["Recebido", "Diagnóstico", "Aguardando aprovação", "Aguardando peças", "Em execução", "Finalizado", "Entregue", "Cancelado"].map((status) => ({
    name: status,
    value: serviceOrders.filter((order) => order.status === status).length
  }));
  const expenseByCategory = expense.reduce<Record<string, number>>((acc, item) => ({ ...acc, [item.category]: (acc[item.category] ?? 0) + item.value }), {});
  const expenseData = Object.entries(expenseByCategory).map(([name, value]) => ({ name, value }));

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <article className="rounded-lg border border-line bg-white p-4 shadow-soft xl:col-span-2">
        <h2 className="mb-4 text-lg font-black">Receita por período</h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={revenueByDay}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis tickFormatter={(value) => `R$${value / 1000}k`} />
              <Tooltip formatter={(value) => brl(Number(value))} />
              <Bar dataKey="valor" fill="#0f766e" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </article>
      <article className="rounded-lg border border-line bg-white p-4 shadow-soft">
        <h2 className="mb-4 text-lg font-black">OS por status</h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" outerRadius={90}>
                {statusData.map((_, index) => <Cell key={index} fill={["#0f766e", "#f59e0b", "#7c3aed", "#ea580c", "#0891b2", "#16a34a", "#64748b", "#e11d48"][index]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </article>
      <article className="rounded-lg border border-line bg-white p-4 shadow-soft xl:col-span-3">
        <h2 className="mb-4 text-lg font-black">Despesas por categoria</h2>
        <div className="grid gap-2 md:grid-cols-4">
          {expenseData.map((item) => (
            <div key={item.name} className="rounded-md bg-slate-50 p-3">
              <p className="text-sm font-bold text-slate-500">{item.name}</p>
              <strong className="text-xl font-black text-ink">{brl(item.value)}</strong>
            </div>
          ))}
        </div>
      </article>
    </div>
  );
}
