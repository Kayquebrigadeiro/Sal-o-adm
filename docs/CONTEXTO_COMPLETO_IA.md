# 🧠 CONTEXTO COMPLETO DO SISTEMA: Salão Secreto (SaaS)

Este documento contém o escopo técnico e de negócios completo do sistema. Ele serve como base de conhecimento (Knowledge Base) para Inteligências Artificiais e Desenvolvedores que forem atuar no projeto.

---

## 1. Visão Geral do Produto

O **Salão Secreto** é um sistema SaaS (Software as a Service) *multi-tenant* construído para substituir uma planilha Excel de altíssima complexidade usada por proprietárias de salões de beleza.
O grande diferencial do sistema não é ser apenas uma agenda, mas sim um **Motor de Precificação Financeira Invisível**. Ele automatiza a engenharia reversa de preços, garantindo que a dona do salão nunca tenha prejuízo com taxas de maquininha, comissões, custos fixos (aluguel/água/luz) ou custos variáveis (produtos químicos).

---

## 2. Stack Tecnológica

- **Frontend:** React 18, React Router v7, Tailwind CSS, Vite.
- **Componentes Visuais:** Lucide React (Ícones), Recharts (Gráficos).
- **Backend (BaaS):** Supabase.
- **Banco de Dados:** PostgreSQL (hospedado no Supabase).
- **Segurança:** Supabase Auth + Row Level Security (RLS) rigoroso.
- **Serverless:** Deno Edge Functions (Supabase Functions) para bypass de permissões administrativas.

---

## 3. Atores do Sistema (Roles)

O sistema possui uma hierarquia estrita dividida em três níveis, controlada pelo Supabase Auth + tabela `perfis_acesso` ou `profiles` (`cargo_enum`):

### 👑 VENDEDOR (Super Admin)
- É o dono/franqueador do SaaS.
- **Acesso:** Painel isolado (`/admin/*`).
- **Poderes:** Pode listar, criar e realizar *soft-delete* (`deletado_em`) em salões. Ele configura a base do salão e invoca uma *Edge Function* para criar as credenciais iniciais da Proprietária sem precisar confirmar e-mail.

### 👩‍💼 PROPRIETÁRIA (Admin do Tenant / Salão)
- É a dona do salão de beleza.
- **Acesso:** Total dentro do seu escopo (`salao_id`).
- **Poderes:** Visualiza os dashboards financeiros completos (Lucro Real vs Possível), gerencia a agenda de todos, configura comissões, adiciona custos pessoais (Calculadora de Pró-labore) e cadastra funcionárias.

### ✂️ FUNCIONÁRIA (Staff)
- É a cabeleireira/manicure que trabalha no salão.
- **Acesso:** Restrito à Agenda e visualização apenas de seus próprios atendimentos.
- **Restrições:** Não vê painéis financeiros, lucros do salão ou configurações de sistema.

---

## 4. O Motor Financeiro (Regras de Negócios Core)

Toda a mágica do sistema baseia-se na replicação exata das fórmulas matemáticas da planilha original. Os cálculos ocorrem visualmente no Frontend (para simulação) e de forma atômica no Backend via **Triggers do PostgreSQL**.

### 4.1. Variáveis de Custo em cada Atendimento
Ao salvar um atendimento (ex: "Progressiva"), o valor faturado é fatiado da seguinte forma:
1. **Custo Fixo Rateado:** Por padrão, embute-se **R$ 29,00** por atendimento (Base da conta: R$ 1.750 de aluguel + contas divididos por uma estimativa de 100 atendimentos/mês).
2. **Custo Variável:** Custo do mililitro/dose do produto usado (ex: Pó descolorante).
3. **Taxa da Maquininha:** Calculada simulando o pior cenário padrão (5% de desconto). *Nota da engenharia reversa do Excel: O valor é frequentemente dividido por 0.95.*
4. **Comissão da Profissional:** Porcentagem variável por serviço e profissional (padrão: 40%).

### 4.2. A Regra do Comprimento (P, M, G)
Na beleza, o comprimento dita o gasto de produto e tempo.
- O sistema cadastra apenas o **Preço P (Curto/Base)**.
- O sistema cobra automaticamente **+20%** se for Cabelo **M (Médio)**.
- O sistema cobra automaticamente **+30%** se for Cabelo **G (Longo)**.
- *Exceções:* Procedimentos como 'Coloração' e 'Luzes' fogem à regra dos 20/30%, exigindo a configuração manual dos preços P, M e G.

### 4.3. Lucro Líquido vs Lucro Possível
- **Lucro Líquido Real:** Faturamento Bruto - Maquininha - Comissão - Custo Fixo - Custo Produto.
- **Lucro Possível:** Mesma conta, mas IGNORA a taxa da maquininha. É a métrica usada para motivar a dona a cobrar no PIX ou Dinheiro em espécie.

