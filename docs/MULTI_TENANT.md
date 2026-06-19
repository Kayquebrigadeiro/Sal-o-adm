# MULTI-TENANT — V2

O sistema foi arquitetado para suportar múltiplos salões em um mesmo banco de dados sem risco de vazamento de dados (Multi-Tenant Compartilhado).

## 1. CONCEITO DE TENANT (INQUILINO)

O **Tenant** do sistema é representado pela entidade **`saloes`**.
Todo novo cliente do SaaS gera uma tupla em `saloes`. A chave primária gerada (UUID) servirá de chave estrangeira mandatória (`salao_id`) para **absolutamente todos** os registros transacionais subsequentes criados por ele ou por seus colaboradores.

## 2. CHAVE MESTRA: `salao_id`

- Todas as tabelas que lidam com dados corporativos, como `profissionais`, `procedimentos`, `atendimentos`, `configuracoes`, `homecare`, e `gastos_pessoais`, possuem obrigatoriamente a coluna `salao_id`.
- Em tabelas auxiliares que não teriam relação direta semântica, a coluna `salao_id` foi incluída (desnormalização controlada) unicamente para simplificar e fortalecer a verificação de segurança em uma única etapa, evitando JOINs complexos durante a resolução do Row Level Security.

## 3. O VÍNCULO DE USUÁRIO

Quando um usuário realiza Login no Supabase Auth, o Front-end recebe seu `auth.uid()`.
A tabela `perfis_acesso` atua como **Pivot** entre a infraestrutura de IAM do Supabase e o núcleo Multi-Tenant.
```text
[auth.users] (id) 1 <---> 1 (auth_user_id) [perfis_acesso] (salao_id) N <---> 1 (id) [saloes]
```

O Frontend nunca deve tentar forçar um `salao_id` arbitrário se não tiver direito. Qualquer requisição da API que omita o `eq('salao_id', id)` ou tente passar um `id` malicioso será barrada severamente pelas Políticas do Banco.

## 4. GESTÃO POR VENDEDORES (SUPER-ADMINS)

Os usuários cujo perfil esteja setado como `cargo = VENDEDOR` não possuem um `salao_id` fixo atrelado.
No entanto, a arquitetura garante o direito a eles de criar tenants e gerenciar os logins primários através do campo `vendedor_id` na tabela `saloes`. 
Isto significa que um Vendedor A só enxergará e administrará as faturas e painéis do Salão X que foi inserido no sistema a partir de seu respectivo Dashboard Admin.
