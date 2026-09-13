"use client";

import Image from "next/image";
import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  Building2,
  Check,
  CreditCard,
  ImagePlus,
  KeyRound,
  LayoutGrid,
  LoaderCircle,
  MapPin,
  MonitorSmartphone,
  Pencil,
  Plus,
  ShieldCheck,
  Sparkles,
  Store,
  UserCog,
  Users,
  X,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/components/AuthProvider";
import type { StoreScope } from "@/components/StoreProvider";
import { useStore } from "@/components/StoreProvider";
import { supabase } from "@/lib/supabase";
import { cpfDigits, formatCPF, isValidCPF } from "@/lib/cpf";
import { usePreference } from "@/lib/local-preference";
import type { UiVersion } from "@/lib/version";
import {
  VERSION_KEY,
  appUrl,
  legacyUrl,
  parseVersion,
  writeVersionPreference,
} from "@/lib/version";

type TabId =
  | "account"
  | "preferences"
  | "stores"
  | "users"
  | "security"
  | "billing";
type Profile = {
  full_name: string;
  phone: string;
  whatsapp: string;
  document: string;
  birth_date: string;
  /** false enquanto a migração nexwash_profile_fields.sql não foi aplicada. */
  extended: boolean;
};
const EMPTY_PROFILE: Profile = {
  full_name: "",
  phone: "",
  whatsapp: "",
  document: "",
  birth_date: "",
  extended: true,
};
const EXTENDED_COLUMNS = "full_name,phone,whatsapp,document,birth_date";
type AccountUser = {
  user_id: string;
  email: string;
  full_name: string;
  account_role: string;
  store_ids: string[];
  store_roles: Record<string, string>;
};
const tabs = [
  { id: "account" as const, label: "Minha conta", icon: UserCog },
  { id: "preferences" as const, label: "Visualização", icon: LayoutGrid },
  { id: "stores" as const, label: "Lojas", icon: Store },
  { id: "users" as const, label: "Usuários e acessos", icon: Users },
  { id: "security" as const, label: "Segurança", icon: ShieldCheck },
  { id: "billing" as const, label: "Plano e cobrança", icon: CreditCard },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const { stores, currentStore, selectStore, scope, setScope } = useStore();
  const [tab, setTab] = useState<TabId>("stores");
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [accountUsers, setAccountUsers] = useState<AccountUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [showAccessForm, setShowAccessForm] = useState(false);
  const [editingUser, setEditingUser] = useState<AccountUser | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const fullName = String(
    user?.user_metadata?.full_name ?? user?.email?.split("@")[0] ?? "Usuário",
  );
  const initials = fullName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  const loadUsers = useCallback(async () => {
    await Promise.resolve();
    if (!supabase || !currentStore) return;
    setUsersLoading(true);
    setError(null);
    const { data, error: loadError } = await supabase.rpc(
      "list_account_users_with_access",
      { p_account_id: currentStore.account_id },
    );
    if (loadError) setError(loadError.message);
    else setAccountUsers((data ?? []) as AccountUser[]);
    setUsersLoading(false);
  }, [currentStore]);

  // O menu da conta aponta para /settings#conta; abrir direto na aba certa
  // evita o usuário ter que procurar onde editar os próprios dados.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (window.location.hash === "#conta") setTab("account");
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (tab !== "users" && tab !== "billing") return;
    const timer = window.setTimeout(() => void loadUsers(), 0);
    return () => window.clearTimeout(timer);
  }, [loadUsers, tab]);

  const loadProfile = useCallback(async () => {
    await Promise.resolve();
    if (!supabase || !user) {
      setProfile(EMPTY_PROFILE);
      return;
    }
    const extendedQuery = await supabase
      .from("profiles")
      .select(EXTENDED_COLUMNS)
      .eq("id", user.id)
      .maybeSingle();
    // Sem a migração aplicada, as colunas extras não existem: o cadastro segue
    // funcionando com nome e telefone.
    const extended = !extendedQuery.error;
    const fallback = extended
      ? null
      : await supabase
          .from("profiles")
          .select("full_name,phone")
          .eq("id", user.id)
          .maybeSingle();
    const data = (extendedQuery.data ?? fallback?.data ?? null) as Record<
      string,
      unknown
    > | null;
    setProfile({
      full_name: String(data?.full_name ?? user.user_metadata?.full_name ?? ""),
      phone: String(data?.phone ?? ""),
      whatsapp: String(data?.whatsapp ?? ""),
      document: String(data?.document ?? ""),
      birth_date: String(data?.birth_date ?? "").slice(0, 10),
      extended,
    });
  }, [user]);

  useEffect(() => {
    if (tab !== "account") return;
    const timer = window.setTimeout(() => void loadProfile(), 0);
    return () => window.clearTimeout(timer);
  }, [loadProfile, tab]);

  async function createStore(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !currentStore) return;
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setError(null);
    const { data, error: createError } = await supabase.rpc(
      "create_store_for_account",
      {
        p_account_id: currentStore.account_id,
        p_store_name: String(form.get("name") ?? ""),
        p_city: String(form.get("city") ?? "") || null,
        p_state: String(form.get("state") ?? "") || null,
      },
    );
    if (createError) {
      setError(createError.message);
      setSaving(false);
      return;
    }
    if (data) window.localStorage.setItem("nexwash:store-id", String(data));
    window.location.reload();
  }

  async function uploadLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !supabase || !currentStore) return;
    const extension = (
      {
        "image/png": "png",
        "image/jpeg": "jpg",
        "image/webp": "webp",
      } as Record<string, string>
    )[file.type];
    if (!extension) {
      setLogoError("Use uma imagem PNG, JPG ou WebP.");
      event.target.value = "";
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setLogoError("O logo deve ter no máximo 3 MB.");
      event.target.value = "";
      return;
    }
    setUploadingLogo(true);
    setLogoError(null);
    const path = `${currentStore.id}/logo-${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from("store-branding")
      .upload(path, file, { cacheControl: "3600", upsert: false });
    if (uploadError) {
      setLogoError(uploadError.message);
      setUploadingLogo(false);
      return;
    }
    const { data } = supabase.storage.from("store-branding").getPublicUrl(path);
    const { error: updateError } = await supabase.rpc("set_store_logo", {
      p_store_id: currentStore.id,
      p_logo_url: data.publicUrl,
    });
    if (updateError) {
      await supabase.storage.from("store-branding").remove([path]);
      setLogoError(updateError.message);
      setUploadingLogo(false);
      return;
    }
    window.location.reload();
  }

  async function updateProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !user) return;
    const form = new FormData(event.currentTarget);
    const name = String(form.get("full_name") ?? "").trim();
    const phone = String(form.get("phone") ?? "").trim();
    const whatsapp = String(form.get("whatsapp") ?? "").trim();
    const document = cpfDigits(String(form.get("document") ?? ""));
    const birthDate = String(form.get("birth_date") ?? "");
    const email = String(form.get("email") ?? "").trim();
    setError(null);
    setMessage(null);
    if (document && !isValidCPF(document)) {
      setError("CPF inválido. Confira os números digitados.");
      return;
    }
    setSaving(true);
    // upsert cobre usuários migrados do legado que ainda não têm linha em profiles.
    const { error: profileError } = await supabase.from("profiles").upsert({
      id: user.id,
      full_name: name,
      phone: phone || null,
      ...(profile?.extended
        ? {
            whatsapp: whatsapp || null,
            document: document || null,
            birth_date: birthDate || null,
          }
        : {}),
    });
    const emailChanged =
      Boolean(email) && email.toLowerCase() !== (user.email ?? "").toLowerCase();
    const { error: authError } = await supabase.auth.updateUser({
      data: { full_name: name },
      ...(emailChanged ? { email } : {}),
    });
    if (profileError || authError)
      setError(
        (profileError ?? authError)?.message ?? "Não foi possível atualizar.",
      );
    else {
      setMessage(
        emailChanged
          ? "Dados salvos. Confirme o novo e-mail pelo link enviado para ele."
          : "Dados da conta atualizados.",
      );
      await loadProfile();
    }
    setSaving(false);
  }

  async function grantAccess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !currentStore) return;
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setError(null);
    setMessage(null);
    const accountRole = String(form.get("account_role") ?? "member");
    const storeIds = form.getAll("store_ids").map(String);
    const result = editingUser
      ? await supabase.rpc("update_account_user_access", {
          p_account_id: currentStore.account_id,
          p_user_id: editingUser.user_id,
          p_account_role: accountRole,
          p_store_access: Object.fromEntries(
            storeIds.map((storeId) => [
              storeId,
              String(form.get(`store_role_${storeId}`) ?? "operator"),
            ]),
          ),
        })
      : await supabase.rpc("grant_existing_user_access", {
          p_account_id: currentStore.account_id,
          p_email: String(form.get("email") ?? ""),
          p_account_role: accountRole,
          p_store_ids: storeIds,
          p_store_role: String(form.get("store_role") ?? "operator"),
        });
    const grantError = result.error;
    if (grantError) setError(grantError.message);
    else {
      setMessage("Acesso atualizado.");
      setShowAccessForm(false);
      setEditingUser(null);
      await loadUsers();
    }
    setSaving(false);
  }

  async function sendPasswordReset() {
    if (!supabase || !user?.email) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      user.email,
      // Precisa do subcaminho da publicação: a app não fica na raiz do domínio.
      { redirectTo: appUrl("/login/") },
    );
    if (resetError) setError(resetError.message);
    else setMessage("Link de redefinição enviado para seu e-mail.");
    setSaving(false);
  }

  return (
    <AppShell title="Configurações">
      <div className="grid gap-5 xl:grid-cols-[15rem_1fr]">
        <aside className="h-fit rounded-2xl border border-line bg-white p-2 shadow-soft">
          {tabs.map((item) => (
            <button
              onClick={() => {
                setTab(item.id);
                setError(null);
                setMessage(null);
              }}
              key={item.id}
              className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-bold ${tab === item.id ? "bg-wash-50 text-wash-800" : "text-slate-600 hover:bg-slate-50"}`}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </aside>
        <div className="min-w-0">
          {error ? <Notice tone="error">{translateError(error)}</Notice> : null}
          {message ? <Notice tone="success">{message}</Notice> : null}
          {tab === "account" ? (
            <AccountSection
              key={JSON.stringify(profile)}
              profile={profile}
              fallbackName={fullName}
              email={user?.email ?? ""}
              initials={initials}
              saving={saving}
              onSubmit={updateProfile}
            />
          ) : null}
          {tab === "preferences" ? (
            <PreferencesSection
              scope={scope}
              onScope={setScope}
              storesCount={stores.length}
            />
          ) : null}
          {tab === "stores" ? (
            <StoresSection
              stores={stores}
              currentStoreId={currentStore?.id}
              creating={creating}
              saving={saving}
              uploadingLogo={uploadingLogo}
              logoError={logoError}
              onCreateOpen={() => setCreating(true)}
              onCreateClose={() => setCreating(false)}
              onCreate={createStore}
              onSelect={selectStore}
              onLogo={uploadLogo}
            />
          ) : null}
          {tab === "users" ? (
            <UsersSection
              users={accountUsers}
              stores={stores}
              canManageAccess={accountUsers.some(
                (member) =>
                  member.user_id === user?.id &&
                  ["owner", "admin"].includes(member.account_role),
              )}
              loading={usersLoading}
              showForm={showAccessForm}
              editingUser={editingUser}
              saving={saving}
              onShowForm={() => {
                setEditingUser(null);
                setShowAccessForm(true);
              }}
              onEdit={(member) => {
                setEditingUser(member);
                setShowAccessForm(true);
              }}
              onCloseForm={() => {
                setEditingUser(null);
                setShowAccessForm(false);
              }}
              onSubmit={grantAccess}
            />
          ) : null}
          {tab === "security" ? (
            <SecuritySection
              email={user?.email ?? ""}
              saving={saving}
              onReset={sendPasswordReset}
            />
          ) : null}
          {tab === "billing" ? (
            <BillingSection
              storesCount={stores.length}
              usersCount={accountUsers.length || 1}
            />
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}

function AccountSection({
  profile,
  fallbackName,
  email,
  initials,
  saving,
  onSubmit,
}: {
  profile: Profile | null;
  fallbackName: string;
  email: string;
  initials: string;
  saving: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  // A chave no componente pai remonta esta seção quando o perfil recarrega,
  // então o estado inicial já reflete o que acabou de ser salvo.
  const [document, setDocument] = useState(() =>
    formatCPF(profile?.document ?? ""),
  );

  if (!profile) {
    return (
      <section className="grid min-h-48 place-items-center rounded-2xl border border-line bg-white shadow-soft">
        <LoaderCircle className="animate-spin text-wash-700" />
      </section>
    );
  }

  const displayName = profile.full_name || fallbackName;
  return (
    <section className="rounded-2xl border border-line bg-white shadow-soft">
      <Header
        title="Meus dados"
        detail="O nome informado aqui é o que aparece na saudação e nas telas de acesso."
      />
      <form onSubmit={onSubmit} className="p-5">
        <div className="mb-5 flex items-center gap-3">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-wash-100 font-extrabold text-wash-800">
            {initials}
          </span>
          <div className="min-w-0">
            <strong className="block truncate">{displayName}</strong>
            <p className="truncate text-sm text-slate-500">{email}</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome completo">
            <input
              name="full_name"
              defaultValue={profile.full_name || fallbackName}
              required
              className="field"
              placeholder="Seu nome"
            />
          </Field>
          {profile.extended ? (
            <Field label="CPF">
              <input
                name="document"
                value={document}
                onChange={(event) => setDocument(formatCPF(event.target.value))}
                inputMode="numeric"
                maxLength={14}
                className="field"
                placeholder="000.000.000-00"
              />
            </Field>
          ) : null}
          <Field label="Telefone">
            <input
              name="phone"
              defaultValue={profile.phone}
              className="field"
              placeholder="(00) 0000-0000"
            />
          </Field>
          {profile.extended ? (
            <>
              <Field label="WhatsApp">
                <input
                  name="whatsapp"
                  defaultValue={profile.whatsapp}
                  className="field"
                  placeholder="(00) 00000-0000"
                />
              </Field>
              <Field label="Data de nascimento">
                <input
                  name="birth_date"
                  type="date"
                  defaultValue={profile.birth_date}
                  className="field"
                />
              </Field>
            </>
          ) : null}
          <Field label="E-mail">
            <input
              name="email"
              type="email"
              defaultValue={email}
              required
              className="field"
            />
          </Field>
        </div>
        <p className="mt-3 text-sm text-slate-500">
          Trocar o e-mail exige confirmação: um link é enviado para o novo
          endereço e o acesso só muda depois que você confirmar.
        </p>
        {profile.extended ? null : (
          <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-800">
            CPF, WhatsApp e data de nascimento aparecem aqui depois que a
            migração <code>supabase/nexwash_profile_fields.sql</code> for
            aplicada no Supabase.
          </p>
        )}
        <SaveButton saving={saving}>Salvar meus dados</SaveButton>
      </form>
    </section>
  );
}

function StoresSection({
  stores,
  currentStoreId,
  creating,
  saving,
  uploadingLogo,
  logoError,
  onCreateOpen,
  onCreateClose,
  onCreate,
  onSelect,
  onLogo,
}: {
  stores: ReturnType<typeof useStore>["stores"];
  currentStoreId?: string;
  creating: boolean;
  saving: boolean;
  uploadingLogo: boolean;
  logoError: string | null;
  onCreateOpen: () => void;
  onCreateClose: () => void;
  onCreate: (event: FormEvent<HTMLFormElement>) => void;
  onSelect: (id: string) => void;
  onLogo: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-soft">
      <div className="flex flex-col justify-between gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:p-5">
        <div>
          <h2 className="text-lg font-extrabold">Suas lojas</h2>
          <p className="text-sm text-slate-500">
            Cada unidade possui operação e identidade independentes.
          </p>
        </div>
        <button
          onClick={onCreateOpen}
          className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-wash-700 px-4 text-sm font-extrabold text-white"
        >
          <Plus size={17} /> Nova loja
        </button>
      </div>
      {creating ? (
        <form
          onSubmit={onCreate}
          className="m-4 rounded-2xl border border-wash-200 bg-wash-50 p-4 sm:m-5"
        >
          <div className="flex justify-between">
            <h3 className="font-extrabold">Cadastrar nova loja</h3>
            <button type="button" onClick={onCreateClose}>
              <X size={18} />
            </button>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_6rem_auto]">
            <input
              name="name"
              required
              placeholder="Nome da loja"
              className="field"
            />
            <input name="city" placeholder="Cidade" className="field" />
            <input
              name="state"
              maxLength={2}
              placeholder="UF"
              className="field uppercase"
            />
            <SaveButton saving={saving}>Criar loja</SaveButton>
          </div>
        </form>
      ) : null}
      <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
        {stores.map((storeItem) => {
          const active = storeItem.id === currentStoreId;
          return (
            <article
              key={storeItem.id}
              className={`rounded-2xl border p-4 ${active ? "border-wash-300 bg-wash-50/60" : "border-line"}`}
            >
              <div className="flex items-start gap-3">
                {storeItem.logo_url ? (
                  <span className="grid h-16 w-24 shrink-0 place-items-center overflow-hidden rounded-xl bg-wash-950">
                    <Image
                      src={storeItem.logo_url}
                      alt={`Logo ${storeItem.name}`}
                      width={96}
                      height={64}
                      unoptimized
                      className="h-full w-full object-cover"
                    />
                  </span>
                ) : (
                  <span
                    className={`grid h-11 w-11 place-items-center rounded-xl ${active ? "bg-wash-700 text-white" : "bg-slate-100 text-slate-600"}`}
                  >
                    <Building2 size={21} />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <strong>{storeItem.name}</strong>
                  <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                    <MapPin size={12} />{" "}
                    {[storeItem.city, storeItem.state]
                      .filter(Boolean)
                      .join(" · ") || "Local não informado"}
                  </p>
                </div>
              </div>
              {active ? (
                <div className="mt-4 grid gap-2">
                  <p className="flex items-center justify-center gap-2 text-sm font-bold text-emerald-700">
                    <Check size={16} /> Loja ativa
                  </p>
                  <label className="flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-wash-200 bg-white text-sm font-bold text-wash-700">
                    <ImagePlus size={17} />{" "}
                    {uploadingLogo
                      ? "Enviando..."
                      : storeItem.logo_url
                        ? "Trocar logo"
                        : "Enviar logo"}
                    <input
                      disabled={uploadingLogo}
                      onChange={onLogo}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                    />
                  </label>
                  {logoError ? (
                    <p className="text-xs font-semibold text-rose-700">
                      {logoError}
                    </p>
                  ) : null}
                </div>
              ) : (
                <button
                  onClick={() => onSelect(storeItem.id)}
                  className="mt-4 w-full rounded-xl border border-line py-2 text-sm font-bold text-wash-700"
                >
                  Acessar esta loja
                </button>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function UsersSection({
  users,
  stores,
  canManageAccess,
  loading,
  showForm,
  editingUser,
  saving,
  onShowForm,
  onEdit,
  onCloseForm,
  onSubmit,
}: {
  users: AccountUser[];
  stores: ReturnType<typeof useStore>["stores"];
  canManageAccess: boolean;
  loading: boolean;
  showForm: boolean;
  editingUser: AccountUser | null;
  saving: boolean;
  onShowForm: () => void;
  onEdit: (member: AccountUser) => void;
  onCloseForm: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-soft">
      <div className="flex flex-col justify-between gap-3 border-b border-line p-5 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-extrabold">Usuários e acessos</h2>
          <p className="text-sm text-slate-500">
            Defina o papel e as lojas de cada usuário.
          </p>
        </div>
        {canManageAccess ? (
          <button
            onClick={onShowForm}
            className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-wash-700 px-4 text-sm font-extrabold text-white"
          >
            <Plus size={17} /> Conceder acesso
          </button>
        ) : null}
      </div>
      {showForm ? (
        <form
          key={editingUser?.user_id ?? "new-access"}
          onSubmit={onSubmit}
          className="m-4 rounded-2xl border border-wash-200 bg-wash-50 p-4 sm:m-5"
        >
          <div className="flex justify-between">
            <div>
              <h3 className="font-extrabold">
                {editingUser ? "Editar acessos" : "Conceder acesso"}
              </h3>
              <p className="text-xs text-slate-500">
                {editingUser
                  ? `Defina o acesso de ${editingUser.full_name}.`
                  : "O usuário precisa já possuir um login NexWash."}
              </p>
            </div>
            <button type="button" onClick={onCloseForm}>
              <X size={18} />
            </button>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <input
              name="email"
              required
              type="email"
              defaultValue={editingUser?.email}
              readOnly={Boolean(editingUser)}
              className="field"
              placeholder="E-mail do usuário"
            />
            <select
              name="account_role"
              defaultValue={editingUser?.account_role ?? "member"}
              className="field"
            >
              <option value="member">Membro com lojas selecionadas</option>
              <option value="admin">Administrador de todas as lojas</option>
            </select>
            {!editingUser ? (
              <select name="store_role" className="field">
                <option value="operator">Operador</option>
                <option value="manager">Gerente</option>
                <option value="finance">Financeiro</option>
                <option value="viewer">Somente leitura</option>
                <option value="admin">Administrador da loja</option>
              </select>
            ) : null}
            <div className="rounded-xl border border-line bg-white p-3">
              <p className="mb-2 text-xs font-bold text-slate-500">
                LOJAS PERMITIDAS
              </p>
              {stores.map((storeItem) => (
                <div
                  key={storeItem.id}
                  className="grid gap-2 border-t border-slate-100 py-2 first:border-0 sm:grid-cols-[1fr_10rem] sm:items-center"
                >
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="store_ids"
                      value={storeItem.id}
                      defaultChecked={editingUser?.store_ids.includes(
                        storeItem.id,
                      )}
                      className="accent-wash-700"
                    />
                    {storeItem.name}
                  </label>
                  {editingUser ? (
                    <select
                      name={`store_role_${storeItem.id}`}
                      defaultValue={
                        editingUser.store_roles[storeItem.id] ?? "operator"
                      }
                      className="field py-2 text-xs"
                    >
                      <option value="operator">Operador</option>
                      <option value="manager">Gerente</option>
                      <option value="finance">Financeiro</option>
                      <option value="viewer">Somente leitura</option>
                      <option value="admin">Admin. da loja</option>
                    </select>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
          <SaveButton saving={saving}>
            {editingUser ? "Salvar alterações" : "Conceder acesso"}
          </SaveButton>
        </form>
      ) : null}
      {loading ? (
        <div className="grid h-40 place-items-center">
          <LoaderCircle className="animate-spin text-wash-700" />
        </div>
      ) : (
        <div className="divide-y divide-line">
          {users.map((member) => (
            <article
              key={member.user_id}
              className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:p-5"
            >
              <span className="grid h-10 w-10 place-items-center rounded-full bg-wash-100 text-xs font-extrabold text-wash-800">
                {member.full_name
                  .split(" ")
                  .slice(0, 2)
                  .map((part) => part[0])
                  .join("")}
              </span>
              <div className="min-w-0 flex-1">
                <strong className="block truncate text-sm">
                  {member.full_name}
                </strong>
                <p className="truncate text-xs text-slate-500">
                  {member.email}
                </p>
              </div>
              <div className="sm:text-right">
                <p className="text-sm font-bold">
                  {member.account_role === "owner"
                    ? "Proprietário"
                    : member.account_role === "admin"
                      ? "Administrador"
                      : "Membro"}
                </p>
                <p className="text-xs text-slate-500">
                  {["owner", "admin"].includes(member.account_role)
                    ? "Todas as lojas"
                    : `${member.store_ids.length} loja(s)`}
                </p>
              </div>
              {canManageAccess && member.account_role !== "owner" ? (
                <button
                  type="button"
                  onClick={() => onEdit(member)}
                  className="flex min-h-10 items-center justify-center gap-2 rounded-xl border border-wash-200 px-3 text-sm font-bold text-wash-700"
                >
                  <Pencil size={15} /> Editar acessos
                </button>
              ) : member.account_role === "owner" ? (
                <span className="text-xs font-semibold text-slate-400">
                  Acesso protegido
                </span>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function SecuritySection({
  email,
  saving,
  onReset,
}: {
  email: string;
  saving: boolean;
  onReset: () => void;
}) {
  return (
    <section className="rounded-2xl border border-line bg-white shadow-soft">
      <Header title="Segurança" detail="Proteja o acesso à sua conta." />
      <div className="grid gap-4 p-5 lg:grid-cols-2">
        <article className="rounded-2xl border border-line p-5">
          <KeyRound className="text-wash-700" />
          <h3 className="mt-4 font-extrabold">Alterar senha</h3>
          <p className="mt-1 text-sm text-slate-500">
            Enviaremos um link seguro para {email}.
          </p>
          <button
            disabled={saving}
            onClick={onReset}
            className="mt-4 rounded-xl bg-wash-700 px-4 py-2.5 text-sm font-extrabold text-white"
          >
            Enviar link de redefinição
          </button>
        </article>
        <article className="rounded-2xl border border-line p-5">
          <ShieldCheck className="text-emerald-700" />
          <h3 className="mt-4 font-extrabold">Sessão protegida</h3>
          <p className="mt-1 text-sm text-slate-500">
            Autenticação Supabase e dados isolados por conta e loja.
          </p>
        </article>
      </div>
    </section>
  );
}
function BillingSection({
  storesCount,
  usersCount,
}: {
  storesCount: number;
  usersCount: number;
}) {
  return (
    <section className="rounded-2xl border border-line bg-white shadow-soft">
      <Header
        title="Plano e cobrança"
        detail="Resumo da estrutura ativa da conta."
      />
      <div className="grid gap-4 p-5 sm:grid-cols-3">
        <Metric label="Situação" value="Conta ativa" />
        <Metric label="Lojas" value={String(storesCount)} />
        <Metric label="Usuários" value={String(usersCount)} />
      </div>
      <p className="border-t border-line p-5 text-sm text-slate-500">
        A cobrança automática ainda não está vinculada. Nenhum cartão ou
        assinatura será criado sem uma configuração futura explícita.
      </p>
    </section>
  );
}
function PreferencesSection({
  scope,
  onScope,
  storesCount,
}: {
  scope: StoreScope;
  onScope: (scope: StoreScope) => void;
  storesCount: number;
}) {
  const version = usePreference<UiVersion>(VERSION_KEY, "next", parseVersion);

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-line bg-white shadow-soft">
        <Header
          title="Escopo dos dados"
          detail="Defina se você trabalha em uma loja por vez ou vê todas as lojas juntas."
        />
        <div className="grid gap-3 p-5 md:grid-cols-2">
          <ScopeOption
            active={scope === "single"}
            icon={Store}
            title="Uma loja por vez"
            detail="Cada página mostra apenas os dados da loja selecionada, como no acesso atual."
            onSelect={() => onScope("single")}
          />
          <ScopeOption
            active={scope === "consolidated"}
            icon={LayoutGrid}
            title="Todas as lojas consolidadas"
            detail="As páginas somam os dados de todas as lojas, com filtro por loja e etiqueta de origem em cada registro."
            onSelect={() => onScope("consolidated")}
          />
        </div>
        {scope === "consolidated" && storesCount < 2 ? (
          <p className="border-t border-line p-5 text-sm text-slate-500">
            Sua conta tem apenas uma loja, então a visão consolidada continua
            mostrando o mesmo conteúdo até você cadastrar outra loja.
          </p>
        ) : null}
      </section>

      <section className="rounded-2xl border border-line bg-white shadow-soft">
        <Header
          title="Versão da interface"
          detail="A versão atual continua disponível enquanto você se adapta à nova."
        />
        <div className="grid gap-3 p-5 md:grid-cols-2">
          <ScopeOption
            active={version === "next"}
            icon={Sparkles}
            title="Versão nova"
            detail="Interface reformulada, com visão consolidada e navegação nova."
            onSelect={() => writeVersionPreference("next")}
          />
          <ScopeOption
            active={version === "legacy"}
            icon={MonitorSmartphone}
            title="Versão atual (legado)"
            detail="Mantém a interface que sua equipe já usa. Você é levado para ela ao salvar."
            onSelect={() => {
              writeVersionPreference("legacy");
              window.location.href = legacyUrl();
            }}
          />
        </div>
      </section>
    </div>
  );
}

function ScopeOption({
  active,
  icon: Icon,
  title,
  detail,
  onSelect,
}: {
  active: boolean;
  icon: typeof Store;
  title: string;
  detail: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={`rounded-xl border p-4 text-left transition ${
        active
          ? "border-wash-400 bg-wash-50 ring-1 ring-wash-300"
          : "border-line hover:border-wash-300"
      }`}
    >
      <span className="flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-white text-wash-700 ring-1 ring-inset ring-line">
          <Icon size={18} aria-hidden />
        </span>
        <strong className="text-sm">{title}</strong>
        {active ? (
          <Check size={16} className="ml-auto text-wash-700" aria-hidden />
        ) : null}
      </span>
      <span className="mt-2 block text-sm leading-relaxed text-slate-500">
        {detail}
      </span>
    </button>
  );
}

function Header({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="border-b border-line p-5">
      <h2 className="text-lg font-extrabold">{title}</h2>
      <p className="text-sm text-slate-500">{detail}</p>
    </div>
  );
}
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700">
      {label}
      {children}
    </label>
  );
}
function SaveButton({
  saving,
  children,
}: {
  saving: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      disabled={saving}
      className="mt-4 flex min-h-11 items-center justify-center rounded-xl bg-wash-700 px-5 text-sm font-extrabold text-white disabled:opacity-60"
    >
      {saving ? <LoaderCircle size={18} className="animate-spin" /> : children}
    </button>
  );
}
function Notice({
  tone,
  children,
}: {
  tone: "error" | "success";
  children: React.ReactNode;
}) {
  return (
    <p
      className={`mb-4 rounded-xl p-4 text-sm font-semibold ${tone === "error" ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}
    >
      {children}
    </p>
  );
}
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-xl bg-slate-50 p-4">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <strong className="mt-1 block text-xl">{value}</strong>
    </article>
  );
}
function translateError(value: string) {
  if (value.includes("User must create"))
    return "O usuário precisa criar o login NexWash antes de receber acesso.";
  if (value.includes("Account admin"))
    return "Somente o proprietário ou administrador pode gerenciar acessos.";
  if (value.includes("Owner access"))
    return "O acesso do proprietário é protegido e não pode ser alterado.";
  return value;
}
