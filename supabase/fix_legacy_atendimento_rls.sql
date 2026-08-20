-- NexWash legado / TOP LINE — atendimento e entrada financeira atômicos.
-- Reaplicável no projeto Supabase do NexWash.

begin;

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
    where c.id = (p_atendimento->>'cliente_id')::uuid and c.store_id = p_store_id
  ) then
    raise exception 'Cliente não pertence à loja ativa';
  end if;
  if nullif(p_atendimento->>'parceiro_id', '') is not null and not exists (
    select 1 from public.parceiros p
    where p.id = (p_atendimento->>'parceiro_id')::uuid and p.store_id = p_store_id
  ) then
    raise exception 'Parceiro não pertence à loja ativa';
  end if;
  if nullif(p_atendimento->>'carro_id', '') is not null and not exists (
    select 1 from public.carros c
    where c.id = (p_atendimento->>'carro_id')::uuid and c.store_id = p_store_id
  ) then
    raise exception 'Veículo não pertence à loja ativa';
  end if;

  insert into public.atendimentos (
    store_id, os_numero, data, tipo, cliente_id, parceiro_id, carro_id,
    veiculo, placa, servicos, itens_servicos, desconto, valor, forma_pgto,
    status_pg, data_pg, base_antiga, observacoes
  ) values (
    p_store_id,
    nullif(trim(p_atendimento->>'os_numero'), ''),
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
      concat_ws(' · ', nullif(trim(p_atendimento->>'os_numero'), ''), nullif(trim(p_atendimento->>'servicos'), '')),
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
