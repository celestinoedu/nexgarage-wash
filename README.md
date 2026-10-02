# NexWash

Plataforma multiloja da Lotus Negócios para lava-rápidos e estética automotiva.

## Stack

- Next.js 16 e React 19
- TypeScript e Tailwind CSS
- Supabase Auth/PostgreSQL com Row Level Security
- Deploy estático no GitHub Pages, com dados e autenticação no Supabase

## Desenvolvimento local

```bash
npm install
npm run dev
```

Abra `http://localhost:4321` (legado) ou `http://localhost:4321/?ui=nova`.

## Estrutura do produto

- Dashboard operacional responsivo
- Atendimentos presenciais, agendados e de parceiros
- Clientes e múltiplos veículos
- Catálogo de lavagem, higienização e estética
- Parceiros e oportunidades de reconquista
- Equipe, presença e movimentos de colaboradores
- Financeiro e relatórios por loja
- Conta com múltiplas lojas e acessos distintos por usuário
- Central de configurações da conta, lojas, usuários, segurança e plano
- Escopo de dados por loja ou consolidado entre todas as lojas

## Duas versões preservadas

O **legado é a referência funcional**. A versão nova mantém sua interface Next.js
original: login, identidade visual, dashboard, navegação e demais páginas React.
Paridade funcional significa corrigir os fluxos nessa interface, sem substituí-la
por uma versão estilizada do legado.

- `/?ui=legado` abre a aplicação tradicional.
- `/app/login/` abre o login moderno original.
- `/?ui=nova` encaminha para `/app/dashboard/`.
- O alternador e Configurações → Visualização salvam `nexwash:ui-version`.
- `Lava Rapidos/` permanece como arquivo histórico, sem modificações.

A substituição da interface moderna por redirecionamento foi revertida após a
revisão visual do usuário. As mudanças de compartilhamento e PDF descritas abaixo
estão implementadas no **legado**. Sua integração nas páginas React e a auditoria
de paridade da versão nova ainda não estão concluídas. Consulte
[a auditoria, retificação e limites da validação](docs/AUDITORIA-2026-09-22.md).

## Compartilhamento e PDFs

Parceiros e carros têm **Mostrar em todas as lojas**, habilitado por padrão e
editável no cadastro. O cadastro é único; a loja de origem é preservada. O dono de
um carro compartilhado pode ser identificado na outra loja, mas atendimentos,
presença e financeiro continuam isolados por loja. O compartilhamento nunca cruza
contas. Desabilitar a opção limita novos usos à loja de origem, sem apagar OS.

Ao salvar uma OS, o PDF não é baixado automaticamente. A lista de **Atendimentos**
possui um botão para baixar o PDF de cada OS quando necessário. A central de
relatórios permite escolher mês ou datas e parceiro, seguindo o filtro de lojas,
com total pago e pendente. Os PDFs usam o cadastro de **Configurações → Dados do
negócio** no cabeçalho: nome fantasia,
razão social, CNPJ, e-mail e telefone. Campos vazios são omitidos.

Antes de publicar, aplicar `supabase/nexwash_shared_catalog.sql` após backup e
ensaio em clone, conforme `docs/MIGRACAO-SEGURA.md`. A migração é aditiva e
reaplicável, habilita o compartilhamento dos cadastros existentes e atualiza a
emissão atômica de OS. **Aplicada em produção em 22/09/2026, com backup, restauração e ensaio prévios.**
Consulte [o registro da execução](docs/MIGRACAO-COMPARTILHAMENTO-2026-09-22.md).
Não publicar o frontend antes da migração: as consultas dependem dos novos campos
`account_id`, `show_all_stores` e da função `list_legacy_customers`.

O gerador PDF é `jspdf`, com versão fixa em `package-lock.json`. O bundle UMD e sua
licença ficam em `assets/vendor/`, para não depender de CDN durante a emissão.
Ao atualizar o pacote, copiar novamente o bundle e a licença de `node_modules/jspdf`.

O cadastro empresarial exige `supabase/nexwash_business_profile.sql`. A migração
foi aplicada em produção em 23/09/2026 após backup completo e preservou as
contagens de atendimentos e financeiro.

```bash
npm run test:catalog # PostgreSQL descartável, sem acesso à produção
npm run lint
npm run preview      # build da interface moderna /app e servidor na porta 4321
```

## Escopo de dados: por loja ou consolidado

Disponível nas **duas versões**, em **Configurações → Visualização**:

- **Uma loja por vez** — comportamento atual: cada página mostra só a loja selecionada.
- **Todas as lojas consolidadas** — as páginas somam os dados de todas as lojas
  permitidas, ganham uma barra de filtro por loja e cada registro exibe uma etiqueta
  com a loja de origem. Formulários de cadastro passam a pedir a loja de destino.

A escolha fica em `nexwash:store-scope` e o filtro ativo em `nexwash:store-filter` —
as mesmas chaves nas duas versões. As consultas continuam protegidas pela RLS: a visão
consolidada apenas amplia o `store_id` consultado para as lojas às quais o usuário já
tem acesso. Atendimentos e movimentos continuam vinculados à loja escolhida no formulário.
Parceiros e carros podem ser compartilhados sem duplicação, conforme descrito acima.

## Dados do usuário

**Configurações → Minha conta** (nova) / **Configurações → Meus dados** (legado) permite
editar nome, CPF, telefone, WhatsApp, data de nascimento e e-mail. O nome salvo é o que
aparece na saudação do painel. Trocar o e-mail dispara a confirmação do Supabase.

Os campos CPF, WhatsApp e data de nascimento exigem a migração
`supabase/nexwash_profile_fields.sql`. Enquanto ela não for aplicada, as duas versões
escondem esses campos e seguem salvando nome e telefone.

## Banco de dados

O schema multiloja está em `supabase/nexwash_multistore.sql`. A migração foi aplicada de forma aditiva ao projeto Supabase legado do NexWash: as tabelas originais foram preservadas e os dados foram copiados para a nova estrutura.

Não execute os scripts no Supabase do NexLab. Leia `docs/MIGRACAO-SEGURA.md` antes de qualquer operação com dados reais.

## Publicação

O workflow `.github/workflows/deploy.yml` publica o legado na raiz e a exportação
estática da versão nova em `/app`, no mesmo artefato do GitHub Pages. O repositório
precisa ter estes secrets:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

O domínio configurado no artefato é `nexwash.lotusnegocios.com`.

## Legado

A pasta `Lava Rapidos/` contém a aplicação e os materiais da operação atual. Ela é uma fonte para regras de negócio e migração, não deve ser publicada junto com o novo frontend e não será modificada durante a construção do NexWash.
