# PROMPT MESTRE — SaaS para Salões de Beleza
## Baseado na planilha Excel original (análise completa das 9 abas, incluindo 4 ocultas)

---

## CONTEXTO DO PRODUTO

Você vai construir um sistema SaaS web para gerenciamento de salões de beleza.
O produto substitui uma planilha Excel complexa e será vendido por assinatura mensal.

**Stack obrigatória:**
- Frontend: React + Vite + Tailwind CSS
- Backend/DB: Supabase (PostgreSQL + Auth + RLS)
- Hospedagem: Vercel (frontend grátis)
- Sem backend próprio — tudo via Supabase client-side

**Modelo de negócio:**
- O VENDEDOR vai ao salão, cria a conta da dona, configura o sistema e entrega pronto.
- A DONA do salão usa o sistema diariamente e paga mensalidade.
- As FUNCIONÁRIAS podem ter acesso à agenda (sem ver financeiro).
- Painel ADMIN do vendedor para gerenciar múltiplos salões clientes (fase futura).

---

## PERFIS DE ACESSO (3 NÍVEIS)

### 1. VENDEDOR (super admin — fase futura)
- Cria novos salões no sistema
- Acessa painel com lista de todos os clientes (salões)
- Pode entrar em qualquer salão para suporte
- Gerencia assinaturas e pagamentos

### 2. PROPRIETÁRIA (dono do salão)
- Acesso total: agenda, financeiro, dashboard, configurações
- Única que vê o DASHBOARD FINANCEIRO (aba secreta protegida por senha no Excel)
- Cadastra e edita profissionais, procedimentos e preços
- Visualiza lucro real, lucro possível, saúde financeira
- Vê o pró-labore e a comparação com gastos pessoais

### 3. FUNCIONÁRIA (colaboradora)
- Acesso APENAS à agenda do dia
- Pode ver e lançar atendimentos do dia
- NÃO vê: financeiro, lucros, dashboard, configurações
- NÃO pode alterar preços ou procedimentos

**Implementação de segurança:**
- Supabase Auth com campo `role` na tabela `profiles` (PROPRIETARIO | FUNCIONARIO | VENDEDOR)
- Row Level Security (RLS) com `authenticated` — nunca `anon`
- Trigger no Supabase que cria o perfil automaticamente ao criar usuário
- O campo `salao_id` em todas as tabelas garante isolamento multi-tenant

---

## BANCO DE DADOS COMPLETO

### Tabela: `saloes`
```sql
id uuid PK
nome text
created_at timestamptz
```

### Tabela: `configuracoes` (1 linha por salão)
```
salao_id uuid FK
nome_salao text
custo_fixo_por_atendimento numeric default 29.00  -- R$29 fixo por atendimento (aluguel rateado)
taxa_maquininha_pct numeric default 5.00           -- 5% descontado (fórmula /95% do Excel)
prolabore_mensal numeric default 0                 -- quanto a dona precisa retirar
```

### Tabela: `profissionais`
```
id, salao_id, nome, cargo (PROPRIETARIO|FUNCIONARIO), salario_fixo, ativo
-- Dados iniciais: Teta (proprietária R$0), Yara R$900, Geovana R$560, Quinha R$230, Mirelly R$800
```

### Tabela: `procedimentos`
```
id, salao_id, nome, categoria (CABELO|UNHAS|SOBRANCELHAS|CILIOS|OUTRO)
requer_comprimento boolean
preco_p, preco_m, preco_g         -- preço por comprimento de cabelo
custo_variavel                     -- custo do produto usado
porcentagem_profissional default 40 -- % que vai para quem executou
ativo boolean
```

