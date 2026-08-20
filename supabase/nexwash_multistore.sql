-- NexWash v2 — fundação multiloja
-- Execute em um projeto Supabase exclusivo do NexWash.
-- Não execute no projeto de produção do NexLab.

create extension if not exists pgcrypto;

create type public.account_role as enum ('owner', 'admin', 'member');
create type public.store_role as enum ('admin', 'manager', 'operator', 'finance', 'viewer');
create type public.order_kind as enum ('walk_in', 'scheduled', 'partner');
create type public.order_status as enum ('waiting', 'washing', 'finishing', 'ready', 'delivered', 'cancelled');
create type public.payment_status as enum ('pending', 'partial', 'paid', 'cancelled');
create type public.finance_kind as enum ('income', 'expense');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_user_id uuid not null references auth.users(id),
  plan text not null default 'trial',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.account_memberships (
  account_id uuid not null references public.accounts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.account_role not null default 'member',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (account_id, user_id)
);

create table public.stores (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  name text not null,
  slug text not null,
  document text,
  phone text,
  whatsapp text,
  email text,
  address_line text,
  city text,
  state text,
  postal_code text,
  logo_url text,
  timezone text not null default 'America/Sao_Paulo',
  active boolean not null default true,
  next_order_number bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (account_id, slug)
);

