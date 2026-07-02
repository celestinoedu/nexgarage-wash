-- Novas funcionalidades da versão 1.3.0
-- Rode uma vez no Supabase SQL Editor antes de publicar esta versão.
-- Cria a tabela de "vales" (adiantamentos) por funcionário.

begin;

-- Reaproveita o tipo real da chave de funcionarios (funciona com UUID ou bigint).
do $$
declare
  tipo_func text;
begin
  select format_type(a.atttypid, a.atttypmod) into tipo_func
    from pg_attribute a
    where a.attrelid = 'public.funcionarios'::regclass and a.attname = 'id' and not a.attisdropped;

  if to_regclass('public.vales') is null then
    execute format($f$
      create table public.vales (
        id uuid primary key default gen_random_uuid(),
        funcionario_id %s not null references public.funcionarios(id) on delete cascade,
        data date not null default current_date,
        valor numeric(12,2) not null default 0,
        descricao text,
        created_at timestamptz not null default now()
      )$f$, tipo_func);
  end if;
end $$;

create index if not exists vales_funcionario_idx
  on public.vales (funcionario_id, data);

alter table public.vales enable row level security;

drop policy if exists "vales autenticados" on public.vales;
create policy "vales autenticados" on public.vales
  for all to authenticated using (true) with check (true);

commit;