**Dados iniciais completos extraídos da planilha (aba VALORES):**
```
Progressiva S/F  | CABELO | P/M/G | custo=135/app  | 40%
Progressiva C/F  | CABELO | P/M/G | custo=220/15app| 40%
Botox            | CABELO | P/M/G | custo=190/12app| 40%
Fusion           | CABELO | P/M/G | custo=950/120app| 40%
Detox            | CABELO | P/M/G | custo=600/90app| 40%
Plástica dos Fios| CABELO | P/M/G | custo=750/90app| 40%
Hidratação       | CABELO | P/M/G | custo=375/80app| 40%
Nutrição         | CABELO | P/M/G | custo=375/80app| 40%
Reconstrução     | CABELO | P/M/G | custo=450/70app| 40%
Kit Lavatório    | CABELO | P/M/G | custo=280/150app| 40%
Relaxamento      | CABELO | sem comprimento | custo=0 | 40%
Coloração        | CABELO | P/M/G | custo=28/app   | 40%  -- produto: OX R$69/10app
Luzes            | CABELO | P/M/G | custo var       | 40%  -- pó descolorante R$130/3app + OX
Corte            | CABELO | sem comprimento | custo=200/300app | 40%
Unhas            | UNHAS  | sem comprimento | custo=4/1app | 40%
Sobrancelha      | SOBRANCELHAS | sem compr | custo=2 | 40%
Extensão de Cílios | CILIOS | sem compr | custo=50 | 40%
Busso            | SOBRANCELHAS | sem compr | custo=3 | 40%
Axila            | OUTRO | sem compr | custo=3 | 40%
Cílios           | CILIOS | sem compr | custo=2 | 40%
Depilação        | OUTRO | sem compr | custo=8 | 40%
```

### Tabela: `atendimentos` (coração do sistema = aba CONTROLE do Excel)
```
id, salao_id, data, horario, profissional_id FK, procedimento_id FK
comprimento (P|M|G|null)
cliente text
valor_cobrado numeric          -- preenchido automaticamente pela tabela, editável
valor_maquininha numeric       -- calculado: valor_cobrado × 5%
valor_profissional numeric     -- calculado: valor_cobrado × 40%
custo_fixo numeric             -- R$29 sempre
custo_variavel numeric         -- custo do produto do procedimento
lucro_liquido numeric          -- cobrado - maquininha - profissional - custo_fixo - custo_variavel
lucro_possivel numeric         -- cobrado - profissional - custo_fixo - custo_variavel (sem maquininha)
pago boolean default false
executado boolean default false
status (AGENDADO|EXECUTADO|CANCELADO)
obs text
```

**Trigger automático:** ao inserir/editar atendimento, calcular todos os campos de valor.

### Tabela: `homecare` (aba HOME CAR)
```
id, salao_id, data, cliente, produto, custo_produto, valor_venda
valor_pago, valor_pendente (generated), lucro (generated), obs
```

### Tabela: `procedimentos_paralelos` (aba PROCED PARALELO)
```
id, salao_id, data, profissional_id, descricao, cliente
valor, valor_pago, valor_pendente (generated)
```

### Tabela: `despesas`
```
id, salao_id, data, descricao, tipo (enum), valor, pago boolean
```
**Tipos:** ALUGUEL, ENERGIA, AGUA, INTERNET, MATERIAL, EQUIPAMENTO, FORNECEDOR, FUNCIONARIO, OUTRO

**Despesas fixas mensais reais extraídas da planilha (aba VALORES/DESPESAS):**
- Aluguel: R$1.750
- Energia: R$190
- Água: R$120
- Internet: R$150
- Produtos de limpeza: ~R$55 (detergente, papel, desinfetante, cândida, sabão)
- Alimentação do estúdio: R$200
- Sistema do estúdio: R$100
- Acessórios fixo: R$100
- Cápsula de café: R$15/10 × dias úteis

### Views para o dashboard (equivalente às abas ocultas DADOS + GRAFICOS-FECHAMENTO):

**`fechamento_mensal`** — agrega por mês:
- receita_bruta, receita_recebida, pendencias
- total_maquininha, total_profissionais, total_custo_fixo, total_custo_variavel
- lucro_liquido, lucro_possivel
- receita_homecare, lucro_homecare, pendente_homecare
- receita_paralelos, pendente_paralelos
- total_despesas, total_salarios_fixos
- receita_total (todas as fontes somadas)
- saude_financeira = lucro_liquido + lucro_homecare - despesas - salários_fixos

**`rendimento_por_profissional`** — por mês e profissional:
- total_atendimentos, receita_gerada, rendimento_variavel (comissão), rendimento_total

**`ranking_procedimentos`** — por mês:
- procedimento, quantidade, receita_total, lucro_total, ticket_medio

---

## MÓDULOS DO SISTEMA (telas)

### 1. LOGIN
- Email + senha
- Botão "Entrar"
- Redireciona: PROPRIETARIA → dashboard, FUNCIONARIA → agenda
- Sem opção de cadastro público (só o vendedor cria usuários)

