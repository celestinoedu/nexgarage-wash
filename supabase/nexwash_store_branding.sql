-- NexWash — identidade visual por loja.
-- Cria um bucket público, mas limita alterações a administradores/gerentes da loja.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'store-branding',
  'store-branding',
  true,
  3145728,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.store_id_from_storage_path(object_name text)
returns uuid
language plpgsql
immutable
set search_path = public
as $$
begin
  return split_part(object_name, '/', 1)::uuid;
exception when invalid_text_representation then
  return null;
end;
$$;

create or replace function public.set_store_logo(p_store_id uuid, p_logo_url text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.can_manage_store(p_store_id) then
    raise exception 'Store management access required';
  end if;
  if nullif(trim(p_logo_url), '') is null then
    raise exception 'Logo URL is required';
  end if;
  update public.stores
  set logo_url = trim(p_logo_url), updated_at = now()
  where stores.id = p_store_id;
end;
$$;

grant execute on function public.set_store_logo(uuid, text) to authenticated;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'store_branding_select') then
    create policy store_branding_select on storage.objects
      for select to authenticated
      using (
        bucket_id = 'store-branding'
        and public.has_store_access(public.store_id_from_storage_path(name))
      );
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'store_branding_insert') then
    create policy store_branding_insert on storage.objects
      for insert to authenticated
      with check (
        bucket_id = 'store-branding'
        and public.can_manage_store(public.store_id_from_storage_path(name))
      );
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'store_branding_update') then
    create policy store_branding_update on storage.objects
      for update to authenticated
      using (
        bucket_id = 'store-branding'
        and public.can_manage_store(public.store_id_from_storage_path(name))
      )
      with check (
        bucket_id = 'store-branding'
        and public.can_manage_store(public.store_id_from_storage_path(name))
      );
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'store_branding_delete') then
    create policy store_branding_delete on storage.objects
      for delete to authenticated
      using (
        bucket_id = 'store-branding'
        and public.can_manage_store(public.store_id_from_storage_path(name))
      );
  end if;
end;
$$;
