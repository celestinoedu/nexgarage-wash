-- NexWash — cópia aditiva do legado para a estrutura multiloja.
-- Pré-requisito: executar nexwash_multistore.sql no mesmo banco.
-- Este arquivo NÃO altera nem remove linhas das tabelas legadas.

begin;

create temporary table nexwash_migration_context (
  account_id uuid not null,
  store_id uuid not null,
  owner_user_id uuid not null
) on commit drop;

do $$
declare
  v_owner uuid;
  v_account uuid := gen_random_uuid();
  v_store uuid := gen_random_uuid();
begin
  if exists (select 1 from public.accounts) then
    raise exception 'Migração interrompida: a estrutura NexWash já possui uma conta';
  end if;

  select id into v_owner from auth.users order by created_at, id limit 1;
  if v_owner is null then
    raise exception 'Migração interrompida: nenhum usuário encontrado em auth.users';
  end if;

  insert into public.accounts(id, name, owner_user_id, plan)
  values (v_account, 'Top Line Higienizações', v_owner, 'pro');

  insert into public.stores(id, account_id, name, slug, active, next_order_number)
  values (v_store, v_account, 'Top Line Higienizações', 'top-line-higienizacoes', true, 1);

  insert into public.store_settings(
    store_id,
    opportunity_days,
    profit_split_enabled,
    profit_split_rules
  ) values (
    v_store,
    15,
    true,
    '{"legacy_base":{"rennan":40,"yuri":60},"default":{"rennan":50,"yuri":50}}'::jsonb
  );

  insert into nexwash_migration_context values (v_account, v_store, v_owner);
end $$;

insert into public.profiles(id, full_name, created_at, updated_at)
select
  u.id,
  coalesce(nullif(u.raw_user_meta_data->>'full_name', ''), split_part(u.email, '@', 1), 'Usuário'),
  coalesce(u.created_at, now()),
  now()
from auth.users u
on conflict (id) do update set full_name = excluded.full_name, updated_at = now();

insert into public.account_memberships(account_id, user_id, role, active)
select
  ctx.account_id,
  u.id,
  case when u.id = ctx.owner_user_id then 'owner'::public.account_role else 'admin'::public.account_role end,
  true
from auth.users u
cross join nexwash_migration_context ctx;

insert into public.store_memberships(store_id, user_id, role, active)
select ctx.store_id, u.id, 'admin'::public.store_role, true
from auth.users u
cross join nexwash_migration_context ctx;

insert into public.customers(
  id, store_id, name, phone, whatsapp, legacy_segment, notes, created_at, updated_at
)
select
  c.id,
  ctx.store_id,
  c.nome,
  c.telefone,
  c.telefone,
  coalesce(c.base_antiga, false),
  concat_ws(E'\n', nullif(c.observacoes, ''), case when c.origem is not null then 'Origem legada: ' || c.origem end),
  coalesce(c.created_at, now()),
  now()
from public.clientes c
cross join nexwash_migration_context ctx;

insert into public.vehicles(
  id, store_id, customer_id, plate, model, color, notes, created_at, updated_at
)
select
  c.id,
  ctx.store_id,
  c.cliente_id,
  upper(c.placa),
  c.veiculo,
  c.cor,
  concat_ws(E'\n', nullif(c.observacoes, ''), case when c.ano is not null then 'Ano: ' || c.ano::text end),
  coalesce(c.created_at, now()),
  now()
from public.carros c
cross join nexwash_migration_context ctx;

insert into public.partners(
  id, store_id, name, phone, active, notes, created_at, updated_at
)
select
  p.id,
  ctx.store_id,
  p.nome,
  p.telefone,
  coalesce(p.ativo, true),
  concat_ws(E'\n', nullif(p.observacoes, ''), case when p.base_antiga then 'Parceiro da base antiga' end),
  coalesce(p.created_at, now()),
  now()
from public.parceiros p
cross join nexwash_migration_context ctx;

insert into public.employees(
  id, store_id, name, phone, role_name, active, created_at, updated_at
)
select
  f.id,
  ctx.store_id,
  f.nome,
  f.telefone,
  'Colaborador',
  coalesce(f.ativo, true),
  coalesce(f.created_at, now()),
  now()
from public.funcionarios f
cross join nexwash_migration_context ctx;

insert into public.services(
  id, store_id, name, category, base_price, active, created_at, updated_at
)
select
  s.id,
  ctx.store_id,
  s.nome,
  'Legado',
  coalesce(s.preco_base, 0),
  coalesce(s.ativo, true),
  coalesce(s.created_at, now()),
  now()
from public.servicos s
cross join nexwash_migration_context ctx;

