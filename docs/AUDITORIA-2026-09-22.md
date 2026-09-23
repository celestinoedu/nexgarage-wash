# Auditoria funcional NexWash — 22/09/2026

## Retificação após revisão visual do usuário

A tentativa de obter paridade substituindo a aplicação React por uma apresentação
estilizada do legado foi incorreta e foi revertida. A tela de login e todas as
páginas modernas originais permaneciam no código, mas não eram montadas pelo
layout. O layout voltou a montar `AuthProvider`, `StoreProvider` e suas páginas.
`/app` agora serve a aplicação React original e o alternador aponta para ela.

O legado é a **referência funcional**, não um substituto da identidade visual nova.
Os ajustes de compartilhamento/PDF no legado foram preservados. A integração
nas páginas React e a auditoria de paridade da interface moderna seguem pendentes.
Não interpretar os testes anteriores sobre o legado estilizado como homologação
da interface React restaurada.

A aplicação React consulta `customers`, `vehicles`, `partners`, `service_orders`
e `financial_transactions`, enquanto o legado usa `clientes`, `carros`,
`parceiros`, `atendimentos` e `financeiro`. Essa diferença continua exigindo
tratamento para paridade, preservando as interfaces e os dados existentes.

Nenhuma tabela foi apagada e nenhuma publicação foi realizada. Após autorização
do usuário, a migração de compartilhamento foi aplicada no banco real em
22/09/2026, preservando os valores e registros existentes. Consulte
[Migração aplicada](MIGRACAO-COMPARTILHAMENTO-2026-09-22.md).

## Diferenças encontradas — paridade ainda pendente nas páginas React

| Fluxo | Diferença na implementação React anterior | Tratamento |
|---|---|---|
| Cadastros | Parceiros sempre por conta, sem opção por loja; veículos por loja | Cadastro único no legado, compartilhamento editável com padrão habilitado |
| Atendimento | Seleção de catálogo em fluxo diferente; sem busca/cadastro rápido equivalente por placa | Reuso integral do Novo Registro do legado |
| Desconto | Desconto global, sem a mesma edição de itens do legado | Preservados valores livres e descontos por item |
| Agenda | Sem tela equivalente de agenda, conclusão e cancelamento | Tela Agenda do legado disponível nas duas apresentações |
| Parceiros | Sem extrato e cobrança equivalentes | Extrato e cobrança do legado preservados |
| Equipe | Funcionalidades de presença e vales diferentes | Funcionários, presença e vales do legado preservados |
| Financeiro | Totais calculados sobre outra estrutura; sem a mesma divisão dos sócios | Financeiro, fechamentos e divisão do legado em ambas |
| Relatórios | Indicadores sem filtros equivalentes nem emissão PDF | Excel preservado; PDF por OS e por período/parceiro adicionado |
| Recursos de oficina | Kanban, peças, estoque e laudos sem equivalência necessária | Fora da navegação operacional; links antigos retornam ao início |

## Correções adicionais nos fluxos compartilhados

- OS numerada no servidor sob bloqueio transacional por loja; não depende de uma
  amostra de 500 registros lida pelo navegador.
- Botão de emissão bloqueado durante a gravação, evitando duplo clique.
- Falha ao gerar ou consultar o PDF após a gravação não apresenta a OS como
  não salva. O usuário pode reemitir o documento sem criar outro atendimento.
- Trocar a loja do formulário limpa seleções e recarrega clientes e parceiros.
- Catálogo de serviços filtrado pela loja de destino.
- Busca por placa descarta respostas obsoletas; trocar tipo não reaproveita o
  veículo particular em uma OS de parceiro.
- Edição livre de descrição/valor limpa itens antigos incompatíveis com o PDF.
- Relatório de período consulta páginas sucessivas, sem corte em 1.000 registros,
  filtra no banco por data/parceiro/lojas e soma valores em centavos.

## Verificações anteriores — legado e apresentação estilizada descartada

- Build Next.js e TypeScript, incluindo publicação sob `/app`.
- ESLint sem erros; avisos preexistentes no legado e arquivo histórico.
- PostgreSQL descartável via PGlite: migração aplicada e reaplicada; padrão true;
  consultas em outra loja da mesma conta; isolamento entre contas; rejeição de
  cliente/parceiro de outra conta; rejeição de operação sem permissão; desativação
  do compartilhamento; manutenção das OS anteriores; entrada financeira criada
  somente para OS paga; numeração distinta. Script: `npm run test:catalog`.
- Playwright com Supabase simulado e registros fictícios: 11 telas principais
  abriram em cada apresentação, sem erros de carregamento ou console.
- Cadastros de parceiro e carro com checkbox marcado por padrão e envio de false
  ao desmarcar; geração automática de PDF após criar uma OS por placa.
- Falha de logo simulada: OS permaneceu salva, sem duplicação, com mensagem de
  reemissão do PDF; rota de novo atendimento voltou à lista sem reabrir formulário.
- Download de PDF por parceiro e mês; relatório com 1.101 OS em 95 páginas,
  incluindo todas as OS sem repetição, excluindo registro fora do período,
  total R$ 99.090,00, pago R$ 49.500,00 e pendente R$ 49.590,00.
- Inspeção visual de OS, cabeçalho com logo Top Line, acentuação, valores e rodapé;
  confirmação de imagens em todas as páginas do relatório longo.
- Verificação de largura de 390 pixels sem transbordamento horizontal.

Artefatos locais de teste ficam em `output/playwright/` (ignorados pelo Git).
Esses testes não constituem homologação da base real nem de todas as permissões
ou integrações externas da produção. O ensaio PostgreSQL usa as tabelas originais
e permissões simuladas; não é uma restauração integral de produção.

## Ativação — migração aplicada, integração React pendente

Os passos de backup, ensaio e aplicação SQL abaixo foram concluídos em 22/09/2026.
A homologação completa da interface React e sua integração continuam pendentes.

1. Obter backup atual e ensaiar em clone, conforme `MIGRACAO-SEGURA.md`.
2. Conferir cadastros que existam somente nas tabelas React anteriores. Não há
   importação reversa automática nem exclusão dessas tabelas nesta mudança.
3. Aplicar `supabase/nexwash_shared_catalog.sql` depois das migrações multiloja
   do legado e da função de emissão. Conferir roles e policies reais.
4. Homologar com acessos reais das duas lojas, inclusive financeiro, presença,
   agenda, logo de cada loja e alternância de apresentação.
5. Concluir e homologar a integração nas páginas React antes de publicar. Não publicar o frontend antes do SQL.

Para reverter apenas o frontend, recuperar a revisão anterior. O SQL é aditivo;
não reverter por exclusão de tabelas ou limpeza de dados. O compartilhamento
existente pode ser desabilitado nos cadastros sem apagar históricos.
