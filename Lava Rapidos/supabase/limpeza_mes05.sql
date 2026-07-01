-- ============================================================================
-- LIMPEZA — apaga os registros operacionais ANTERIORES a junho/2026.
-- Mantém clientes, carros, parceiros, funcionários e serviços.
-- Apaga atendimentos, financeiro, presença e movimentos de colaborador < 2026-06-01.
-- Rode no SQL Editor do Supabase. (Rennan vai iniciar os testes no mês 06.)
-- ============================================================================
begin;
  delete from financeiro            where data < '2026-06-01';
  delete from atendimentos          where data < '2026-06-01';
  delete from presenca              where data < '2026-06-01';
  delete from colaborador_movimentos where data < '2026-06-01';
commit;

-- Confere o que sobrou:
-- select 'atendimentos' t, count(*) from atendimentos
-- union all select 'financeiro', count(*) from financeiro
-- union all select 'clientes', count(*) from clientes;
