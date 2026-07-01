import { LogIn } from "lucide-react";
import Image from "next/image";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-100 p-4">
      <section className="w-full max-w-md rounded-lg border border-line bg-white p-6 shadow-soft">
        <Image src="/branding/logo.png" alt="NexGarage" width={220} height={80} className="h-16 w-auto object-contain" priority />
        <p className="mt-2 text-sm font-semibold text-slate-500">LOTUS NEGOCIOS LTDA</p>
        <div className="mt-6 grid gap-3">
          <input className="focus-ring min-h-12 rounded-md border border-line px-4" placeholder="E-mail" />
          <input className="focus-ring min-h-12 rounded-md border border-line px-4" placeholder="Senha" type="password" />
          <a href="/dashboard" className="flex min-h-12 items-center justify-center gap-2 rounded-md bg-lotus px-5 text-base font-black text-white">
            <LogIn size={20} /> Entrar
          </a>
        </div>
      </section>
    </main>
  );
}
