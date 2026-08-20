-- ============================================================================
-- LAVA RÁPIDOS / TOP LINE HIGIENIZAÇÕES — Schema Supabase
-- ----------------------------------------------------------------------------
-- Execute este arquivo no SQL Editor do Supabase (uma vez), ao criar o projeto.
-- Modelo de acesso: negócio único. Qualquer usuário AUTENTICADO (sócios e
-- funcionários convidados) pode ler/escrever. Usuários anônimos NÃO têm acesso.
-- ============================================================================

create extension if not exists "uuid-ossp";

-- ----------------------------------------------------------------------------
-- CLIENTES (particulares). A flag base_antiga marca a base do Yuri (anterior à
-- entrada do Rennan) e é o que define o rateio 40% Rennan / 60% Yuri.
-- ----------------------------------------------------------------------------
create table if not exists clientes (
  id          uuid primary key default uuid_generate_v4(),
  nome        text not null,
  telefone    text,
  origem      text default 'PARTICULAR',     -- PARTICULAR, AMIGO RENNAN, etc.
  base_antiga boolean not null default false, -- true = tag YURI (rateio 40/60)
  observacoes text,
  created_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- CARROS (somente de clientes particulares). Placa é a chave de busca rápida.
-- ----------------------------------------------------------------------------
create table if not exists carros (
  id          uuid primary key default uuid_generate_v4(),
  cliente_id  uuid references clientes(id) on delete cascade,
  placa       text not null,
  veiculo     text,            -- modelo/descrição (ex: HRV, MOTO, CIVIC)
  cor         text,
  ano         int,
  observacoes text,
  created_at  timestamptz not null default now()
);
create index if not exists idx_carros_placa on carros (upper(placa));
create index if not exists idx_carros_cliente on carros (cliente_id);

-- ----------------------------------------------------------------------------
-- PARCEIROS (lojas/oficinas). Não cadastramos os carros deles, mas registramos
-- cada serviço para fechar a cobrança depois (extrato do parceiro).
-- ----------------------------------------------------------------------------
create table if not exists parceiros (
  id          uuid primary key default uuid_generate_v4(),
  nome        text not null,
  telefone    text,
  observacoes text,
  base_antiga boolean not null default false, -- true = base antiga (rateio 40/60)
  ativo       boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- FUNCIONÁRIOS (colaboradores)
-- ----------------------------------------------------------------------------
create table if not exists funcionarios (
  id          uuid primary key default uuid_generate_v4(),
  nome        text not null,
  telefone    text,
  ativo       boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- SERVIÇOS (catálogo) — usado para preenchimento rápido no Novo Registro.
-- ----------------------------------------------------------------------------
create table if not exists servicos (
  id          uuid primary key default uuid_generate_v4(),
  nome        text not null,
  preco_base  numeric(10,2) default 0,
  ativo       boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- ATENDIMENTOS (OS) — coração operacional. Um registro por carro atendido.
-- tipo = PARTICULAR (liga cliente/carro) ou PARCEIRO (liga parceiro).
-- base_antiga é "fotografado" no atendimento para o rateio histórico ser fiel.
-- ----------------------------------------------------------------------------
create table if not exists atendimentos (
  id          uuid primary key default uuid_generate_v4(),
  os_numero   text,
  data        date not null default current_date,
  tipo        text not null check (tipo in ('PARTICULAR','PARCEIRO')),
  cliente_id  uuid references clientes(id) on delete set null,
  parceiro_id uuid references parceiros(id) on delete set null,
  carro_id    uuid references carros(id) on delete set null,
  veiculo     text,         -- snapshot da descrição do veículo
  placa       text,         -- snapshot da placa
  servicos    text,         -- descrição dos serviços (ex: "LAVAGEM + CERA")
  valor       numeric(10,2) not null default 0,
  forma_pgto  text,         -- DINHEIRO, PIX, CARTAO
  status_pg   text not null default 'PENDENTE' check (status_pg in ('PAGO','PENDENTE')),
  data_pg     date,
  base_antiga boolean not null default false, -- tag YURI (rateio 40/60)
  observacoes text,
  created_at  timestamptz not null default now()
);
create index if not exists idx_atend_data on atendimentos (data);
create index if not exists idx_atend_cliente on atendimentos (cliente_id);
create index if not exists idx_atend_parceiro on atendimentos (parceiro_id);
create index if not exists idx_atend_status on atendimentos (status_pg);

-- ----------------------------------------------------------------------------
-- FINANCEIRO (entradas e saídas / fluxo de caixa).
-- Entradas normalmente vêm de um atendimento; saídas são despesas avulsas.
-- base_antiga propaga a tag YURI para o rateio dos sócios.
-- ----------------------------------------------------------------------------
create table if not exists financeiro (
  id            uuid primary key default uuid_generate_v4(),
  data          date not null default current_date,
  tipo          text not null check (tipo in ('ENTRADA','SAIDA')),
  atendimento_id uuid references atendimentos(id) on delete set null,
  descricao     text,
  valor         numeric(10,2) not null default 0,
  forma_pgto    text,
  base_antiga   boolean not null default false,
  observacoes   text,
  created_at    timestamptz not null default now()
);
create index if not exists idx_fin_data on financeiro (data);
create index if not exists idx_fin_tipo on financeiro (tipo);

-- ----------------------------------------------------------------------------
-- PRESENÇA dos funcionários
-- ----------------------------------------------------------------------------
create table if not exists presenca (
  id             uuid primary key default uuid_generate_v4(),
  data           date not null default current_date,
  funcionario_id uuid references funcionarios(id) on delete cascade,
  status         text not null check (status in ('PRESENTE','FALTA')),
  hora           time,
  observacoes    text,
  created_at     timestamptz not null default now(),
  unique (data, funcionario_id)
);
create index if not exists idx_presenca_data on presenca (data);

-- ----------------------------------------------------------------------------
-- MOVIMENTAÇÕES DE COLABORADOR (Vales e Pagamentos)
-- ----------------------------------------------------------------------------
create table if not exists colaborador_movimentos (
  id             uuid primary key default uuid_generate_v4(),
  data           date not null default current_date,
  funcionario_id uuid references funcionarios(id) on delete set null,
  funcionario_nome text,   -- snapshot (ex: "Rennan" que não é funcionário fixo)
  tipo           text not null check (tipo in ('Vale','Pagamento')),
  valor          numeric(10,2) not null default 0,
  observacao     text,
  created_at     timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- CONFIGURAÇÕES (chave/valor) — ex: percentual da empresa, data de reset da
-- contagem de presença.
-- ----------------------------------------------------------------------------
create table if not exists configuracoes (
  chave      text primary key,
  valor      text,
  updated_at timestamptz not null default now()
);
insert into configuracoes (chave, valor) values
  ('empresa_pct', '0'),
  ('presenca_reset', '')
on conflict do nothing;

-- ============================================================================
-- VIEWS DE APOIO
-- ============================================================================

-- Última lavagem por cliente (alimenta o quadro de Oportunidades de 15+ dias).
create or replace view v_ultima_lavagem as
select
  c.id            as cliente_id,
  c.nome,
  c.telefone,
  max(a.data)     as ultima_data,
  current_date - max(a.data) as dias_sem_lavar
from clientes c
join atendimentos a on a.cliente_id = c.id
where a.tipo = 'PARTICULAR'
group by c.id, c.nome, c.telefone;

-- Rateio dos sócios sobre as ENTRADAS.
-- Regra: entradas com base_antiga (tag YURI) => Rennan 40% / Yuri 60%.
--        entradas sem tag                    => Rennan 50% / Yuri 50%.
create or replace view v_rateio_socios as
select
  date_trunc('month', data)::date as mes,
  sum(valor) filter (where base_antiga)        as entradas_base_antiga,
  sum(valor) filter (where not base_antiga)    as entradas_comuns,
  sum(valor)                                   as entradas_total,
  round(coalesce(sum(valor) filter (where base_antiga),0) * 0.40
      + coalesce(sum(valor) filter (where not base_antiga),0) * 0.50, 2) as rennan,
  round(coalesce(sum(valor) filter (where base_antiga),0) * 0.60
      + coalesce(sum(valor) filter (where not base_antiga),0) * 0.50, 2) as yuri
from financeiro
where tipo = 'ENTRADA'
group by 1
order by 1 desc;

-- ============================================================================
-- ROW LEVEL SECURITY — só usuários autenticados acessam (negócio único)
-- ============================================================================
do $$
declare t text;
begin
  foreach t in array array[
    'clientes','carros','parceiros','funcionarios','servicos',
    'atendimentos','financeiro','presenca','colaborador_movimentos','configuracoes'
  ] loop
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists auth_all on %I;', t);
    execute format($p$create policy auth_all on %I
      for all to authenticated using (true) with check (true);$p$, t);
  end loop;
end $$;

-- ============================================================================
-- CATÁLOGO INICIAL DE SERVIÇOS (preços-base; ajuste depois na tela Serviços)
-- ============================================================================
insert into servicos (nome, preco_base) values
  ('Lavagem Simples', 20),
  ('Lavagem Detalhada', 40),
  ('Higienização', 200),
  ('Enceramento', 80),
  ('Polimento', 170),
  ('Lavagem + Cera', 60),
  ('Lavagem + Motor', 50),
  ('Limpeza de Farol', 60),
  ('Lavagem de Chassi', 40)
on conflict do nothing;
