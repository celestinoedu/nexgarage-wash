-- ============================================================================
-- AJUSTES — rode UMA VEZ no SQL Editor do Supabase (após os comentários do Rennan)
-- Cria a tabela de configurações (% da empresa e reset da contagem de presença).
-- ============================================================================
create table if not exists configuracoes (
  chave      text primary key,
  valor      text,
  updated_at timestamptz not null default now()
);

insert into configuracoes (chave, valor) values
  ('empresa_pct', '0'),
  ('presenca_reset', '')
on conflict do nothing;

alter table configuracoes enable row level security;
drop policy if exists auth_all on configuracoes;
create policy auth_all on configuracoes
  for all to authenticated using (true) with check (true);
