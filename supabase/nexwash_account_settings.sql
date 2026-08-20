-- NexWash — funções da central de usuários e acessos.

create or replace function public.list_account_users(p_account_id uuid)
returns table (
  user_id uuid,
  email text,
  full_name text,
  account_role text,
  store_ids uuid[]
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null or not public.is_account_admin(p_account_id) then
    raise exception 'Account admin access required';
  end if;
  return query
  select
    am.user_id,
    au.email::text,
    coalesce(p.full_name, split_part(au.email, '@', 1))::text,
    am.role::text,
    coalesce(array_agg(sm.store_id) filter (where sm.active), '{}'::uuid[])
  from public.account_memberships am
  join auth.users au on au.id = am.user_id
  left join public.profiles p on p.id = am.user_id
  left join public.stores s on s.account_id = am.account_id
  left join public.store_memberships sm on sm.store_id = s.id and sm.user_id = am.user_id
  where am.account_id = p_account_id and am.active
  group by am.user_id, au.email, p.full_name, am.role
  order by coalesce(p.full_name, au.email);
end;
$$;

create or replace function public.grant_existing_user_access(
  p_account_id uuid,
  p_email text,
  p_account_role text default 'member',
  p_store_ids uuid[] default '{}',
  p_store_role text default 'operator'
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  target_user_id uuid;
  target_store_id uuid;
  target_existing_role public.account_role;
begin
  if auth.uid() is null or not public.is_account_admin(p_account_id) then
    raise exception 'Account admin access required';
  end if;
  if p_account_role not in ('admin', 'member') then raise exception 'Invalid account role'; end if;
  if p_store_role not in ('admin', 'manager', 'operator', 'finance', 'viewer') then raise exception 'Invalid store role'; end if;

  select au.id into target_user_id from auth.users au where lower(au.email) = lower(trim(p_email)) limit 1;
  if target_user_id is null then raise exception 'User must create a NexWash login before access can be granted'; end if;

  select am.role
  into target_existing_role
  from public.account_memberships am
  where am.account_id = p_account_id
    and am.user_id = target_user_id
    and am.active;
  if target_existing_role = 'owner' then
    raise exception 'Owner access cannot be changed';
  end if;

  insert into public.account_memberships (account_id, user_id, role, active)
  values (p_account_id, target_user_id, p_account_role::public.account_role, true)
  on conflict (account_id, user_id) do update set role = excluded.role, active = true;

  if p_account_role = 'member' then
    update public.store_memberships sm
    set active = false
    where sm.user_id = target_user_id
      and sm.store_id in (select s.id from public.stores s where s.account_id = p_account_id)
      and not (sm.store_id = any(coalesce(p_store_ids, '{}'::uuid[])));

    foreach target_store_id in array coalesce(p_store_ids, '{}'::uuid[]) loop
      if not exists (select 1 from public.stores s where s.id = target_store_id and s.account_id = p_account_id) then
        raise exception 'Invalid store selection';
      end if;
      insert into public.store_memberships (store_id, user_id, role, active)
      values (target_store_id, target_user_id, p_store_role::public.store_role, true)
      on conflict (store_id, user_id) do update set role = excluded.role, active = true;
    end loop;
  end if;

  return target_user_id;
end;
$$;

grant execute on function public.list_account_users(uuid) to authenticated;
grant execute on function public.grant_existing_user_access(uuid, text, text, uuid[], text) to authenticated;

-- Retorna também o papel específico do usuário em cada loja. Uma nova função é
-- usada para manter compatibilidade com instalações que já possuem a versão
-- anterior de list_account_users.
create or replace function public.list_account_users_with_access(p_account_id uuid)
returns table (
  user_id uuid,
  email text,
  full_name text,
  account_role text,
  store_ids uuid[],
  store_roles jsonb
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null or not public.is_account_admin(p_account_id) then
    raise exception 'Account admin access required';
  end if;

  return query
  select
    am.user_id,
    au.email::text,
    coalesce(p.full_name, split_part(au.email, '@', 1))::text,
    am.role::text,
    coalesce(
      (
        select array_agg(sm.store_id order by s.name)
        from public.store_memberships sm
        join public.stores s on s.id = sm.store_id
        where sm.user_id = am.user_id
          and sm.active
          and s.account_id = p_account_id
      ),
      '{}'::uuid[]
    ),
    coalesce(
      (
        select jsonb_object_agg(sm.store_id::text, sm.role::text)
        from public.store_memberships sm
        join public.stores s on s.id = sm.store_id
        where sm.user_id = am.user_id
          and sm.active
          and s.account_id = p_account_id
      ),
      '{}'::jsonb
    )
  from public.account_memberships am
  join auth.users au on au.id = am.user_id
  left join public.profiles p on p.id = am.user_id
  where am.account_id = p_account_id and am.active
  order by coalesce(p.full_name, au.email);
end;
$$;

create or replace function public.update_account_user_access(
  p_account_id uuid,
  p_user_id uuid,
  p_account_role text,
  p_store_access jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  target_role public.account_role;
  access_item record;
  target_store_id uuid;
begin
  if auth.uid() is null or not public.is_account_admin(p_account_id) then
    raise exception 'Account admin access required';
  end if;
  if p_account_role not in ('admin', 'member') then
    raise exception 'Invalid account role';
  end if;
  if jsonb_typeof(coalesce(p_store_access, '{}'::jsonb)) <> 'object' then
    raise exception 'Invalid store access';
  end if;

  select am.role
  into target_role
  from public.account_memberships am
  where am.account_id = p_account_id
    and am.user_id = p_user_id
    and am.active
  for update;

  if target_role is null then
    raise exception 'Account user not found';
  end if;
  if target_role = 'owner' then
    raise exception 'Owner access cannot be changed';
  end if;

  update public.account_memberships
  set role = p_account_role::public.account_role
  where account_id = p_account_id and user_id = p_user_id;

  if p_account_role = 'member' then
    update public.store_memberships sm
    set active = false
    where sm.user_id = p_user_id
      and sm.store_id in (
        select s.id from public.stores s where s.account_id = p_account_id
      )
      and not (coalesce(p_store_access, '{}'::jsonb) ? sm.store_id::text);

    for access_item in
      select key, value from jsonb_each_text(coalesce(p_store_access, '{}'::jsonb))
    loop
      begin
        target_store_id := access_item.key::uuid;
      exception when invalid_text_representation then
        raise exception 'Invalid store selection';
      end;

      if access_item.value not in ('admin', 'manager', 'operator', 'finance', 'viewer') then
        raise exception 'Invalid store role';
      end if;
      if not exists (
        select 1 from public.stores s
        where s.id = target_store_id and s.account_id = p_account_id
      ) then
        raise exception 'Invalid store selection';
      end if;

      insert into public.store_memberships (store_id, user_id, role, active)
      values (
        target_store_id,
        p_user_id,
        access_item.value::public.store_role,
        true
      )
      on conflict (store_id, user_id)
      do update set role = excluded.role, active = true;
    end loop;
  end if;
end;
$$;

grant execute on function public.list_account_users_with_access(uuid) to authenticated;
grant execute on function public.update_account_user_access(uuid, uuid, text, jsonb) to authenticated;
