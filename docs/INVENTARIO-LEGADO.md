# Inventário do legado — linha de base

Data do inventário: 19 de agosto de 2026.

## Escopo e segurança

Este inventário foi produzido sem mutações e sem exibir dados pessoais ou credenciais. A configuração do frontend contém somente uma chave pública com papel `anon`. Uma consulta `GET` ao catálogo remoto retornou `401` por ausência de sessão autenticada, como esperado pelas policies do projeto.

Nenhuma tentativa de contornar a autenticação foi realizada.

## Projeto identificado

- Host: `ftttoojxlvrimlzgrmrl.supabase.co`
- Credencial local disponível: chave pública `anon`
- `service_role`: não disponível no frontend
- Acesso remoto autenticado: pendente

## Estrutura identificada no schema local

- `clientes`
- `carros`
- `parceiros`
- `funcionarios`
- `servicos`
- `atendimentos`
- `financeiro`
- `presenca`
- `colaborador_movimentos`
- `configuracoes`
- View `v_ultima_lavagem`
- View `v_rateio_socios`

## Fotografia do seed local

| Entidade | Registros |
|---|---:|
| Clientes | 85 |
| Veículos | 83 |
| Parceiros | 14 |
| Funcionários | 5 |
| Atendimentos | 155 |
| Financeiro | 173 |
| Presença | 50 |
| Movimentos de colaboradores | 6 |

### Atendimentos

- Período: 04/05/2026 a 04/06/2026.
- Valor total: R$ 11.615,00.
- Particular: 90.
- Parceiro: 65.
- Pago: 128.
- Pendente: 27.

### Financeiro

- Período: 04/05/2026 a 04/06/2026.
- Entradas: R$ 9.040,00.
- Saídas: R$ 4.186,52.
- Resultado simples da fotografia: R$ 4.853,48.

## Estado atual da produção

Inventário executado dentro de uma transação PostgreSQL explicitamente `READ ONLY`:

| Entidade | Registros |
|---|---:|
| Clientes | 251 |
| Veículos | 279 |
| Parceiros | 16 |
| Funcionários | 3 |
| Atendimentos | 496 |
| Financeiro | 658 |
| Presença | 156 |
| Movimentos de colaboradores | 0 |
| Usuários no Auth | 2 |
| Objetos no Storage | 0 |

### Atendimentos em produção

- Período: 15/06/2026 a 19/08/2026.
- Valor total: R$ 34.620,00.
- Particular: 302.
- Parceiro: 194.
- Pago: 462.
- Pendente: 34.

### Financeiro em produção

- Período: 15/06/2026 a 19/08/2026.
- Entradas: R$ 34.975,00.
- Saídas: R$ 28.769,18.
- Resultado simples: R$ 6.205,82.

## Backup remoto

- Formato: dump customizado do PostgreSQL (`pg_dump -Fc`).
- Arquivo: `backups/legacy-20260819-212944/legacy-full.dump`.
- Tamanho: 367.777 bytes.
- SHA-256: `833EFBF006548EC59F3AEA600D7AA45E7237F2EC6AB28FFCF36C7BFFD84F5FA4`.
- Catálogo interno: 442 entradas.
- Inclui dados dos schemas `public`, `auth` e `storage`.
- Restauração das tabelas de negócio validada em PostgreSQL local descartável.
- Contêiner de validação removido após o teste.

## Limitações da fotografia local

O seed é uma fotografia local e não representa a produção atual. A comparação comprovou que ele perderia 166 clientes, 196 veículos e 341 atendimentos. Para a migração, a fonte oficial passa a ser o dump remoto validado.

## Próximo gate

Criar um projeto Supabase separado para o NexWash, restaurar/migrar uma cópia e reconciliar os totais acima. O projeto legado permanecerá disponível e sem alterações.
