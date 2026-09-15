-- NexWash v2 — parceiros pertencem à conta e podem ser usados por todas as lojas.
-- Migração aditiva e segura para a estrutura multiloja já em produção.

begin;

alter table public.partners
  add column if not exists account_id uuid references public.accounts(id) on delete cascade;

update public.partners p
set account_id = s.account_id
from public.stores s
where s.id = p.store_id
  and p.account_id is null;

do $$
begin
  if exists (select 1 from public.partners where account_id is null) then
    raise exception 'Existem parceiros sem uma conta válida; migração cancelada';
  end if;
end;
$$;

alter table public.partners alter column account_id set not null;
alter table public.partners alter column store_id drop not null;
alter table public.partners drop constraint if exists partners_store_id_fkey;
alter table public.partners
  add constraint partners_store_id_fkey
  foreign key (store_id) references public.stores(id) on delete set null;

create index if not exists idx_partners_account_name
  on public.partners(account_id, name);

create or replace function public.lock_account_id()
returns trigger
language plpgsql set search_path = public as $$
begin
  new.account_id = old.account_id;
  return new;
end;
$$;

drop trigger if exists partners_lock_account on public.partners;
create trigger partners_lock_account
  before update of account_id on public.partners
  for each row execute function public.lock_account_id();

create or replace function public.can_operate_account(target_account uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_account_admin(target_account) or exists(
    select 1
    from public.stores s
    join public.store_memberships sm on sm.store_id = s.id
    where s.account_id = target_account
      and s.active
      and sm.user_id = auth.uid()
      and sm.active
      and sm.role in ('admin', 'manager', 'operator')
  );
$$;

drop policy if exists partners_select on public.partners;
drop policy if exists partners_insert on public.partners;
drop policy if exists partners_update on public.partners;
drop policy if exists partners_delete on public.partners;

create policy partners_select on public.partners
  for select using (public.is_account_member(account_id));
create policy partners_insert on public.partners
  for insert with check (public.can_operate_account(account_id));
create policy partners_update on public.partners
  for update using (public.can_operate_account(account_id))
  with check (public.can_operate_account(account_id));
create policy partners_delete on public.partners
  for delete using (public.is_account_admin(account_id));

grant execute on function public.can_operate_account(uuid) to authenticated;

create or replace function public.create_service_order(
  p_store_id uuid,
  p_kind text default 'walk_in',
  p_customer_id uuid default null,
  p_vehicle_id uuid default null,
  p_partner_id uuid default null,
  p_employee_id uuid default null,
  p_scheduled_at timestamptz default null,
  p_discount numeric default 0,
  p_notes text default null,
  p_items jsonb default '[]'::jsonb
)
returns table (id uuid, order_number bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  new_order public.service_orders;
  calculated_subtotal numeric(12,2);
begin
  if auth.uid() is null or not public.can_operate_store(p_store_id) then
    raise exception 'Store access denied';
  end if;
  if p_kind not in ('walk_in', 'scheduled', 'partner') then
    raise exception 'Invalid order kind';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'At least one service is required';
  end if;
  if p_customer_id is not null and not exists (select 1 from public.customers c where c.id = p_customer_id and c.store_id = p_store_id) then
    raise exception 'Invalid customer';
  end if;
  if p_vehicle_id is not null and not exists (select 1 from public.vehicles v where v.id = p_vehicle_id and v.store_id = p_store_id) then
    raise exception 'Invalid vehicle';
  end if;
  if p_partner_id is not null and not exists (
    select 1
    from public.partners p
    join public.stores s on s.id = p_store_id
    where p.id = p_partner_id and p.account_id = s.account_id
  ) then
    raise exception 'Invalid partner';
  end if;
  if p_employee_id is not null and not exists (select 1 from public.employees e where e.id = p_employee_id and e.store_id = p_store_id) then
    raise exception 'Invalid employee';
  end if;
  if p_kind = 'partner' and p_partner_id is null then
    raise exception 'Partner is required';
  end if;

  select coalesce(sum(
    greatest(coalesce((item->>'quantity')::numeric, 1), 0.01) *
    greatest(coalesce((item->>'unit_price')::numeric, 0), 0)
  ), 0)
  into calculated_subtotal
  from jsonb_array_elements(p_items) item;

  insert into public.service_orders (
    store_id, kind, customer_id, vehicle_id, partner_id, assigned_employee_id,
    scheduled_at, subtotal, discount, notes
  ) values (
    p_store_id, p_kind::public.order_kind, p_customer_id, p_vehicle_id, p_partner_id,
    p_employee_id, p_scheduled_at, calculated_subtotal,
    greatest(coalesce(p_discount, 0), 0), nullif(trim(p_notes), '')
  ) returning * into new_order;

  insert into public.service_order_items
    (store_id, order_id, service_id, description, quantity, unit_price)
  select
    p_store_id,
    new_order.id,
    nullif(item->>'service_id', '')::uuid,
    trim(item->>'description'),
    greatest(coalesce((item->>'quantity')::numeric, 1), 0.01),
    greatest(coalesce((item->>'unit_price')::numeric, 0), 0)
  from jsonb_array_elements(p_items) item
  where nullif(trim(item->>'description'), '') is not null;

  if not exists (select 1 from public.service_order_items where order_id = new_order.id) then
    raise exception 'At least one valid service is required';
  end if;

  return query select new_order.id, new_order.order_number;
end;
$$;

grant execute on function public.create_service_order(uuid, text, uuid, uuid, uuid, uuid, timestamptz, numeric, text, jsonb) to authenticated;

commit;
