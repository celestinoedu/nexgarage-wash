-- Dados empresariais compartilhados pelas lojas de uma mesma conta.
-- Migração aditiva e idempotente.

begin;

create table if not exists public.business_profiles (
  account_id uuid primary key references public.accounts(id) on delete cascade,
  trade_name text not null default '',
  legal_name text,
  cnpj text,
  state_registration text,
  municipal_registration text,
  email text,
  phone text,
  whatsapp text,
  website text,
  address_line text,
  address_number text,
  address_complement text,
  district text,
  city text,
  state text,
  postal_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists business_profiles_updated_at on public.business_profiles;
create trigger business_profiles_updated_at
before update on public.business_profiles
for each row execute function public.set_updated_at();

alter table public.business_profiles enable row level security;

drop policy if exists business_profiles_select on public.business_profiles;
create policy business_profiles_select on public.business_profiles
for select to authenticated using (public.is_account_member(account_id));

drop policy if exists business_profiles_insert on public.business_profiles;
create policy business_profiles_insert on public.business_profiles
for insert to authenticated with check (public.is_account_admin(account_id));

drop policy if exists business_profiles_update on public.business_profiles;
create policy business_profiles_update on public.business_profiles
for update to authenticated using (public.is_account_admin(account_id))
with check (public.is_account_admin(account_id));

grant select, insert, update on public.business_profiles to authenticated;

insert into public.business_profiles (account_id, trade_name)
select id, 'TOP LINE HIGIENIZAÇÕES'
from public.accounts
where id = '22b379de-4893-4b89-bf00-4949adfe6881'::uuid
on conflict (account_id) do update
set trade_name = excluded.trade_name;

notify pgrst, 'reload schema';

commit;
