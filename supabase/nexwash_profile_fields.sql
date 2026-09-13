-- Campos adicionais do perfil do usuário (CPF, nascimento e WhatsApp).
-- Aditivo e idempotente: pode ser reaplicado sem afetar dados existentes.

alter table public.profiles add column if not exists document text;
alter table public.profiles add column if not exists birth_date date;
alter table public.profiles add column if not exists whatsapp text;

comment on column public.profiles.document is 'CPF do usuário, somente dígitos.';
comment on column public.profiles.birth_date is 'Data de nascimento informada pelo usuário.';
comment on column public.profiles.whatsapp is 'WhatsApp de contato do usuário.';

-- O perfil é criado pelo trigger de cadastro, mas usuários migrados do legado
-- podem não ter linha. A política permite que cada um crie a própria.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles_insert_self'
  ) then
    create policy profiles_insert_self on public.profiles
      for insert with check (id = auth.uid());
  end if;
end $$;

-- O updated_at já é mantido pelo trigger profiles_updated_at criado em
-- nexwash_multistore.sql; nada a fazer aqui.
