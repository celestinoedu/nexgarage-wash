-- NexWash v2 — operações atômicas usadas pelo aplicativo.
-- Seguro para reaplicação: substitui a função e só adiciona serviços ausentes.

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
  if p_partner_id is not null and not exists (select 1 from public.partners p where p.id = p_partner_id and p.store_id = p_store_id) then
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
    p_employee_id, p_scheduled_at, calculated_subtotal, greatest(coalesce(p_discount, 0), 0), nullif(trim(p_notes), '')
  ) returning * into new_order;

  insert into public.service_order_items (store_id, order_id, service_id, description, quantity, unit_price)
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

create or replace function public.register_order_payment(p_order_id uuid, p_payment_method text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_order public.service_orders;
begin
  select so.* into target_order
  from public.service_orders so
  where so.id = p_order_id
  for update;

  if target_order.id is null or not public.can_manage_finance(target_order.store_id) then
    raise exception 'Finance access denied';
  end if;
  if target_order.payment_status = 'paid' then return; end if;

  update public.service_orders
  set payment_status = 'paid', payment_method = nullif(trim(p_payment_method), ''), updated_at = now()
  where service_orders.id = p_order_id;

  if not exists (
    select 1 from public.financial_transactions ft
    where ft.order_id = p_order_id and ft.kind = 'income' and ft.paid_at is not null
  ) then
    insert into public.financial_transactions (
      store_id, order_id, kind, category, description, amount, due_date, paid_at, payment_method
    ) values (
      target_order.store_id, target_order.id, 'income', 'Atendimentos',
      'Atendimento AT-' || lpad(target_order.order_number::text, 4, '0'),
      target_order.total, current_date, now(), nullif(trim(p_payment_method), '')
    );
  end if;
end;
$$;

grant execute on function public.register_order_payment(uuid, text) to authenticated;

create or replace function public.create_store_for_account(
  p_account_id uuid,
  p_store_name text,
  p_city text default null,
  p_state text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_store_id uuid;
  base_slug text;
  candidate_slug text;
  suffix integer := 1;
begin
  if auth.uid() is null or not public.is_account_admin(p_account_id) then
    raise exception 'Account admin access required';
  end if;
  if nullif(trim(p_store_name), '') is null then raise exception 'Store name is required'; end if;

  base_slug := trim(both '-' from regexp_replace(lower(trim(p_store_name)), '[^a-z0-9]+', '-', 'g'));
  if base_slug = '' then base_slug := 'loja'; end if;
  candidate_slug := base_slug;
  while exists (select 1 from public.stores s where s.account_id = p_account_id and s.slug = candidate_slug) loop
    suffix := suffix + 1;
    candidate_slug := base_slug || '-' || suffix::text;
  end loop;

  insert into public.stores (account_id, name, slug, city, state)
  values (p_account_id, trim(p_store_name), candidate_slug, nullif(trim(p_city), ''), upper(nullif(trim(p_state), '')))
  returning stores.id into new_store_id;

  insert into public.store_memberships (store_id, user_id, role)
  values (new_store_id, auth.uid(), 'admin');
  insert into public.store_settings (store_id) values (new_store_id);

  insert into public.services (store_id, name, category, description, base_price, estimated_minutes)
  values
    (new_store_id, 'Lavagem simples', 'Lavagem', 'Lavagem externa e acabamento básico', 55, 35),
    (new_store_id, 'Lavagem completa', 'Lavagem', 'Lavagem externa e limpeza interna', 85, 55),
    (new_store_id, 'Lavagem detalhada', 'Detalhamento', 'Limpeza detalhada externa e interna', 140, 90),
    (new_store_id, 'Higienização interna', 'Higienização', 'Higienização profunda do interior', 320, 180),
    (new_store_id, 'Polimento técnico', 'Estética', 'Correção e acabamento da pintura', 480, 240),
    (new_store_id, 'Cristalização de vidros', 'Proteção', 'Proteção e repelência para os vidros', 120, 60);

  return new_store_id;
end;
$$;

grant execute on function public.create_store_for_account(uuid, text, text, text) to authenticated;

with catalog(name, category, description, base_price, estimated_minutes) as (
  values
    ('Lavagem simples', 'Lavagem', 'Lavagem externa e acabamento básico', 55.00::numeric, 35),
    ('Lavagem completa', 'Lavagem', 'Lavagem externa e limpeza interna', 85.00::numeric, 55),
    ('Lavagem detalhada', 'Detalhamento', 'Limpeza detalhada externa e interna', 140.00::numeric, 90),
    ('Higienização interna', 'Higienização', 'Higienização profunda do interior', 320.00::numeric, 180),
    ('Polimento técnico', 'Estética', 'Correção e acabamento da pintura', 480.00::numeric, 240),
    ('Cristalização de vidros', 'Proteção', 'Proteção e repelência para os vidros', 120.00::numeric, 60)
)
insert into public.services (store_id, name, category, description, base_price, estimated_minutes)
select s.id, c.name, c.category, c.description, c.base_price, c.estimated_minutes
from public.stores s cross join catalog c
where s.active
  and not exists (
    select 1 from public.services existing
    where existing.store_id = s.id and lower(trim(existing.name)) = lower(c.name)
  );
