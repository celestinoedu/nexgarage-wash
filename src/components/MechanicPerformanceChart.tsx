"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { mechanics, serviceOrders } from "@/lib/data";
import { brl } from "@/lib/utils";

export function MechanicPerformanceChart() {
  const data = mechanics.map((mechanic) => {
    const orders = serviceOrders.filter((order) => order.mechanicId === mechanic.id);
    return {
      name: mechanic.name.split(" ")[0],
      os: orders.length,
      receita: orders.reduce((sum, order) => sum + order.totalValue, 0)
    };
  });

  return (
    <article className="rounded-lg border border-line bg-white p-4 shadow-soft">
      <h2 className="mb-4 text-lg font-black">Produtividade por mecânico</h2>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip formatter={(value, key) => (key === "receita" ? brl(Number(value)) : value)} />
            <Bar dataKey="os" fill="#2563eb" radius={[6, 6, 0, 0]} />
            <Bar dataKey="receita" fill="#0f766e" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
}