### 2. AGENDA (= aba "AGENDA DISPONÍVEL" do Excel)
- Grade de horários × profissionais (colunas = cada profissional ativo)
- Horários: 08:00 até 19:00 em intervalos de 30min
- Navegação por dia (‹ › + botão Hoje)
- Totalizador no topo: "Total do dia: R$ X,XX"
- Cores dos cards por status:
  - 🔵 Azul claro = AGENDADO (só marcado, não executado)
  - 🟡 Amarelo = EXECUTADO (serviço feito, aguardando pagamento)
  - 🟢 Verde = PAGO (finalizado)
  - ⚫ Cinza riscado = CANCELADO
- Clicar em slot vazio → abre modal de novo agendamento
- Clicar em atendimento existente → abre modal de detalhes/ações

**Modal Novo Agendamento:**
- Data (pré-preenchida com o dia selecionado)
- Horário (pré-preenchido com o slot clicado)
- Profissional (pré-preenchida com a coluna clicada)
- Procedimento (dropdown com todos os ativos)
- Comprimento (P/M/G — aparece só se o procedimento requer)
- Cliente (texto livre)
- Valor cobrado (pré-preenchido pela tabela, editável para dar desconto)
- Botão Salvar

**Modal Detalhes (ao clicar em atendimento existente):**
- Nome da cliente, horário, profissional, procedimento, comprimento
- Valor cobrado, lucro líquido (calculado pelo banco)
- Botão "Marcar executado" (toggle)
- Botão "Marcar pago" (toggle, verde destacado)
- Botão "Cancelar atendimento" (vermelho, pede confirmação)
- Botão "Fechar"

### 3. DASHBOARD FINANCEIRO (= aba oculta "GRAFICOS-FECHAMENTO" do Excel)
**Acesso exclusivo: PROPRIETÁRIA**

Seletor de mês/ano no topo.

**Cartões de resumo (linha superior):**
- Receita Total (atendimentos + home car + paralelos)
- Receita Recebida
- Pendências (executado mas não pago)
- Saúde Financeira (lucro - despesas - salários)

**Seção: Análise de Lucro**
- Gráfico de barras: Lucro Real vs Lucro Possível por mês (últimos 6 meses)
- Comparação mês atual vs mês anterior

**Seção: Custos e Deduções**
- Total maquininha (5% do faturamento)
- Total pago às profissionais (comissões)
- Total custo fixo por atendimento (R$29 × nº atendimentos)
- Total custo variável (produtos)
- Total despesas (aluguel, energia, etc.)
- Total salários fixos das funcionárias

**Seção: Ranking de Procedimentos**
- Tabela: procedimento | qtd | receita | lucro | ticket médio
- Ordenado por receita (igual ao Excel: Kit Lavatório, Progressiva, Botox no topo)

**Seção: Rendimento por Profissional**
- Tabela: profissional | atendimentos | receita gerada | comissão variável | salário fixo | total

**Seção: Home Car e Paralelos**
- Receita Home Car do mês com pendências
- Receita Procedimentos Paralelos com pendências

**Seção: Pró-labore (3 passos do Excel original)**
- Passo 1: Gastos pessoais mensais (filho, energia, comida, aluguel, internet, acessórios, aleatórios)
- Passo 2: O que o salão gerou (saúde financeira real)
- Passo 3: Saldo = salão pagou os gastos? Sobrou ou faltou?

**Seção: Clientes Pendentes**
- Lista de atendimentos executados mas não pagos: cliente | procedimento | valor

### 4. HOME CAR (= aba "HOME CAR" do Excel)
- Lista de vendas de kits/produtos
- Botão "Nova venda"
- Campos: data, cliente, produto, custo, valor venda, valor pago
- Coluna "pendente" calculada automaticamente
- Marcar como pago

### 5. PROCEDIMENTOS PARALELOS (= aba "PROCED PARALELO")
- Lista de serviços extras (cílios, busso, depilação, etc.)
- Botão "Novo serviço"
- Campos: data, profissional, descrição, cliente, valor, valor pago
- Coluna "pendente" calculada

### 6. DESPESAS
- Lista de despesas do mês
- Botão "Nova despesa"
- Filtro por tipo e por mês
- Marcar como paga

