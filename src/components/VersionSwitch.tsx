"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import {
  legacyUrl,
  readVersionPreference,
  writeVersionPreference,
} from "@/lib/version";

/**
 * Alternador entre a versão nova (esta) e a versão legado, servida na raiz.
 * A escolha fica guardada em localStorage e é lida também pelo legado, que
 * redireciona para cá quando o usuário optou pela versão nova.
 */
export function VersionSwitch({ compact = false }: { compact?: boolean }) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    // Quem está navegando aqui já está na versão nova: mantém a preferência
    // coerente para os próximos acessos, sem sobrescrever uma escolha ativa.
    if (readVersionPreference() !== "next") return;
    writeVersionPreference("next");
  }, []);

  function goToLegacy() {
    setLeaving(true);
    writeVersionPreference("legacy");
    window.location.href = legacyUrl();
  }

  return (
    <div
      className="flex items-center gap-1 rounded-xl border border-line bg-slate-50 p-1"
      role="group"
      aria-label="Versão da interface"
    >
      <button
        type="button"
        onClick={goToLegacy}
        disabled={leaving}
        className="min-h-9 rounded-lg px-2.5 text-xs font-bold text-slate-500 transition hover:bg-white hover:text-slate-700 disabled:opacity-60"
        title="Voltar para a versão atual (legado)"
      >
        Versão atual
      </button>
      <span
        aria-current="true"
        className="flex min-h-9 items-center gap-1.5 rounded-lg bg-wash-700 px-2.5 text-xs font-bold text-white shadow-sm"
      >
        <Sparkles size={13} aria-hidden />
        {compact ? "Nova" : "Versão nova"}
      </span>
    </div>
  );
}
