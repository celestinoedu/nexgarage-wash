-- Aplicar após nexwash_legacy_multistore.sql e fix_legacy_atendimento_rls.sql.
-- Ensaie em clone com backup antes de aplicar em produção.
begin;

alter table public.parceiros add column if not exists show_all_stores boolean not null default true;
alter table public.carros add column if not exists show_all_stores boolean not null default true;
alter table public.parceiros add column if not exists account_id uuid references public.accounts(id);
alter table public.carros add column if not exists account_id uuid references public.accounts(id);
update public.parceiros p set account_id = s.account_id from public.stores s where s.id = p.store_id and p.account_id is distinct from s.account_id;
update public.carros c set account_id = s.account_id from public.stores s where s.id = c.store_id and c.account_id is distinct from s.account_id;
alter table public.parceiros alter column account_id set not null;
alter table public.carros alter column account_id set not null;
create index if not exists parceiros_shared_account_idx on public.parceiros(account_id) where show_all_stores;
create index if not exists carros_shared_account_idx on public.carros(account_id, cliente_id) where show_all_stores;

create or replace function public.legacy_catalog_account()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  select account_id into new.account_id from public.stores where id = new.store_id;
  if TG_TABLE_NAME = 'carros' then
    if not exists (
      select 1 from public.clientes c join public.stores s on s.id = c.store_id
      where c.id = new.cliente_id and s.account_id = new.account_id
    ) then raise exception 'Cliente e veículo devem pertencer à mesma conta'; end if;
  end if;
  return new;
end;
$$;
drop trigger if exists parceiros_catalog_account on public.parceiros;
create trigger parceiros_catalog_account before insert or update on public.parceiros for each row execute function public.legacy_catalog_account();
drop trigger if exists carros_catalog_account on public.carros;
create trigger carros_catalog_account before insert or update on public.carros for each row execute function public.legacy_catalog_account();

create or replace function public.legacy_shared_access(p_account uuid, p_operate boolean default false)
returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and exists (
    select 1 from public.stores s where s.account_id = p_account and s.active
      and case when p_operate then public.can_operate_store(s.id) else public.has_store_access(s.id) end
  );
$$;
revoke all on function public.legacy_shared_access(uuid, boolean) from public;
grant execute on function public.legacy_shared_access(uuid, boolean) to authenticated;

-- Políticas adicionais: as permissões da loja de origem continuam válidas.
drop policy if exists parceiros_shared_select on public.parceiros;
create policy parceiros_shared_select on public.parceiros for select to authenticated
  using (show_all_stores and public.legacy_shared_access(account_id));
drop policy if exists carros_shared_select on public.carros;
create policy carros_shared_select on public.carros for select to authenticated
  using (show_all_stores and public.legacy_shared_access(account_id));
drop policy if exists parceiros_shared_update on public.parceiros;
create policy parceiros_shared_update on public.parceiros for update to authenticated
  using (show_all_stores and public.legacy_shared_access(account_id, true))
  with check (public.can_operate_store(store_id) or (show_all_stores and public.legacy_shared_access(account_id, true)));
drop policy if exists carros_shared_update on public.carros;
create policy carros_shared_update on public.carros for update to authenticated
  using (show_all_stores and public.legacy_shared_access(account_id, true))
  with check (public.can_operate_store(store_id) or (show_all_stores and public.legacy_shared_access(account_id, true)));

