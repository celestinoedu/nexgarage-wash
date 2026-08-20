-- Teste transacional: nada é persistido.
begin;

select am.user_id as owner_id, am.account_id as account_id
from public.account_memberships am
where am.role = 'owner' and am.active
limit 1
\gset

set local role authenticated;
select set_config('request.jwt.claim.sub', :'owner_id', true);

select count(*) as owner_visible_customers from public.clientes;
select count(*) as owner_visible_stores from public.stores;

select public.create_legacy_store_for_account(
  :'account_id'::uuid,
  'Teste multiloja rollback',
  'Teste',
  'TS'
) as new_store_id
\gset

select count(*) as new_store_services from public.servicos where store_id = :'new_store_id'::uuid;
select count(*) as new_store_settings from public.configuracoes where store_id = :'new_store_id'::uuid;

select set_config('request.jwt.claim.sub', gen_random_uuid()::text, true);
select auth.uid() = :'owner_id'::uuid as still_owner;
select count(*) as unauthorized_visible_customers from public.clientes;

rollback;
select 'legacy-multistore-tests-ok' as result;
