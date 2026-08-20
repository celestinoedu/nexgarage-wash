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

## Banco de dados

O schema multiloja está em `supabase/nexwash_multistore.sql`. A migração foi aplicada de forma aditiva ao projeto Supabase legado do NexWash: as tabelas originais foram preservadas e os dados foram copiados para a nova estrutura.

Não execute os scripts no Supabase do NexLab. Leia `docs/MIGRACAO-SEGURA.md` antes de qualquer operação com dados reais.

## Publicação

O workflow `.github/workflows/deploy.yml` gera a exportação estática e publica no GitHub Pages. O repositório precisa ter estes secrets:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

O domínio configurado no artefato é `nexwash.lotusnegocios.com`.

## Legado

A pasta `Lava Rapidos/` contém a aplicação e os materiais da operação atual. Ela é uma fonte para regras de negócio e migração, não deve ser publicada junto com o novo frontend e não será modificada durante a construção do NexWash.
