"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Preferências guardadas em localStorage e lidas de forma segura na exportação
 * estática: na renderização do servidor vale o padrão, e o valor real entra na
 * hidratação. Escritas na mesma aba avisam os componentes na hora; escritas em
 * outra aba chegam pelo evento "storage".
 */
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

export function readPreference(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writePreference(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* navegação privada: a preferência vale só para esta sessão */
  }
  listeners.forEach((listener) => listener());
}

export function usePreference<T extends string>(
  key: string,
  fallback: T,
  parse: (raw: string | null) => T,
) {
  const getSnapshot = useCallback(() => parse(readPreference(key)), [key, parse]);
  const getServerSnapshot = useCallback(() => fallback, [fallback]);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