-- O proprietário do carro fica legível para identificação, sem compartilhar
-- seu histórico financeiro nem conceder permissão de alteração do cliente.
create or replace function public.legacy_customer_visible(p_customer uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and exists (
    select 1 from public.carros c where c.cliente_id = p_customer and c.show_all_stores
    and public.legacy_shared_access(c.account_id)
  );
$$;
revoke all on function public.legacy_customer_visible(uuid) from public;
grant execute on function public.legacy_customer_visible(uuid) to authenticated;
drop policy if exists clientes_shared_vehicle_select on public.clientes;
create policy clientes_shared_vehicle_select on public.clientes for select to authenticated
  using (public.legacy_customer_visible(id));

create or replace function public.list_legacy_customers(p_store_ids uuid[])
returns setof public.clientes language sql stable security invoker set search_path = public as $$
  select c.* from public.clientes c where c.store_id = any(p_store_ids) or exists (
    select 1 from public.carros v join public.stores target on target.account_id = v.account_id
    where v.cliente_id = c.id and v.show_all_stores and target.id = any(p_store_ids)
      and public.has_store_access(target.id)
  ) order by c.nome;
$$;
revoke all on function public.list_legacy_customers(uuid[]) from public;
grant execute on function public.list_legacy_customers(uuid[]) to authenticated;

-- A função de emissão atualizada é instalada na mesma transação abaixo.

create or replace function public.create_legacy_atendimento(
  p_store_id uuid,
  p_atendimento jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  novo_id uuid;
  numero_os text;
  atendimento_status text := coalesce(nullif(p_atendimento->>'status_pg', ''), 'PENDENTE');
  atendimento_tipo text := p_atendimento->>'tipo';
  atendimento_valor numeric(10,2) := greatest(coalesce((p_atendimento->>'valor')::numeric, 0), 0);
begin
  if auth.uid() is null or not public.can_operate_store(p_store_id) then
    raise exception 'Sem permissão operacional para esta loja' using errcode = '42501';
  end if;
  if atendimento_tipo not in ('PARTICULAR', 'PARCEIRO') then
    raise exception 'Tipo de atendimento inválido';
  end if;
  if atendimento_status not in ('PAGO', 'PENDENTE') then
    raise exception 'Status de pagamento inválido';
  end if;
  if atendimento_tipo = 'PARTICULAR' and nullif(p_atendimento->>'cliente_id', '') is null then
    raise exception 'Cliente obrigatório para atendimento particular';
  end if;
  if atendimento_tipo = 'PARCEIRO' and nullif(p_atendimento->>'parceiro_id', '') is null then
    raise exception 'Parceiro obrigatório para atendimento de parceiro';
  end if;
  if nullif(p_atendimento->>'cliente_id', '') is not null and not exists (
    select 1 from public.clientes c
    where c.id = (p_atendimento->>'cliente_id')::uuid and (c.store_id = p_store_id or exists (
      select 1 from public.carros v join public.stores target on target.id = p_store_id
      where v.cliente_id = c.id and v.show_all_stores and v.account_id = target.account_id
    ))
  ) then
    raise exception 'Cliente não pertence à loja ativa';
  end if;
  if nullif(p_atendimento->>'parceiro_id', '') is not null and not exists (
    select 1 from public.parceiros p
    where p.id = (p_atendimento->>'parceiro_id')::uuid and (p.store_id = p_store_id or (p.show_all_stores and p.account_id = (select account_id from public.stores where id = p_store_id)))
  ) then
    raise exception 'Parceiro não pertence à loja ativa';
  end if;
  if nullif(p_atendimento->>'carro_id', '') is not null and not exists (
    select 1 from public.carros c
    where c.id = (p_atendimento->>'carro_id')::uuid and (c.store_id = p_store_id or (c.show_all_stores and c.account_id = (select account_id from public.stores where id = p_store_id)))
      and (atendimento_tipo <> 'PARTICULAR' or c.cliente_id = (p_atendimento->>'cliente_id')::uuid)
  ) then
    raise exception 'Veículo não pertence à loja ativa';
  end if;

  -- Serializa a numeração por loja, incluindo emissão simultânea nas duas UIs.
  perform pg_advisory_xact_lock(hashtextextended(p_store_id::text, 0));
  select 'OS' || lpad(next_number, greatest(6, length(next_number)), '0') into numero_os
  from (select (coalesce(max(substring(upper(os_numero) from '^OS([0-9]+)$')::bigint), 0) + 1)::text as next_number
    from public.atendimentos where store_id = p_store_id) numbers;

  insert into public.atendimentos (
    store_id, os_numero, data, tipo, cliente_id, parceiro_id, carro_id,
    veiculo, placa, servicos, itens_servicos, desconto, valor, forma_pgto,
    status_pg, data_pg, base_antiga, observacoes
  ) values (
    p_store_id,
    numero_os,
    coalesce((p_atendimento->>'data')::date, current_date),
    atendimento_tipo,
    nullif(p_atendimento->>'cliente_id', '')::uuid,
    nullif(p_atendimento->>'parceiro_id', '')::uuid,
    nullif(p_atendimento->>'carro_id', '')::uuid,
    nullif(trim(p_atendimento->>'veiculo'), ''),
    nullif(trim(p_atendimento->>'placa'), ''),
    nullif(trim(p_atendimento->>'servicos'), ''),
    coalesce(p_atendimento->'itens_servicos', '[]'::jsonb),
    greatest(coalesce((p_atendimento->>'desconto')::numeric, 0), 0),
    atendimento_valor,
    nullif(trim(p_atendimento->>'forma_pgto'), ''),
    atendimento_status,
    nullif(p_atendimento->>'data_pg', '')::date,
    coalesce((p_atendimento->>'base_antiga')::boolean, false),
    nullif(trim(p_atendimento->>'observacoes'), '')
  )
  returning id into novo_id;

  if atendimento_status = 'PAGO' then
    insert into public.financeiro (
      store_id, data, tipo, atendimento_id, descricao, valor, forma_pgto, base_antiga
    ) values (
      p_store_id,
      coalesce(nullif(p_atendimento->>'data_pg', '')::date, (p_atendimento->>'data')::date, current_date),
      'ENTRADA',
      novo_id,
      concat_ws(' · ', numero_os, nullif(trim(p_atendimento->>'servicos'), '')),
      atendimento_valor,
      nullif(trim(p_atendimento->>'forma_pgto'), ''),
      coalesce((p_atendimento->>'base_antiga')::boolean, false)
    );
  end if;

  return novo_id;
end;
$$;

alter function public.create_legacy_atendimento(uuid, jsonb) owner to postgres;
revoke all on function public.create_legacy_atendimento(uuid, jsonb) from public;
grant execute on function public.create_legacy_atendimento(uuid, jsonb) to authenticated;

commit;