### 7. CONFIGURAÇÕES (proprietária apenas)
- **Aba Salão:** nome, custo fixo por atendimento (R$29), taxa maquininha (5%), pró-labore
- **Aba Profissionais:** lista com nome, cargo, salário fixo, ativo/inativo
- **Aba Procedimentos:** tabela com preços P/M/G, custo variável, % profissional
- **Aba Gastos Pessoais:** lista dos gastos mensais da proprietária (passo 1 do pró-labore)

---

## FÓRMULAS FINANCEIRAS (tradução exata do Excel para JavaScript/SQL)

```javascript
// Calculado no trigger do banco (Supabase PostgreSQL)

valor_maquininha = valor_cobrado × (taxa_maquininha_pct / 100)
// Exemplo: R$230 × 5% = R$11,50

valor_profissional = valor_cobrado × (porcentagem_profissional / 100)
// Exemplo: R$230 × 40% = R$92,00

custo_fixo = configuracoes.custo_fixo_por_atendimento
// Sempre R$29,00

custo_variavel = procedimento.custo_variavel
// Custo do produto dividido pela quantidade de aplicações

lucro_liquido = valor_cobrado - valor_maquininha - valor_profissional - custo_fixo - custo_variavel
// Lucro real após todos os descontos

lucro_possivel = valor_cobrado - valor_profissional - custo_fixo - custo_variavel
// Lucro se não houvesse maquininha (potencial)

// No Excel era: valor = (preco_base + custo_fixo + custo_produto) / 95%
// Ou seja, a fórmula dividia por 0.95 para embutir o custo da maquininha no preço
// No sistema, a abordagem é mais transparente: mostramos os valores separados

// Preço por comprimento:
preco_final = procedimento.preco_p  // se P ou sem comprimento
preco_final = procedimento.preco_m  // se M (ou preco_p se preco_m for null)
preco_final = procedimento.preco_g  // se G (ou preco_p se preco_g for null)

// Saúde financeira do mês:
saude_financeira = lucro_liquido_atendimentos
                 + lucro_homecare
                 - total_despesas
                 - total_salarios_fixos
```

---

## REGRAS DE NEGÓCIO IMPORTANTES

1. **Atendimento cancelado** zera todos os valores (maquininha=0, profissional=0, lucro=0)
2. **Pago=true sem executado=true** é possível (pagamento antecipado)
3. **Executado=true sem pago=true** = pendência (o mais comum: fez o serviço, não pagou ainda)
4. O **valor cobrado é editável** pelo usuário (para dar desconto), mas o padrão vem da tabela
5. Os **preços da tabela são por salão** — cada salão tem sua própria tabela de preços
6. **Horários de 30 em 30 minutos**, das 08:00 às 19:00 (23 slots)
7. Um profissional pode ter **mais de um atendimento no mesmo horário** (raro mas possível)
8. O **custo fixo de R$29** é o rateio de aluguel + energia + água por atendimento
9. A taxa de **5% da maquininha** vem de `/95%` nas fórmulas do Excel original

---

## FLUXO DE ONBOARDING (vendedor instalando para novo salão)

1. Vendedor cria projeto no Supabase e executa o SQL completo
2. Vendedor cria usuário da proprietária em Authentication → Invite User
3. Vendedor faz login com credenciais da proprietária
4. Sistema exibe wizard de configuração inicial:
   - Nome do salão
   - Profissionais (nome, cargo, salário)
   - Procedimentos (pode usar os padrões pré-carregados)
   - Custo fixo e taxa de maquininha
5. Vendedor entrega o link e as credenciais para a proprietária
6. Proprietária entra pela primeira vez e troca a senha

---

## ARQUITETURA DOS ARQUIVOS REACT

```
src/
├── main.jsx
├── App.jsx              — porteiro: verifica sessão, redireciona por role
├── supabaseClient.js    — createClient com URL + anon key
│
├── pages/
│   ├── Login.jsx
│   ├── Agenda.jsx       — grade horários × profissionais
│   ├── Dashboard.jsx    — financeiro (proprietária only)
│   ├── HomeCar.jsx
│   ├── Paralelos.jsx
│   ├── Despesas.jsx
│   └── Configuracoes.jsx
│
├── components/
│   ├── Topbar.jsx       — logo, nome da usuária, botão sair
│   ├── Sidebar.jsx      — menu lateral com itens por role
│   ├── AgendaGrid.jsx   — a grade em si
│   ├── ModalAgendamento.jsx
│   ├── ModalDetalhes.jsx
│   ├── CardMetrica.jsx  — card de número do dashboard
│   ├── GraficoLucro.jsx — barras com recharts
│   └── TabelaRanking.jsx
│
└── hooks/
    ├── useAuth.js       — sessão, role, salao_id do usuário logado
    └── useSalao.js      — dados do salão atual
```

