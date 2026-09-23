# Migração de dados do negócio — 23/09/2026

Foi criada a tabela `public.business_profiles`, vinculada à conta e
compartilhada por todas as lojas. Ela armazena nome fantasia, razão social,
CNPJ, inscrições estadual e municipal, contatos, site e endereço.

A migração é aditiva e usa RLS:

- membros da conta podem consultar os dados usados nos documentos;
- proprietários e administradores podem cadastrar e alterar os dados;
- o `account_id` referencia `public.accounts` e é a chave primária.

Antes da aplicação foi gerado o backup completo
`backups/business-profile-20260923-133146/full-before.dump`.

Contagens antes e depois:

- contas: 1;
- lojas: 2;
- atendimentos: 679;
- financeiro: 923.

O cadastro inicial foi criado para a conta Top Line com nome fantasia
`TOP LINE HIGIENIZAÇÕES`. Os demais campos ficam disponíveis em
**Configurações → Dados do negócio**.