### 4.4. Calculadora de Pró-labore
A dona do salão costuma misturar o dinheiro pessoal com o da empresa. O sistema tem uma tabela `gastos_pessoais` onde ela lança contas domésticas (escola do filho, mercado).
O Dashboard avalia a **Saúde Financeira**: `Lucro Líquido Total do Salão - Salários Fixos - Despesas do Salão - Gastos Pessoais`. Retornando `VERDE` (está bancando) ou `VERMELHO` (está pagando para trabalhar).

---

## 5. Arquitetura do Banco de Dados (Multi-Tenant)

Todas as tabelas operacionais possuem uma coluna `salao_id`. O isolamento é estritamente garantido por políticas **RLS (Row Level Security)**.

### Tabelas Principais:
1. `saloes`: Tenant principal (id, nome, vendedor_id, ativo, deletado_em).
2. `perfis_acesso`: Mapeamento de usuários (auth_user_id, salao_id, cargo).
3. `configuracoes`: (1:1 com salao) Guarda custo_fixo, taxa_maquininha padrão.
4. `profissionais`: A equipe do salão, seus cargos e salário_fixo.
5. `procedimentos`: Tabela de catálogo (nome, preco_p, preco_m, preco_g, custo_variavel, porcentagem_profissional).
6. `atendimentos`: Coração da agenda e do financeiro.
7. `despesas`: Gastos fixos da operação do salão (Aluguel comercial, Energia, etc).
8. `gastos_pessoais`: Custos da vida privada da dona (para a calculadora de pró-labore).
9. `homecare` / `procedimentos_paralelos`: Vendas de produtos extras e serviços terceirizados (ex: manicure terceirizada).

### Segurança RLS
Nenhum usuário pode ver dados de outro salão. A policy comum é:
```sql
create policy "Isolar dados por salao" on TABELA
for all to authenticated
using (salao_id IN (select salao_id from perfis_acesso where auth_user_id = auth.uid()));
```

### O Gatilho Financeiro (Trigger Automático)
O backend protege a consistência dos dados. Sempre que ocorre um `INSERT` ou `UPDATE` em `atendimentos`, o trigger `fn_calcular_atendimento()` é disparado. Ele busca a tabela de `configuracoes` e `procedimentos`, recálcula o preço, os custos, taxas da maquininha e oficializa o Lucro Líquido e Lucro Possível atomicamente no registro.

---

## 6. Edge Functions (Serverless Supabase)

Como o App usa a restrição de que apenas usuários com a Service Role Key podem gerenciar diretamente a tabela de autenticação (`auth.users`), utilizamos Edge Functions escritas em Deno (TypeScript).

- `criar-proprietaria` / `criar-admin`: Burlam a segurança do client-side. Um Vendedor autenticado chama a Edge Function, que utiliza a Admin API (`@supabase/supabase-js`) para criar o e-mail/senha da dona do salão sem precisar de link de verificação, inserindo automaticamente na tabela `perfis_acesso`.
- `deletar-salao`: Deleta o Tenant e faz a limpeza em cascata, removendo todos os perfis associados da `auth.users` de forma limpa.

---

## 7. Estrutura do Frontend (React)

O App é envelopado e consome o Supabase via `supabaseClient.js`. A injeção de rotas detecta o cargo do usuário logo no Login:

### Se `cargo === 'VENDEDOR'`:
Renderiza `<VendedorApp />` montando as rotas `/admin/*`:
- `/admin/saloes`: `<MeusSaloes />` (Dashboard e lista de Tenants).
- `/admin/novo-salao`: `<NovoSalao />` (Wizard complexo de 5 passos configurando o nome, procedimentos, custos iniciais e gerando a senha randomizada da proprietária).
- `/admin/admins`: `<GerenciarAdmins />` (Manejo de outros usuários de nível vendedor).

### Se `cargo === 'PROPRIETARIO'` ou `'FUNCIONARIO'`:
Renderiza a aplicação Padrão:
- `Sidebar.jsx`: Menu lateral dinâmico baseado em cargo (usando ícones `lucide-react`).
- `/agenda`: `<Agenda />` Modal preditivo que avisa o lucro no ato do clique (consulta no frontend as regras antes de salvar).
- `/dashboard`: `<Dashboard />` Gráficos (usando `recharts`), Resumo Financeiro, Saúde da Empresa.
- `/configuracoes`: `<Configuracoes />` Abas (Procedimentos, Equipe, Horários, Despesas Pessoais e do Salão). Usa sistema de Edição *Inline* (auto-save no `onBlur` via `<CelulaEditavel />`).

---

## 8. Padrões de Design e UX Acordados

1. **Feedback Visual Imediato:** Qualquer save em configurações não usa um botão global de salvar. Usa `onBlur` + mini-toast "✓ Salvo" na célula (ver `<CelulaEditavel />`).
2. **Identidade Visual Admin vs Salão:**
   - Vendedor usa painel com tons de `slate-900` e barras com indicação "PAINEL DO ADMIN".
   - Proprietárias usam a cor `emerald` e tons leves (`slate-50`) com focos em botões verdes para remeter à fluidez e positividade financeira.
3. **Resiliência a Erros:** Nunca travar o app se faltar uma configuração. O sistema assume métricas base (como +20% para Médio e 5% de maquininha) até que se ajuste.