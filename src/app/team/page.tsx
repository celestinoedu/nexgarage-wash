"use client";

import { FormEvent, useState } from "react";
import { Check, Clock3, LoaderCircle, Plus, UserRoundCheck, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useStoreRows } from "@/hooks/useStoreRows";
import { supabase } from "@/lib/supabase";

type Employee = { id: string; name: string; role_name: string | null; active: boolean };
type Attendance = { id: string; employee_id: string; work_date: string; status: string };
const today = localDate(new Date());

export default function TeamPage() {
  const employees = useStoreRows<Employee>("employees", { select: "id,name,role_name,active", orderBy: "name", ascending: true });
  const attendance = useStoreRows<Attendance>("attendance", { select: "id,employee_id,work_date,status", orderBy: "work_date" });
  const [open, setOpen] = useState(false); const [saving, setSaving] = useState(false); const [formError, setFormError] = useState<string | null>(null);
  const activeEmployees = employees.rows.filter((item) => item.active);
  const presentIds = new Set(attendance.rows.filter((item) => item.work_date === today && item.status === "present").map((item) => item.employee_id));

  async function createEmployee(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!supabase || !employees.store) return; const form = new FormData(event.currentTarget); setSaving(true);
    const { error } = await supabase.from("employees").insert({ store_id: employees.store.id, name: String(form.get("name")), role_name: String(form.get("role") ?? "") || null, phone: String(form.get("phone") ?? "") || null, commission_percent: Number(form.get("commission")) || 0 });
    if (error) { setFormError(error.message); setSaving(false); return; } setOpen(false); setSaving(false); employees.refresh();
  }
  async function togglePresence(employeeId: string) {
    if (!supabase || !employees.store) return; const present = presentIds.has(employeeId);
    await supabase.from("attendance").upsert({ store_id: employees.store.id, employee_id: employeeId, work_date: today, status: present ? "absent" : "present", checked_at: present ? null : new Date().toISOString() }, { onConflict: "store_id,employee_id,work_date" });
    attendance.refresh();
  }

  return <AppShell title="Equipe e presença" action={<button onClick={() => setOpen(true)} className="hidden min-h-11 items-center gap-2 rounded-xl bg-wash-700 px-4 text-sm font-bold text-white sm:flex"><Plus size={17} /> Colaborador</button>}>
    <button onClick={() => setOpen(true)} className="mb-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-wash-700 text-sm font-bold text-white sm:hidden"><Plus size={17} /> Colaborador</button>
    {open ? <form onSubmit={createEmployee} className="mb-4 rounded-2xl border border-wash-200 bg-white p-4 shadow-soft"><div className="flex justify-between"><div><h2 className="font-extrabold">Novo colaborador</h2><p className="text-sm text-slate-500">Cadastro operacional da loja selecionada.</p></div><button type="button" onClick={() => setOpen(false)}><X size={18} /></button></div><div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><input required name="name" className="field" placeholder="Nome" /><input name="role" className="field" placeholder="Função" /><input name="phone" className="field" placeholder="Telefone" /><input name="commission" type="number" min="0" max="100" step="0.01" className="field" placeholder="Comissão %" /></div>{formError ? <p className="mt-3 text-sm font-semibold text-rose-700">{formError}</p> : null}<button disabled={saving} className="mt-4 flex min-h-11 items-center justify-center rounded-xl bg-wash-700 px-5 text-sm font-extrabold text-white">{saving ? <LoaderCircle className="animate-spin" size={18} /> : "Salvar colaborador"}</button></form> : null}
    <div className="grid gap-5 xl:grid-cols-[1fr_22rem]"><section className="rounded-2xl border border-line bg-white shadow-soft"><div className="border-b border-line p-5"><h2 className="text-lg font-extrabold">Presença de hoje</h2><p className="text-sm text-slate-500">{new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(new Date())} · {presentIds.size} de {activeEmployees.length} presentes</p></div>{employees.loading || attendance.loading ? <div className="grid h-40 place-items-center"><LoaderCircle className="animate-spin text-wash-700" /></div> : <div className="divide-y divide-line">{activeEmployees.map((employee) => {
      const present = presentIds.has(employee.id); return <article key={employee.id} className="flex items-center gap-3 p-4 sm:p-5"><span className="grid h-10 w-10 place-items-center rounded-full bg-wash-100 text-xs font-extrabold text-wash-800">{employee.name.split(" ").slice(0, 2).map((part) => part[0]).join("")}</span><div className="min-w-0 flex-1"><strong className="text-sm">{employee.name}</strong><p className="text-xs text-slate-500">{employee.role_name ?? "Colaborador"}</p></div><button onClick={() => void togglePresence(employee.id)} className={`flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-bold ${present ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{present ? <Check size={16} /> : <Clock3 size={16} />}{present ? "Presente" : "Registrar"}</button></article>;
    })}</div>}</section><aside className="h-fit rounded-2xl bg-gradient-to-br from-wash-950 to-wash-700 p-5 text-white shadow-float"><UserRoundCheck size={25} className="text-cyan-200" /><h2 className="mt-5 text-xl font-extrabold">Equipe em operação</h2><strong className="mt-3 block text-5xl font-extrabold">{presentIds.size}</strong><p className="mt-1 text-sm text-sky-100">colaboradores presentes</p></aside></div>
  </AppShell>;
}
function localDate(date: Date) { return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-"); }