with legacy_orders as (
  select
    a.*,
    nullif(regexp_replace(coalesce(a.os_numero, ''), '\D', '', 'g'), '')::bigint as legacy_number,
    row_number() over (
      partition by nullif(regexp_replace(coalesce(a.os_numero, ''), '\D', '', 'g'), '')::bigint
      order by a.created_at, a.id
    ) as duplicate_rank
  from public.atendimentos a
), numbered as (
  select
    lo.*,
    max(legacy_number) over () as max_legacy_number,
    count(*) filter (where duplicate_rank > 1) over (
      order by created_at, id rows between unbounded preceding and current row
    ) as duplicate_sequence
  from legacy_orders lo
)
insert into public.service_orders(
  id, store_id, order_number, kind, customer_id, vehicle_id, partner_id,
  status, payment_status, payment_method, started_at, finished_at, delivered_at,
  subtotal, discount, legacy_segment_snapshot, notes, created_by, created_at, updated_at
)
select
  n.id,
  ctx.store_id,
  case when n.duplicate_rank = 1 then n.legacy_number else n.max_legacy_number + n.duplicate_sequence end,
  case when n.tipo = 'PARCEIRO' then 'partner'::public.order_kind else 'walk_in'::public.order_kind end,
  n.cliente_id,
  n.carro_id,
  n.parceiro_id,
  'delivered'::public.order_status,
  case when n.status_pg = 'PAGO' then 'paid'::public.payment_status else 'pending'::public.payment_status end,
  n.forma_pgto,
  n.data::timestamptz,
  n.data::timestamptz,
  n.data::timestamptz,
  coalesce(n.valor, 0) + coalesce(n.desconto, 0),
  coalesce(n.desconto, 0),
  coalesce(n.base_antiga, false),
  concat_ws(E'\n', nullif(n.observacoes, ''), 'Referência legada: ' || coalesce(n.os_numero, n.id::text), case when n.veiculo is not null or n.placa is not null then 'Veículo legado: ' || concat_ws(' · ', n.veiculo, n.placa) end),
  ctx.owner_user_id,
  coalesce(n.created_at, n.data::timestamptz),
  now()
from numbered n
cross join nexwash_migration_context ctx;

insert into public.service_order_items(
  store_id, order_id, description, quantity, unit_price, created_at
)
select
  ctx.store_id,
  a.id,
  coalesce(nullif(item->>'nome', ''), 'Serviço legado'),
  1,
  greatest(coalesce((item->>'valor')::numeric, 0) - coalesce((item->>'desconto')::numeric, 0), 0),
  coalesce(a.created_at, a.data::timestamptz)
from public.atendimentos a
cross join lateral jsonb_array_elements(a.itens_servicos) item
cross join nexwash_migration_context ctx;

-- Atendimentos antigos sem itens JSON recebem um item textual para preservar
-- a descrição original. O total autoritativo continua em service_orders.total.
insert into public.service_order_items(
  store_id, order_id, description, quantity, unit_price, created_at
)
select
  ctx.store_id,
  a.id,
  coalesce(nullif(a.servicos, ''), 'Serviço legado'),
  1,
  coalesce(a.valor, 0),
  coalesce(a.created_at, a.data::timestamptz)
from public.atendimentos a
cross join nexwash_migration_context ctx
where jsonb_array_length(a.itens_servicos) = 0;

insert into public.financial_transactions(
  id, store_id, order_id, kind, category, description, amount, due_date,
  paid_at, payment_method, notes, created_by, created_at, updated_at
)
select
  f.id,
  ctx.store_id,
  f.atendimento_id,
  case when f.tipo = 'ENTRADA' then 'income'::public.finance_kind else 'expense'::public.finance_kind end,
  case when f.tipo = 'ENTRADA' then 'Atendimento' else 'Despesa legada' end,
  f.descricao,
  coalesce(f.valor, 0),
  f.data,
  case when f.tipo = 'ENTRADA' then f.data::timestamptz end,
  f.forma_pgto,
  concat_ws(E'\n', nullif(f.observacoes, ''), case when f.base_antiga then 'Base antiga' end),
  ctx.owner_user_id,
  coalesce(f.created_at, f.data::timestamptz),
  now()
from public.financeiro f
cross join nexwash_migration_context ctx;

insert into public.attendance(
  id, store_id, employee_id, work_date, status, checked_at, notes, created_at
)
select
  p.id,
  ctx.store_id,
  p.funcionario_id,
  p.data,
  case when p.status = 'PRESENTE' then 'present' when p.status = 'FALTA' then 'absent' else 'day_off' end,
  case when p.hora is not null then p.data + p.hora end,
  p.observacoes,
  coalesce(p.created_at, p.data::timestamptz)
