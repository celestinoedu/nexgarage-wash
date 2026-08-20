# Arquitetura multiloja do NexWash

## Hierarquia

```text
Conta do cliente
├── Proprietários e administradores da conta
├── Loja A
│   └── Administradores, gerentes, operadores, financeiro e leitores
└── Loja B
    └── Administradores, gerentes, operadores, financeiro e leitores
```

Um usuário pode pertencer à conta e receber acesso a uma ou mais lojas. Proprietários e administradores da conta enxergam todas as lojas. Os demais usuários enxergam apenas as lojas presentes em `store_memberships`.

## Isolamento

Todo registro operacional possui `store_id`. O frontend informa a loja selecionada e o PostgreSQL valida o acesso com Row Level Security. Alterar o `store_id` de um registro existente é bloqueado por trigger.

As credenciais públicas do Supabase não são uma autorização. O isolamento depende das policies e das funções `has_store_access`, `can_operate_store`, `can_manage_store` e `can_manage_finance`.

## Papéis

- `owner`: proprietário da conta, acesso a todas as lojas e cobrança.
- `admin` da conta: gerencia lojas e usuários.
- `admin` da loja: gerencia uma loja e seus usuários.
- `manager`: gerencia operação e equipe da loja.
- `operator`: registra clientes, veículos e atendimentos.
- `finance`: acessa e movimenta o financeiro.
- `viewer`: somente leitura.

## Módulos do domínio

- Clientes e múltiplos veículos.
- Parceiros e extratos.
- Catálogo de serviços de lavagem e estética.
- Atendimentos presenciais, agendados ou de parceiro.
- Fila operacional: aguardando, lavagem, acabamento, pronto e entregue.
- Equipe, presença, vales, pagamentos e comissão.
- Financeiro por loja.
- Oportunidades de reconquista por dias sem visita.
- Configurações independentes por loja.

O rateio histórico específico da Top Line é armazenado como snapshot no atendimento. Regras novas ficam em `store_settings`, evitando acoplar todos os clientes NexWash à mesma regra societária.
