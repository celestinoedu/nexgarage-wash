-- NexWash legado / TOP LINE — isolamento multiloja aditivo.
-- Todos os dados preexistentes são preservados e vinculados à loja TOP LINE.

begin;

do $$
declare
  top_line_store_id uuid;
  table_name_value text;
begin
  select s.id into top_line_store_id
  from public.stores s
  where s.active and lower(s.name) like 'top line%'
  order by s.created_at
  limit 1;

  if top_line_store_id is null then
    raise exception 'Top Line store was not found; migration cancelled';
  end if;

  foreach table_name_value in array array[
    'clientes', 'carros', 'parceiros', 'funcionarios', 'servicos',
    'atendimentos', 'agenda_lavagens', 'financeiro', 'presenca', 'vales',
    'configuracoes', 'colaborador_movimentos'
  ] loop
    if to_regclass('public.' || table_name_value) is not null then
      execute format(
        'alter table public.%I add column if not exists store_id uuid references public.stores(id)',
        table_name_value
      );
      execute format(
        'update public.%I set store_id = $1 where store_id is null',
        table_name_value
      ) using top_line_store_id;
      execute format(
        'alter table public.%I alter column store_id set not null',
        table_name_value
      );
      execute format(
        'create index if not exists %I on public.%I (store_id)',
        table_name_value || '_store_id_idx',
        table_name_value
      );
    end if;
  end loop;
end;
$$;

-- Configurações passam a ter uma chave independente por loja.
alter table public.configuracoes drop constraint if exists configuracoes_pkey;
alter table public.configuracoes
  add constraint configuracoes_pkey primary key (store_id, chave);

-- Impede que um registro seja transferido silenciosamente entre lojas.
do $$
declare
  table_name_value text;
begin
  foreach table_name_value in array array[
    'clientes', 'carros', 'parceiros', 'funcionarios', 'servicos',
    'atendimentos', 'agenda_lavagens', 'financeiro', 'presenca', 'vales',
    'configuracoes', 'colaborador_movimentos'
  ] loop
    if to_regclass('public.' || table_name_value) is not null then
      execute format('drop trigger if exists %I on public.%I', table_name_value || '_lock_store', table_name_value);
      execute format(
        'create trigger %I before update of store_id on public.%I for each row execute function public.lock_tenant_id()',
        table_name_value || '_lock_store',
        table_name_value
      );
    end if;
  end loop;
end;
$$;

-- As views do legado passam a expor a loja e respeitar o RLS das tabelas-base.
-- A recriação é necessária porque o PostgreSQL não permite inserir uma coluna
-- no meio da assinatura de uma view usando apenas CREATE OR REPLACE.
drop view if exists public.v_ultima_lavagem;
create view public.v_ultima_lavagem
with (security_invoker = true)
as
select
  c.id as cliente_id,
  c.store_id,
  c.nome,
  c.telefone,
  max(a.data) as ultima_data,
  current_date - max(a.data) as dias_sem_lavar
from public.clientes c
join public.atendimentos a
  on a.cliente_id = c.id and a.store_id = c.store_id
where a.tipo = 'PARTICULAR'
group by c.id, c.store_id, c.nome, c.telefone;

drop view if exists public.v_rateio_socios;
create view public.v_rateio_socios
with (security_invoker = true)
as
select
  store_id,
  date_trunc('month', data)::date as mes,
  sum(valor) filter (where base_antiga) as entradas_base_antiga,
  sum(valor) filter (where not base_antiga) as entradas_comuns,
  sum(valor) as entradas_total,
  round(
    coalesce(sum(valor) filter (where base_antiga), 0) * 0.40
    + coalesce(sum(valor) filter (where not base_antiga), 0) * 0.50,
    2
  ) as rennan,
  round(
    coalesce(sum(valor) filter (where base_antiga), 0) * 0.60
    + coalesce(sum(valor) filter (where not base_antiga), 0) * 0.50,
    2
  ) as yuri
from public.financeiro
where tipo = 'ENTRADA'
group by store_id, date_trunc('month', data)::date
order by mes desc;

-- Substitui o acesso global antigo por isolamento real por loja.
do $$
declare
  table_name_value text;