---

## PONTOS CRÍTICOS DE IMPLEMENTAÇÃO

### Multi-tenant (salao_id)
Todo SELECT/INSERT/UPDATE deve filtrar por `salao_id`:
```javascript
// CORRETO
const { data } = await supabase
  .from('atendimentos')
  .select('*')
  .eq('salao_id', salaoId)  // SEMPRE incluir isso
  .eq('data', data)

// ERRADO (retorna dados de todos os salões)
const { data } = await supabase
  .from('atendimentos')
  .select('*')
  .eq('data', data)
```

### Segurança (RLS)
Policies devem ser `authenticated`, nunca `anon`:
```sql
create policy "auth_salao" on atendimentos
  for all to authenticated
  using (salao_id = (select salao_id from profiles where id = auth.uid()))
  with check (salao_id = (select salao_id from profiles where id = auth.uid()));
```

### Dashboard (acesso por role)
```javascript
// Em App.jsx
if (role === 'FUNCIONARIO') {
  // Mostrar APENAS agenda
  // Sidebar sem Dashboard, HomeCar, Despesas, Configurações
}
if (role === 'PROPRIETARIO') {
  // Acesso completo
}
```

### Formato de data
Usar sempre `YYYY-MM-DD` sem conversão de fuso:
```javascript
function toISO(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
```

---

## ESTADO ATUAL DO PROJETO (o que já existe)

✅ **Banco de dados:** schema completo rodando no Supabase (sem salao_id ainda)
✅ **Login.jsx:** tela de login funcional com Supabase Auth
✅ **App.jsx:** porteiro que verifica sessão e redireciona
✅ **Agenda.jsx:** grade funcional, modal de novo agendamento, modal de detalhes com ações (pago/executado/cancelar)

❌ **Falta implementar:**
- salao_id em todas as tabelas (multi-tenant)
- Controle de role (proprietária vs funcionária) nas rotas
- Dashboard financeiro (módulo mais importante após agenda)
- Home Car, Paralelos, Despesas (telas simples de CRUD)
- Configurações (profissionais, procedimentos, preços)
- Sidebar de navegação entre módulos
- Wizard de onboarding inicial

---

## PRÓXIMOS PROMPTS SUGERIDOS

**Prompt 1 — Multi-tenant + roles:**
"Com base no prompt mestre, adicione salao_id em todas as tabelas do schema SQL, crie a tabela profiles com role (PROPRIETARIO|FUNCIONARIO|VENDEDOR) e salao_id, adicione a trigger de criação automática de perfil ao registrar usuário, e atualize as RLS policies para filtrar por salao_id do usuário logado."

**Prompt 2 — Hook de autenticação:**
"Crie o hook useAuth.js que retorna { sessao, user, role, salaoId, loading }. Atualize App.jsx para usar o hook e redirecionar FUNCIONARIA apenas para /agenda e PROPRIETARIA para /dashboard. Crie o Sidebar.jsx com menu responsivo ao role."

**Prompt 3 — Dashboard financeiro:**
"Crie a página Dashboard.jsx usando a view fechamento_mensal do Supabase. Implemente: seletor de mês, 4 cards de métricas (receita total, recebida, pendências, saúde financeira), gráfico de barras lucro real vs possível com recharts, tabela de ranking de procedimentos, tabela de rendimento por profissional, seção de pró-labore em 3 passos, e lista de clientes pendentes."

**Prompt 4 — CRUD completo:**
"Crie as páginas HomeCar.jsx, Paralelos.jsx e Despesas.jsx com listagem filtrada por mês, formulário de novo lançamento e botão de marcar pago. Todas devem filtrar por salao_id."

**Prompt 5 — Configurações:**
"Crie a página Configuracoes.jsx com 4 abas: (1) dados do salão + custo fixo + maquininha + pró-labore, (2) gerenciar profissionais com CRUD, (3) tabela de procedimentos com edição de preços P/M/G e % profissional, (4) gastos pessoais mensais da proprietária."
