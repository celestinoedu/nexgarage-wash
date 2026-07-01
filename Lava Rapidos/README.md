# Lava Rápidos — Top Line Higienizações

Sistema simples de gestão para lava-rápido / higienização automotiva: clientes,
parceiros, carros, funcionários, serviços, atendimentos (OS), financeiro com
distribuição de lucro dos sócios, presença e um quadro de **oportunidades**
(clientes há 15+ dias sem lavar).

Frontend em **HTML/CSS/JS puro** (sem build) + **Supabase** (Postgres privado,
login e Row Level Security). Pode ser publicado em GitHub Pages, Cloudflare
Pages ou Netlify — **mas os dados ficam no Supabase, nunca no repositório.**

```
Lava Rapidos/
├── DUH.xlsm                # planilha original (NÃO versionar)
├── app/                    # ← isto é o que se publica (frontend estático)
│   ├── index.html
│   ├── styles.css
│   ├── config.example.js   # modelo de credenciais
│   ├── config.js           # SUAS credenciais (gitignored)
│   └── js/{app,novo,db,ui}.js
├── supabase/
│   ├── schema.sql          # estrutura do banco + RLS + views
│   └── seed.sql            # dados migrados da planilha (gerado; NÃO versionar)
└── scripts/migrate_planilha.py
```

---

## ⚠️ Sobre publicar com dados públicos (leia antes de subir)

GitHub Pages é **hospedagem estática pública**. Se você colocar os dados (planilha,
JSON, `seed.sql`) dentro do repositório, **tudo fica visível na internet e indexável
pelo Google** — incluindo nomes, telefones e placas dos clientes (dados pessoais
protegidos pela **LGPD**) e seus números financeiros/societários.

Por isso esta versão guarda os dados no **Supabase** (banco privado, com login).
O frontend é "burro": só conversa com o Supabase depois que alguém faz login. A
`anon key` que vai no `config.js` é pública por design e **só funciona** porque o
RLS exige usuário autenticado para ler/gravar qualquer linha.

**Regras de ouro:**
- Publique **apenas a pasta `app/`** (sem `config.js`, sem a planilha, sem `seed.sql`).
- `DUH.xlsm`, `seed.sql` e `config.js` estão no `.gitignore`. Não force o commit deles.
- Nunca coloque a **service_role key** no frontend (ela ignora o RLS).

---

## Passo a passo (≈ 10 min)

### 1. Criar o projeto Supabase
1. Acesse https://supabase.com → New project (free tier).
2. Em **Project Settings → API**, copie a **Project URL** e a **anon public key**.

### 2. Criar a estrutura do banco
No painel do Supabase → **SQL Editor** → New query → cole o conteúdo de
`supabase/schema.sql` → **Run**. Isso cria as tabelas, o RLS e o catálogo inicial
de serviços.

### 3. Migrar os dados da planilha (opcional, mas recomendado)
```bash
pip install openpyxl
cd "Lava Rapidos/scripts"
python migrate_planilha.py        # gera ../supabase/seed.sql
```
Depois, no **SQL Editor**, cole o conteúdo de `supabase/seed.sql` → **Run**.
(O `seed.sql` é grande; pode rodar em partes se o editor reclamar.)

### 4. Criar os usuários (sócios e funcionários)
No Supabase → **Authentication → Users → Add user** (email + senha) para Rennan,
Yuri e quem mais for usar. Não há cadastro aberto: só esses usuários entram.

### 5. Configurar o frontend
```bash
cd "Lava Rapidos/app"
copy config.example.js config.js      # Windows  (cp no Linux/Mac)
```
Edite `config.js` com a URL e a anon key do passo 1.

### 6. Rodar localmente
Sirva a pasta `app/` por HTTP (módulos ES não funcionam abrindo o arquivo direto):
```bash
cd "Lava Rapidos/app"
python -m http.server 8080
```
Abra http://localhost:8080 e faça login.

---

## Deploy (free tier sustentável)

### Opção recomendada — Cloudflare Pages ou Netlify (drag-and-drop)
1. Crie um site novo e aponte a **pasta de publicação** para `Lava Rapidos/app`.
2. Configure o `config.js` no ambiente (ou suba junto — a anon key é pública).
3. Pronto: HTTPS, CDN e domínio grátis, sem expor planilha nenhuma.

### GitHub Pages
Funciona, **desde que** você publique só o conteúdo de `app/`. O mais seguro é um
repositório separado (ou branch `gh-pages`) contendo **apenas** os arquivos de
`app/`. Nunca aponte o Pages para a raiz deste projeto (a planilha está aqui).

---

## Regras de negócio implementadas

- **Novo Registro**: escolhe Particular ou Parceiro.
  - *Particular*: digita a placa e busca. Se existe, puxa cliente/veículo. Se não,
    permite vincular a um cliente existente ou cadastrar um cliente novo + a placa.
  - *Parceiro*: seleciona na lista (ou cria na hora), informa veículo/placa. O
    serviço entra no **extrato do parceiro** para cobrança posterior.
- **Distribuição de lucro** (sobre as entradas):
  - Cliente **base antiga** (tag *Yuri*): **Rennan 40% / Yuri 60%**.
  - Demais (sem tag): **Rennan 50% / Yuri 50%**.
  - A flag "base antiga" fica no cadastro do cliente e é "fotografada" em cada
    atendimento, mantendo o rateio histórico fiel.
- **Oportunidades**: clientes particulares com 15+ dias desde a última lavagem,
  com botão de WhatsApp para reconquista.
- **Presença**: marcação Presente/Falta por dia, por funcionário.
- **Financeiro**: entradas, saídas, resultado do mês e caixa acumulado.

> Observação: o rateio é calculado **sobre as entradas** (como descrito pelo cliente).
> Se quiser que seja sobre o lucro líquido (entradas − saídas), é um ajuste de uma
> linha na view `v_rateio_socios` do `schema.sql`.
