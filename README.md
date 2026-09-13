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

Abra `http://localhost:3000`.

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

## Duas versões no ar

A **versão nova** (Next.js, publicada em `/app`) é a principal: quem abre a raiz do
domínio é levado para ela. A **versão legado** (`index.html` + `js/`) continua servida na
raiz para quem escolher voltar.

- Um alternador no topo de cada versão leva para a outra e grava a escolha em
  `localStorage` (`nexwash:ui-version`), compartilhada pelas duas por estarem na mesma origem.
- Só fica no legado quem escolheu explicitamente. `https://nexwash.lotusnegocios.com/?ui=legado`
  é o caminho direto de volta, e também a saída caso `/app` fique indisponível.
- A cada nova sessão no legado aparece um aviso no canto lembrando que a versão nova é a
  principal. Ele some sozinho em alguns segundos e tem a opção "Não mostrar mais".
- A escolha também fica em **Configurações → Visualização**, nas duas versões.

Para rodar a versão nova localmente no mesmo subcaminho da publicação:

```bash
NEXT_PUBLIC_BASE_PATH=/app npm run build
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
tem acesso. Toda gravação continua indo para uma loja só, escolhida no formulário.

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
