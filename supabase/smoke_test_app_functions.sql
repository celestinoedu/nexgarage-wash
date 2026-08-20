\set ON_ERROR_STOP on
begin;

select set_config(
  'request.jwt.claim.sub',
  (select au.id::text from auth.users au order by au.created_at limit 1),
  true
);
set local role authenticated;

do $$
declare
  target_store uuid;
  target_account uuid;
  target_service public.services;
  created_order_id uuid;
begin
  select s.id, s.account_id into target_store, target_account
  from public.stores s
  where public.can_operate_store(s.id)
  order by s.created_at
  limit 1;

  select service.* into target_service
  from public.services service
  where service.store_id = target_store and service.active
  order by service.created_at
  limit 1;

  select result.id into created_order_id
  from public.create_service_order(
    p_store_id := target_store,
    p_notes := 'NEXWASH_SMOKE_TEST_ROLLBACK',
    p_items := jsonb_build_array(jsonb_build_object(
      'service_id', target_service.id,
      'description', target_service.name,
      'quantity', 1,
      'unit_price', target_service.base_price
    ))
  ) result;

  perform public.register_order_payment(created_order_id, 'Teste rollback');
  perform public.create_store_for_account(target_account, 'Loja teste rollback', 'São Paulo', 'SP');

  if not exists (select 1 from public.service_orders so where so.id = created_order_id and so.payment_status = 'paid') then
    raise exception 'Payment smoke test failed';
  end if;
end;
$$;

rollback;
select 'SMOKE_TEST_ROLLED_BACK_OK' as result;
