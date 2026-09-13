// Preferência de interface compartilhada entre a versão legado (raiz do domínio)
// e a versão nova (subcaminho /app). Como as duas rodam na mesma origem, elas
// leem e escrevem a mesma chave de localStorage.
import { readPreference, writePreference } from "@/lib/local-preference";

export const VERSION_KEY = "nexwash:ui-version";

export type UiVersion = "legacy" | "next";

export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const parseVersion = (raw: string | null): UiVersion =>
  raw === "legacy" ? "legacy" : "next";

export function legacyUrl() {
  if (typeof window === "undefined") return "/";
  // O parâmetro mantém o legado ativo mesmo que a preferência ainda não tenha
  // sido gravada, e serve de saída manual caso /app fique indisponível.
  return `${window.location.origin}/?ui=legado`;
}

/**
 * URL absoluta de uma rota da versão nova, já com o subcaminho da publicação.
 * Usar isto em vez de montar a mão evita links quebrados quando a app não está
 * na raiz do domínio (é o caso: ela é servida em /app).
 */
export function appUrl(path: string) {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  return `${origin}${BASE_PATH}${path}`;
}

export function newVersionUrl() {
  return appUrl("/dashboard/");
}

export function readVersionPreference(): UiVersion {
  if (typeof window === "undefined") return "next";
  return parseVersion(readPreference(VERSION_KEY));
}

export function writeVersionPreference(version: UiVersion) {
  writePreference(VERSION_KEY, version);
}
