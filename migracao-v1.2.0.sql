-- Novas funcionalidades da versão 1.2.0
-- Rode uma vez no Supabase SQL Editor antes de publicar esta versão.

begin;

alter table public.atendimentos
  add column if not exists itens_servicos jsonb not null default '[]'::jsonb,
  add column if not exists desconto numeric(12,2) not null default 0;

create table if not exists public.agenda_lavagens (
  id uuid primary key default gen_random_uuid(),
  data date not null,
  hora time,
  servicos text,
  observacoes text,
  status text not null default 'AGENDADO'
    check (status in ('AGENDADO', 'CONCLUIDO', 'CANCELADO')),
  created_at timestamptz not null default now()
);

-- Reaproveita o tipo real das chaves existentes (funciona com UUID ou bigint).
do $$
declare
  tipo_cliente text;
  tipo_carro text;
begin
  select format_type(a.atttypid, a.atttypmod) into tipo_cliente
    from pg_attribute a
    where a.attrelid = 'public.clientes'::regclass and a.attname = 'id' and not a.attisdropped;
  select format_type(a.atttypid, a.atttypmod) into tipo_carro
    from pg_attribute a
    where a.attrelid = 'public.carros'::regclass and a.attname = 'id' and not a.attisdropped;

  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'agenda_lavagens' and column_name = 'cliente_id') then
    execute format('alter table public.agenda_lavagens add column cliente_id %s', tipo_cliente);
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'agenda_lavagens' and column_name = 'carro_id') then
    execute format('alter table public.agenda_lavagens add column carro_id %s', tipo_carro);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'agenda_lavagens_cliente_id_fkey' and conrelid = 'public.agenda_lavagens'::regclass) then
    alter table public.agenda_lavagens add constraint agenda_lavagens_cliente_id_fkey
      foreign key (cliente_id) references public.clientes(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'agenda_lavagens_carro_id_fkey' and conrelid = 'public.agenda_lavagens'::regclass) then
    alter table public.agenda_lavagens add constraint agenda_lavagens_carro_id_fkey
      foreign key (carro_id) references public.carros(id) on delete set null;
  end if;
end $$;

alter table public.agenda_lavagens alter column cliente_id set not null;

create index if not exists agenda_lavagens_data_status_idx
  on public.agenda_lavagens (data, status);

alter table public.agenda_lavagens enable row level security;

drop policy if exists "agenda autenticados" on public.agenda_lavagens;
create policy "agenda autenticados" on public.agenda_lavagens
  for all to authenticated using (true) with check (true);

commit;
