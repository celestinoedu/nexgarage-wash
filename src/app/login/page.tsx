"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, Droplets, ShieldCheck, Store } from "lucide-react";
import { NexWashLogo } from "@/components/NexWashLogo";
import { useAuth } from "@/components/AuthProvider";

export default function LoginPage() {
  const router = useRouter();
  const { configured, signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    if (!configured) { router.push("/dashboard"); return; }
    setSubmitting(true);
    try { await signIn(email, password); router.replace("/dashboard"); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível entrar."); }
    finally { setSubmitting(false); }
  }

  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-[1.08fr_0.92fr]">
      <section className="relative hidden overflow-hidden bg-gradient-to-br from-wash-950 via-wash-800 to-wash-600 p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-16">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full border-[70px] border-cyan-300/10" />
        <div className="absolute -bottom-36 -left-24 h-[32rem] w-[32rem] rounded-full bg-cyan-300/10 blur-3xl" />
        <NexWashLogo inverse className="relative" />
        <div className="relative max-w-xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-cyan-100"><Droplets size={15} /> Gestão multiloja</span>
          <h1 className="mt-6 text-5xl font-extrabold leading-[1.05] tracking-[-0.055em] xl:text-6xl">Seu negócio organizado. Seu atendimento brilhando.</h1>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-sky-100">Operação, clientes, equipe e financeiro conectados para lava-rápidos e estética automotiva.</p>
          <div className="mt-9 grid gap-3 sm:grid-cols-2">
            <p className="flex items-center gap-2 text-sm font-semibold text-sky-100"><Store size={18} className="text-cyan-300" /> Todas as lojas em uma conta</p>
            <p className="flex items-center gap-2 text-sm font-semibold text-sky-100"><ShieldCheck size={18} className="text-cyan-300" /> Acessos seguros por loja</p>
          </div>
        </div>
        <p className="relative text-xs text-sky-200">Um produto Lotus Negócios</p>
      </section>

      <section className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_90%_0%,rgba(56,189,248,0.14),transparent_24rem)] p-5 sm:p-10">
        <div className="w-full max-w-md">
          <NexWashLogo className="mb-10 lg:hidden" />
          <p className="text-sm font-bold text-wash-700">Bem-vindo de volta</p>
          <h2 className="mt-1 text-3xl font-extrabold tracking-[-0.04em] text-ink">Acesse sua conta</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">Entre para acompanhar sua operação de onde estiver.</p>
          <form className="mt-8 grid gap-5" onSubmit={handleSubmit}>
            <label className="grid gap-2 text-sm font-bold text-slate-700">E-mail<input value={email} onChange={(event) => setEmail(event.target.value)} className="focus-ring min-h-12 rounded-xl border border-line bg-white px-4 font-medium" placeholder="voce@empresa.com.br" type="email" autoComplete="email" required={configured} /></label>
            <label className="grid gap-2 text-sm font-bold text-slate-700">Senha<input value={password} onChange={(event) => setPassword(event.target.value)} className="focus-ring min-h-12 rounded-xl border border-line bg-white px-4 font-medium" placeholder="Sua senha" type="password" autoComplete="current-password" required={configured} /></label>
            <div className="flex items-center justify-between gap-3 text-sm"><label className="flex items-center gap-2 font-medium text-slate-600"><input type="checkbox" className="h-4 w-4 accent-wash-700" /> Lembrar de mim</label><button type="button" className="font-bold text-wash-700 hover:text-wash-900">Esqueci minha senha</button></div>
            {error ? <p className="rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700" role="alert">{error}</p> : null}
            <button disabled={submitting} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-wash-700 px-5 text-base font-extrabold text-white shadow-float transition hover:bg-wash-800 disabled:opacity-60">{submitting ? "Entrando..." : configured ? "Entrar" : "Visualizar prévia"} <ArrowRight size={19} /></button>
          </form>
          <p className="mt-8 flex items-center justify-center gap-2 text-center text-xs text-slate-400"><CheckCircle2 size={14} /> {configured ? "Ambiente protegido e dados isolados por loja" : "Prévia local — nenhum banco de dados conectado"}</p>
        </div>
      </section>
    </main>
  );
}
