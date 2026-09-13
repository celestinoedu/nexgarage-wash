"use client";

import type { Session, User } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { appUrl } from "@/lib/version";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  configured: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** Envia o e-mail com o link de redefinição de senha. */
  resetPassword: (email: string) => Promise<void>;
  /** Define a nova senha do usuário que chegou pelo link do e-mail. */
  updatePassword: (password: string) => Promise<void>;
  /** true enquanto o usuário está na volta do link de recuperação. */
  recovering: boolean;
  clearRecovery: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false); });
    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      // O link do e-mail abre uma sessão temporária e dispara PASSWORD_RECOVERY:
      // é o gancho para pedir a nova senha em vez de entrar direto no painel.
      if (event === "PASSWORD_RECOVERY") setRecovering(true);
      setSession(nextSession);
      setLoading(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    user: session?.user ?? null,
    loading,
    configured: isSupabaseConfigured,
    signIn: async (email, password) => {
      if (!supabase) throw new Error("O ambiente NexWash ainda não foi conectado ao Supabase novo.");
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.message === "Invalid login credentials") throw new Error("E-mail ou senha incorretos.");
        throw error;
      }
    },
    signUp: async (email, password, fullName) => {
      if (!supabase) throw new Error("O ambiente NexWash ainda não foi conectado ao Supabase.");
      const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
      if (error) throw error;
      if (data.session) await supabase.auth.signOut();
    },
    signOut: async () => { if (supabase) { const { error } = await supabase.auth.signOut(); if (error) throw error; } },
    resetPassword: async (email) => {
      if (!supabase) throw new Error("O ambiente NexWash ainda não foi conectado ao Supabase.");
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: appUrl("/login/"),
      });
      if (error) throw error;
    },
    updatePassword: async (password) => {
      if (!supabase) throw new Error("O ambiente NexWash ainda não foi conectado ao Supabase.");
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        if (error.message.includes("should be different"))
          throw new Error("A nova senha precisa ser diferente da anterior.");
        throw error;
      }
      setRecovering(false);
    },
    recovering,
    clearRecovery: () => setRecovering(false),
  }), [loading, recovering, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth precisa estar dentro de AuthProvider");
  return context;
}