begin
  foreach table_name_value in array array[
    'clientes', 'carros', 'parceiros', 'funcionarios', 'servicos',
    'atendimentos', 'agenda_lavagens', 'presenca', 'colaborador_movimentos'
  ] loop
    if to_regclass('public.' || table_name_value) is not null then
      execute format('alter table public.%I enable row level security', table_name_value);
      execute format('drop policy if exists auth_all on public.%I', table_name_value);
      execute format('drop policy if exists "agenda autenticados" on public.%I', table_name_value);
      execute format('drop policy if exists %I on public.%I', table_name_value || '_legacy_select', table_name_value);
      execute format('drop policy if exists %I on public.%I', table_name_value || '_legacy_insert', table_name_value);
      execute format('drop policy if exists %I on public.%I', table_name_value || '_legacy_update', table_name_value);
      execute format('drop policy if exists %I on public.%I', table_name_value || '_legacy_delete', table_name_value);
      execute format(
        'create policy %I on public.%I for select to authenticated using (public.has_store_access(store_id))',
        table_name_value || '_legacy_select', table_name_value
      );
      execute format(
        'create policy %I on public.%I for insert to authenticated with check (public.can_operate_store(store_id))',
        table_name_value || '_legacy_insert', table_name_value
      );
      execute format(
        'create policy %I on public.%I for update to authenticated using (public.can_operate_store(store_id)) with check (public.can_operate_store(store_id))',
        table_name_value || '_legacy_update', table_name_value
      );
      execute format(
        'create policy %I on public.%I for delete to authenticated using (public.can_manage_store(store_id))',
        table_name_value || '_legacy_delete', table_name_value
      );
    end if;
  end loop;
end;
$$;

do $$
declare
  table_name_value text;
begin
  foreach table_name_value in array array['financeiro', 'vales'] loop
    execute format('alter table public.%I enable row level security', table_name_value);
    execute format('drop policy if exists auth_all on public.%I', table_name_value);
    execute format('drop policy if exists "vales autenticados" on public.%I', table_name_value);
    execute format('drop policy if exists %I on public.%I', table_name_value || '_legacy_select', table_name_value);
    execute format('drop policy if exists %I on public.%I', table_name_value || '_legacy_insert', table_name_value);
    execute format('drop policy if exists %I on public.%I', table_name_value || '_legacy_update', table_name_value);
    execute format('drop policy if exists %I on public.%I', table_name_value || '_legacy_delete', table_name_value);
    execute format(
      'create policy %I on public.%I for select to authenticated using (public.has_store_access(store_id))',
      table_name_value || '_legacy_select', table_name_value
    );
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (public.can_manage_finance(store_id))',
      table_name_value || '_legacy_insert', table_name_value
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using (public.can_manage_finance(store_id)) with check (public.can_manage_finance(store_id))',
      table_name_value || '_legacy_update', table_name_value
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated using (public.can_manage_store(store_id))',
      table_name_value || '_legacy_delete', table_name_value
    );
  end loop;
end;
$$;

alter table public.configuracoes enable row level security;
drop policy if exists auth_all on public.configuracoes;
drop policy if exists configuracoes_legacy_select on public.configuracoes;
drop policy if exists configuracoes_legacy_manage on public.configuracoes;
create policy configuracoes_legacy_select on public.configuracoes
  for select to authenticated using (public.has_store_access(store_id));
create policy configuracoes_legacy_manage on public.configuracoes
  for all to authenticated using (public.can_manage_store(store_id))
  with check (public.can_manage_store(store_id));

-- Criação de loja específica do legado, sem alterar a lógica da V2.
create or replace function public.create_legacy_store_for_account(
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
  if nullif(trim(p_store_name), '') is null then
    raise exception 'Store name is required';
  end if;

  base_slug := trim(both '-' from regexp_replace(lower(trim(p_store_name)), '[^a-z0-9]+', '-', 'g'));
  if base_slug = '' then base_slug := 'loja'; end if;
  candidate_slug := base_slug;
  while exists (
    select 1 from public.stores s
    where s.account_id = p_account_id and s.slug = candidate_slug
  ) loop
    suffix := suffix + 1;
    candidate_slug := base_slug || '-' || suffix::text;
  end loop;

  insert into public.stores (account_id, name, slug, city, state)
  values (
    p_account_id,
    trim(p_store_name),
    candidate_slug,
    nullif(trim(p_city), ''),
    upper(nullif(trim(p_state), ''))
  )
  returning id into new_store_id;

  insert into public.store_memberships (store_id, user_id, role)
  values (new_store_id, auth.uid(), 'admin');
  insert into public.store_settings (store_id) values (new_store_id);
  insert into public.configuracoes (store_id, chave, valor)
  values (new_store_id, 'empresa_pct', '0'), (new_store_id, 'presenca_reset', '');
  insert into public.servicos (store_id, nome, preco_base)
  values
    (new_store_id, 'Lavagem Simples', 20),
    (new_store_id, 'Lavagem Detalhada', 40),
    (new_store_id, 'Higienização', 200),
    (new_store_id, 'Enceramento', 80),
    (new_store_id, 'Polimento', 170),
    (new_store_id, 'Lavagem + Cera', 60),
    (new_store_id, 'Lavagem + Motor', 50),
    (new_store_id, 'Limpeza de Farol', 60),
    (new_store_id, 'Lavagem de Chassi', 40);

  return new_store_id;
end;
$$;

grant execute on function public.create_legacy_store_for_account(uuid, text, text, text)
to authenticated;

\if :{?NEXWASH_DRY_RUN}
rollback;
\else
commit;
\endif
