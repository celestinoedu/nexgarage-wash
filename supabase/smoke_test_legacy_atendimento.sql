begin;

select set_config(
  'request.jwt.claim.sub',
  (
    select sm.user_id::text
    from public.store_memberships sm
    where sm.active and sm.role in ('operator', 'manager', 'admin')
    order by case sm.role when 'operator' then 0 else 1 end
    limit 1
  ),
  true
);
set local role authenticated;

do $$
declare
  target_store uuid;
  target_customer uuid;
  created_atendimento uuid;
begin
  select s.id into target_store
  from public.stores s
  where public.can_operate_store(s.id)
  order by s.created_at
  limit 1;

  select c.id into target_customer
  from public.clientes c
  where c.store_id = target_store
  order by c.created_at
  limit 1;

  created_atendimento := public.create_legacy_atendimento(
    target_store,
    jsonb_build_object(
      'os_numero', 'NEXWASH_SMOKE_ROLLBACK',
      'data', current_date,
      'tipo', 'PARTICULAR',
      'cliente_id', target_customer,
      'servicos', 'Teste transacional',
      'itens_servicos', '[]'::jsonb,
      'desconto', 0,
      'valor', 1,
      'forma_pgto', 'PIX',
      'status_pg', 'PAGO',
      'data_pg', current_date,
      'base_antiga', false
    )
  );

  if not exists (
    select 1 from public.atendimentos a where a.id = created_atendimento
  ) or not exists (
    select 1 from public.financeiro f
    where f.atendimento_id = created_atendimento and f.tipo = 'ENTRADA'
  ) then
    raise exception 'Falha no teste transacional do atendimento legado';
  end if;
end;
$$;

rollback;
select 'SMOKE_TEST_ROLLED_BACK_OK' as result;