create table public.store_memberships (
  store_id uuid not null references public.stores(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.store_role not null default 'operator',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (store_id, user_id)
);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  email text not null,
  account_role public.account_role not null default 'member',
  store_ids uuid[] not null default '{}',
  store_role public.store_role not null default 'operator',
  invited_by uuid not null references auth.users(id),
  token_hash text not null unique,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null,
  phone text,
  whatsapp text,
  email text,
  document text,
  legacy_segment boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  plate text not null,
  make text,
  model text,
  color text,
  size text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.partners (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null,
  document text,
  contact_name text,
  phone text,
  email text,
  billing_day smallint check (billing_day between 1 and 31),
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.employees (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null,
  phone text,
  role_name text,
  commission_percent numeric(5,2) not null default 0 check (commission_percent between 0 and 100),
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null,
  category text,
  description text,
  base_price numeric(12,2) not null default 0 check (base_price >= 0),
  estimated_minutes integer check (estimated_minutes > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.service_orders (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  order_number bigint,
  kind public.order_kind not null default 'walk_in',
  customer_id uuid references public.customers(id),
  vehicle_id uuid references public.vehicles(id),
  partner_id uuid references public.partners(id),
  assigned_employee_id uuid references public.employees(id),
  status public.order_status not null default 'waiting',
  payment_status public.payment_status not null default 'pending',
  payment_method text,
  scheduled_at timestamptz,
  started_at timestamptz,
  finished_at timestamptz,
  delivered_at timestamptz,
  subtotal numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  total numeric(12,2) generated always as (greatest(subtotal - discount, 0)) stored,
  legacy_segment_snapshot boolean not null default false,
  notes text,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, order_number),
  check ((kind = 'partner' and partner_id is not null) or kind <> 'partner')
);

create table public.service_order_items (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  order_id uuid not null references public.service_orders(id) on delete cascade,
  service_id uuid references public.services(id),
  description text not null,
  quantity numeric(10,2) not null default 1 check (quantity > 0),
  unit_price numeric(12,2) not null default 0 check (unit_price >= 0),
  total numeric(12,2) generated always as (quantity * unit_price) stored,
  created_at timestamptz not null default now()
);

create table public.financial_transactions (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  order_id uuid references public.service_orders(id) on delete set null,
  partner_id uuid references public.partners(id) on delete set null,
  kind public.finance_kind not null,
  category text not null,
  description text not null,
  amount numeric(12,2) not null check (amount >= 0),
  due_date date not null,
  paid_at timestamptz,
  payment_method text,
  notes text,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  work_date date not null,
  status text not null check (status in ('present', 'absent', 'day_off')),
  checked_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  unique (store_id, employee_id, work_date)
);

create table public.employee_movements (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  kind text not null check (kind in ('advance', 'payment', 'commission', 'adjustment')),
  amount numeric(12,2) not null check (amount >= 0),
  movement_date date not null default current_date,
  description text,
  created_at timestamptz not null default now()
);

create table public.store_settings (
  store_id uuid primary key references public.stores(id) on delete cascade,
  opportunity_days integer not null default 15 check (opportunity_days > 0),
  profit_split_enabled boolean not null default false,
  profit_split_rules jsonb not null default '{}'::jsonb,
  business_hours jsonb not null default '{}'::jsonb,
  receipt_footer text,
  updated_at timestamptz not null default now()
);

create index idx_stores_account on public.stores(account_id);
create index idx_account_memberships_user on public.account_memberships(user_id) where active;
create index idx_store_memberships_user on public.store_memberships(user_id) where active;
create index idx_customers_store_name on public.customers(store_id, name);
create index idx_vehicles_store_plate on public.vehicles(store_id, plate);
create unique index idx_vehicles_store_real_plate_unique
  on public.vehicles(store_id, upper(trim(plate)))
  where nullif(trim(plate), '') is not null and upper(trim(plate)) <> 'XXX';
create index idx_orders_store_created on public.service_orders(store_id, created_at desc);
create index idx_orders_store_status on public.service_orders(store_id, status);
create index idx_finance_store_due on public.financial_transactions(store_id, due_date desc);

create function public.set_updated_at() returns trigger
language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end;
$$;

create function public.lock_tenant_id() returns trigger
language plpgsql set search_path = public as $$
begin new.store_id = old.store_id; return new; end;
$$;

create function public.is_account_member(target_account uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from account_memberships where account_id = target_account and user_id = auth.uid() and active);
$$;

create function public.is_account_admin(target_account uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from account_memberships where account_id = target_account and user_id = auth.uid() and active and role in ('owner', 'admin'));
$$;

create function public.has_store_access(target_store uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from stores s
    where s.id = target_store and s.active and (
      exists(select 1 from account_memberships am where am.account_id = s.account_id and am.user_id = auth.uid() and am.active and am.role in ('owner', 'admin'))
      or exists(select 1 from store_memberships sm where sm.store_id = s.id and sm.user_id = auth.uid() and sm.active)
    )
  );
$$;

create function public.can_manage_store(target_store uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from stores s where s.id = target_store and (
      is_account_admin(s.account_id)
      or exists(select 1 from store_memberships sm where sm.store_id = s.id and sm.user_id = auth.uid() and sm.active and sm.role in ('admin', 'manager'))
    )
  );
$$;

create function public.can_operate_store(target_store uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from stores s where s.id = target_store and (
      is_account_admin(s.account_id)
      or exists(select 1 from store_memberships sm where sm.store_id = s.id and sm.user_id = auth.uid() and sm.active and sm.role in ('admin', 'manager', 'operator'))
    )
  );
$$;

create function public.can_manage_finance(target_store uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from stores s where s.id = target_store and (
      is_account_admin(s.account_id)
      or exists(select 1 from store_memberships sm where sm.store_id = s.id and sm.user_id = auth.uid() and sm.active and sm.role in ('admin', 'manager', 'finance'))
    )
  );
$$;

create function public.create_account_with_store(account_name text, store_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare new_account_id uuid; new_store_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  insert into accounts(name, owner_user_id) values (trim(account_name), auth.uid()) returning id into new_account_id;
  insert into account_memberships(account_id, user_id, role) values (new_account_id, auth.uid(), 'owner');
  insert into stores(account_id, name, slug) values (new_account_id, trim(store_name), 'principal') returning id into new_store_id;
  insert into store_memberships(store_id, user_id, role) values (new_store_id, auth.uid(), 'admin');
  insert into store_settings(store_id) values (new_store_id);
  return new_store_id;
end;
$$;

create function public.assign_order_number() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- auth.uid() é nulo em migrações administrativas via conexão Postgres.
  -- Usuários do app sempre passam pela checagem de acesso da loja.
  if auth.uid() is not null and not has_store_access(new.store_id) then raise exception 'Store access denied'; end if;
  if new.order_number is null then
    update stores set next_order_number = next_order_number + 1 where id = new.store_id returning next_order_number - 1 into new.order_number;
  end if;
  return new;
end;
$$;

create function public.sync_order_item_store() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  select store_id into new.store_id from service_orders where id = new.order_id;
  if new.store_id is null then raise exception 'Invalid service order'; end if;
  return new;
end;
$$;

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles(id, full_name) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email)) on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
create trigger service_orders_number before insert on public.service_orders for each row execute function public.assign_order_number();
create trigger service_order_items_store before insert or update of order_id on public.service_order_items for each row execute function public.sync_order_item_store();

do $$
declare table_name text;
begin
  foreach table_name in array array['profiles','accounts','stores','customers','vehicles','partners','employees','services','service_orders','financial_transactions'] loop
    execute format('create trigger %I_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name, table_name);
  end loop;
  foreach table_name in array array['customers','vehicles','partners','employees','services','service_orders','service_order_items','financial_transactions','attendance','employee_movements'] loop
    execute format('create trigger %I_lock_store before update on public.%I for each row execute function public.lock_tenant_id()', table_name, table_name);
  end loop;
end $$;

alter table public.profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.account_memberships enable row level security;
alter table public.stores enable row level security;
alter table public.store_memberships enable row level security;
alter table public.invitations enable row level security;
alter table public.customers enable row level security;
alter table public.vehicles enable row level security;
alter table public.partners enable row level security;
alter table public.employees enable row level security;
alter table public.services enable row level security;
alter table public.service_orders enable row level security;
alter table public.service_order_items enable row level security;
alter table public.financial_transactions enable row level security;
alter table public.attendance enable row level security;
alter table public.employee_movements enable row level security;
alter table public.store_settings enable row level security;

create policy profiles_select_self on public.profiles for select using (id = auth.uid());
create policy profiles_update_self on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy accounts_select_member on public.accounts for select using (is_account_member(id));
create policy accounts_update_admin on public.accounts for update using (is_account_admin(id)) with check (is_account_admin(id));
create policy account_memberships_select on public.account_memberships for select using (user_id = auth.uid() or is_account_admin(account_id));
create policy account_memberships_manage on public.account_memberships for all using (is_account_admin(account_id)) with check (is_account_admin(account_id));
create policy stores_select_access on public.stores for select using (has_store_access(id));
create policy stores_insert_admin on public.stores for insert with check (is_account_admin(account_id));
create policy stores_update_admin on public.stores for update using (is_account_admin(account_id)) with check (is_account_admin(account_id));
create policy store_memberships_select on public.store_memberships for select using (user_id = auth.uid() or can_manage_store(store_id));
create policy store_memberships_manage on public.store_memberships for all using (can_manage_store(store_id)) with check (can_manage_store(store_id));
create policy invitations_manage on public.invitations for all using (is_account_admin(account_id)) with check (is_account_admin(account_id));
create policy store_settings_select on public.store_settings for select using (has_store_access(store_id));
create policy store_settings_manage on public.store_settings for all using (can_manage_store(store_id)) with check (can_manage_store(store_id));

do $$
declare table_name text;
begin
  foreach table_name in array array['customers','vehicles','partners','employees','services','service_orders','service_order_items','attendance','employee_movements'] loop
    execute format('create policy %I_select on public.%I for select using (has_store_access(store_id))', table_name, table_name);
    execute format('create policy %I_insert on public.%I for insert with check (can_operate_store(store_id))', table_name, table_name);
    execute format('create policy %I_update on public.%I for update using (can_operate_store(store_id)) with check (can_operate_store(store_id))', table_name, table_name);
    execute format('create policy %I_delete on public.%I for delete using (can_manage_store(store_id))', table_name, table_name);
  end loop;
end $$;

create policy financial_transactions_select on public.financial_transactions for select using (has_store_access(store_id));
create policy financial_transactions_insert on public.financial_transactions for insert with check (can_manage_finance(store_id));
create policy financial_transactions_update on public.financial_transactions for update using (can_manage_finance(store_id)) with check (can_manage_finance(store_id));
create policy financial_transactions_delete on public.financial_transactions for delete using (can_manage_store(store_id));

grant execute on function public.create_account_with_store(text, text) to authenticated;
grant execute on function public.is_account_member(uuid) to authenticated;
grant execute on function public.is_account_admin(uuid) to authenticated;
grant execute on function public.has_store_access(uuid) to authenticated;
grant execute on function public.can_manage_store(uuid) to authenticated;
grant execute on function public.can_operate_store(uuid) to authenticated;
grant execute on function public.can_manage_finance(uuid) to authenticated;

-- Oportunidades: última visita por cliente, respeitando a loja ativa via RLS.
create view public.customer_return_opportunities with (security_invoker = true) as
select
  c.id as customer_id,
  c.store_id,
  c.name,
  c.whatsapp,
  max(so.delivered_at)::date as last_visit,
  current_date - max(so.delivered_at)::date as days_since_last_visit
from public.customers c
join public.service_orders so on so.customer_id = c.id and so.status = 'delivered'
group by c.id, c.store_id, c.name, c.whatsapp;
