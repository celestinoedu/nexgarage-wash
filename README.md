# NexGarage

Sistema web para oficinas mecânicas da LOTUS NEGOCIOS LTDA.

## Stack

- Next.js 16
- React 19
- Tailwind CSS
- Supabase/PostgreSQL preparado em `supabase/schema.sql`
- Deploy previsto na Vercel

## Rodar localmente

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`.

## Rodar a versão leve

```bash
npm run lite
```

Abra `http://localhost:3030`.

A versão em `lite/` usa HTML, CSS e JavaScript puro com um backend Node.js sem dependências. Ela é a base recomendada para uma experiência mais rápida em computadores simples e celulares.

## MVP implementado

- Login visual em `/login`
- Dashboard operacional e financeiro em `/dashboard`
- Kanban de OS com drag and drop em `/kanban`
- Ordens de serviço em `/orders`, `/orders/new` e `/orders/[id]`
- Clientes, carros, peças, serviços, mecânicos e fornecedores
- Gestão de estoque com alerta de reposição
- Laudos técnicos
- Financeiro e relatórios
- Permissões e dados da oficina em ajustes
- Seed local em TypeScript com oficina, clientes, carros, mecânicos, peças, serviços, OS, estoque, financeiro e laudos

## Supabase

1. Crie um projeto no Supabase.
2. Execute o SQL de `supabase/schema.sql`.
3. Copie `.env.example` para `.env.local`.
4. Preencha `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

Nesta primeira versão a interface usa dados locais de `src/lib/data.ts`, mantendo a UI e o domínio prontos para plugar Supabase nas próximas iterações.
