# Migração de compartilhamento aplicada — 22/09/2026

- Projeto: `ftttoojxlvrimlzgrmrl` (NexWash).
- Migração: `supabase/nexwash_shared_catalog.sql`.
- Aplicação UTC: `2026-09-22T20:25:04.409395+00:00`.
- SHA-256 da migração aplicada: `7eb443ea4a2352c7e455bc7f40433aacdf33bc101991f5bfb16a50b25ca5ad30`.
- Backup completo: `backups/shared-catalog-20260922-201939/full-before.dump`.
- Tamanho do backup: 910090 bytes.
- SHA-256 do backup: `1ce1b6d715833c249a0b9b0a47f9add263dd7ae1b26e23cc07eb08e4ab15e589`.

## Preparação

Backup completo PostgreSQL, exportação CSV das 29 tabelas públicas e cópia do único
objeto do Storage. Os dados de autenticação estão incluídos no dump. Restauração
de `public`, `auth` e `storage` em PostgreSQL local descartável; comparação das 29
tabelas públicas com a origem e ensaio da migração usando as funções e policies
reais restauradas. Extensões administrativas específicas do Supabase não foram
executadas no clone local.

## Aplicação e verificação

A migração foi aplicada em uma transação, com limite de espera por locks e
comparação de hashes antes/depois dos dados de negócio. A comparação exclui
somente os campos novos de parceiros/carros. Nenhum valor anterior foi alterado;
nenhum registro de negócio foi excluído. O cache de schema da API foi atualizado.

| Verificação | Resultado |
|---|---:|
| Clientes preservados | 551 |
| Veículos compartilhados | 623 |
| Parceiros compartilhados | 37 |
| Atendimentos preservados | 679 |
| Movimentos financeiros preservados | 923 |
| Tabelas públicas reconciliadas | 29 |

Consultas REST para `show_all_stores` e `account_id` em `parceiros` e `carros`
retornaram HTTP 200. Testes com papel autenticado validaram cliente/veículo em
outra loja, OS paga com entrada financeira, OS pendente sem entrada e rejeição
de parceiro com compartilhamento desabilitado. Testes executados em transações
revertidas (`ROLLBACK`), tanto no clone quanto no banco real.

Os artefatos detalhados, hashes, CSVs e logs estão na pasta de backup ignorada pelo
Git. A instância PostgreSQL local foi desligada após a verificação.

## Escopo

Esta execução aplica a migração solicitada para a aplicação legado e corrige a
falta dos campos que impedia abrir Relatórios. Não houve publicação de frontend,
transferência de registros entre as estruturas legado/React ou alteração da
interface moderna restaurada. A integração funcional completa nas páginas React
continua pendente conforme a auditoria.
