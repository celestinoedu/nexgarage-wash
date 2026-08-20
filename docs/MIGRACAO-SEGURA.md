# Migração segura do NexWash

Este documento é uma barreira operacional: a evolução do NexWash não pode apagar, sobrescrever ou tornar indisponíveis os dados da operação atual da Top Line.

## Estratégia obrigatória

Será utilizada migração **blue/green**:

- **Blue (legado):** aplicação e banco atuais continuam intactos e disponíveis.
- **Green (NexWash):** nova aplicação e novo projeto Supabase são construídos em paralelo.
- Os dados são exportados do Blue e **copiados** para o Green.
- A troca de domínio só ocorre depois da validação funcional e da reconciliação dos dados.
- O Blue permanece preservado durante o período de estabilização e rollback.

O arquivo `supabase/nexwash_multistore.sql` deve ser executado somente no projeto Supabase novo e exclusivo do NexWash.

## Ações proibidas no legado

- Executar `DROP`, `TRUNCATE` ou limpeza em massa.
- Recriar o projeto Supabase atual.
- Aplicar o schema novo diretamente sobre produção.
- Alterar RLS, triggers ou funções da produção sem backup e ensaio em clone.
- Reutilizar credenciais do NexLab para hospedar dados do NexWash.
- Trocar o domínio enquanto a reconciliação estiver incompleta.

## Gate 1 — inventário somente leitura

Antes de exportar, registrar:

- URL/ID do projeto Supabase atual, sem incluir chaves no documento.
- Tabelas, views, funções, triggers e policies existentes.
- Quantidade de registros por tabela.
- Intervalo de datas dos atendimentos e movimentos financeiros.
- Quantidade de usuários no Auth.
- Buckets e arquivos no Storage.
- Relacionamentos órfãos e duplicidades conhecidas.

Nenhuma consulta de inventário pode conter mutações.

## Gate 2 — backups

Gerar e verificar:

1. Dump completo do PostgreSQL, incluindo schema e dados.
2. Exportação CSV individual das tabelas de negócio.
3. Cópia dos arquivos do Storage, caso existam.
4. Registro dos usuários do Auth por mecanismo suportado pelo Supabase.
5. Hash, data, tamanho e local de cada artefato de backup.

O backup deve ser restaurado em ambiente descartável para provar que é utilizável.

## Gate 3 — migração para o ambiente Green

- Criar a conta proprietária e a primeira loja.
- Inserir clientes e guardar um mapa `legacy_id -> new_id`.
- Inserir veículos, parceiros, funcionários e serviços.
- Inserir atendimentos e itens.
- Inserir financeiro, presença e movimentos de colaboradores.
- Preservar datas, valores, status, placas, vínculo com parceiro e snapshot de rateio histórico.
- Não recalcular o histórico financeiro com regras atuais.

## Gate 4 — reconciliação

Os seguintes controles devem coincidir entre legado e NexWash:

- Total de clientes.
- Total de veículos.
- Total de parceiros.
- Total de funcionários.
- Total de serviços.
- Total de atendimentos por mês e por status.
- Soma de atendimentos por mês.
- Total de entradas, saídas e saldo por mês.
- Total pendente por parceiro.
- Presenças e movimentos de colaboradores.
- Amostra manual de pelo menos 20 clientes com todo o histórico.

Diferenças devem ser explicadas e aprovadas antes do corte.

## Gate 5 — corte e rollback

1. Definir uma janela curta de congelamento de escrita no legado.
2. Exportar apenas registros alterados desde a primeira cópia.
3. Reexecutar a reconciliação.
4. Publicar o NexWash e alterar o domínio.
5. Manter o legado em modo somente leitura durante a estabilização.
6. Se houver divergência crítica, reverter o DNS e continuar no Blue.

## Estado atual

- Nenhum SQL foi executado em Supabase.
- Nenhuma credencial do legado ou do NexLab foi copiada para o NexWash.
- Nenhum dado do cliente foi alterado.
- As mudanças atuais estão restritas ao código local do novo NexWash.
