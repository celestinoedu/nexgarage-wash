-- Limpa os dados operacionais da plataforma preservando cadastros de clientes
-- e seus carros vinculados.
--
-- Rode no Supabase SQL Editor do projeto.

begin;

truncate table
  financeiro,
  presenca,
  agenda_lavagens,
  atendimentos,
  parceiros,
  funcionarios,
  servicos,
  configuracoes
restart identity cascade;

commit;