from public.presenca p
cross join nexwash_migration_context ctx;

insert into public.employee_movements(
  id, store_id, employee_id, kind, amount, movement_date, description, created_at
)
select
  m.id,
  ctx.store_id,
  m.funcionario_id,
  case when lower(m.tipo) = 'vale' then 'advance' else 'payment' end,
  coalesce(m.valor, 0),
  m.data,
  concat_ws(E'\n', nullif(m.observacao, ''), m.funcionario_nome),
  coalesce(m.created_at, m.data::timestamptz)
from public.colaborador_movimentos m
cross join nexwash_migration_context ctx;

insert into public.employee_movements(
  id, store_id, employee_id, kind, amount, movement_date, description, created_at
)
select
  v.id,
  ctx.store_id,
  v.funcionario_id,
  'advance',
  coalesce(v.valor, 0),
  v.data,
  v.descricao,
  coalesce(v.created_at, v.data::timestamptz)
from public.vales v
cross join nexwash_migration_context ctx
on conflict (id) do nothing;

-- Sincroniza o contador antes de inserir agendamentos, que não possuem número
-- legado e usam o trigger automático da loja.
update public.stores s
set next_order_number = q.next_number
from (
  select store_id, max(order_number) + 1 as next_number
  from public.service_orders
  group by store_id
) q
where s.id = q.store_id;

-- Um agendamento legado ainda aberto é preservado como atendimento agendado.
insert into public.service_orders(
  store_id, kind, customer_id, vehicle_id, status, payment_status, scheduled_at,
  subtotal, notes, created_by, created_at, updated_at
)
select
  ctx.store_id,
  'scheduled',
  a.cliente_id,
  a.carro_id,
  case when upper(a.status) in ('CONCLUIDO', 'CONCLUÍDO', 'FINALIZADO') then 'delivered'::public.order_status else 'waiting'::public.order_status end,
  'pending',
  a.data + a.hora,
  0,
  concat_ws(E'\n', 'Agendamento legado: ' || a.servicos, nullif(a.observacoes, ''), 'ID legado: ' || a.id::text),
  ctx.owner_user_id,
  coalesce(a.created_at, a.data + a.hora),
  now()
from public.agenda_lavagens a
cross join nexwash_migration_context ctx;

update public.stores s
set next_order_number = q.next_number
from (
  select store_id, max(order_number) + 1 as next_number
  from public.service_orders
  group by store_id
) q
where s.id = q.store_id;

-- Gates de reconciliação: qualquer divergência aborta toda a transação.
do $$
declare
  v_store uuid := (select store_id from nexwash_migration_context);
begin
  if (select count(*) from public.customers where store_id = v_store) <> (select count(*) from public.clientes) then raise exception 'Divergência em clientes'; end if;
  if (select count(*) from public.vehicles where store_id = v_store) <> (select count(*) from public.carros) then raise exception 'Divergência em veículos'; end if;
  if (select count(*) from public.partners where store_id = v_store) <> (select count(*) from public.parceiros) then raise exception 'Divergência em parceiros'; end if;
  if (select count(*) from public.employees where store_id = v_store) <> (select count(*) from public.funcionarios) then raise exception 'Divergência em funcionários'; end if;
  if (select count(*) from public.service_orders where store_id = v_store) <> (select count(*) from public.atendimentos) + (select count(*) from public.agenda_lavagens) then raise exception 'Divergência em atendimentos'; end if;
  if (select count(*) from public.financial_transactions where store_id = v_store) <> (select count(*) from public.financeiro) then raise exception 'Divergência no financeiro'; end if;
  if (select count(*) from public.attendance where store_id = v_store) <> (select count(*) from public.presenca) then raise exception 'Divergência em presença'; end if;
  if (select coalesce(sum(total), 0) from public.service_orders where store_id = v_store and kind <> 'scheduled') <> (select coalesce(sum(valor), 0) from public.atendimentos) then raise exception 'Divergência no valor de atendimentos'; end if;
  if (select coalesce(sum(amount), 0) from public.financial_transactions where store_id = v_store and kind = 'income') <> (select coalesce(sum(valor), 0) from public.financeiro where tipo = 'ENTRADA') then raise exception 'Divergência nas entradas'; end if;
  if (select coalesce(sum(amount), 0) from public.financial_transactions where store_id = v_store and kind = 'expense') <> (select coalesce(sum(valor), 0) from public.financeiro where tipo = 'SAIDA') then raise exception 'Divergência nas saídas'; end if;
end $$;

commit;
