# Prompt para IA do VS Code — Refatoração Completa do Frontend (Proprietária)

## Contexto do Projeto

Sistema SaaS de gestão de salão de beleza.
Stack: **React 18 + React Router v7 + Tailwind CSS + Supabase + Lucide React + Recharts**
Perfis: `VENDEDOR` (admin que cria salões) e `PROPRIETARIO` (dona do salão — foco deste prompt).

O `salaoId` e `role` chegam via props do `App.jsx` para todas as páginas.
O cliente Supabase está em `src/supabaseClient.js`.

---

## Schema do Banco (V4) — LEIA COM ATENÇÃO

### Enums
```sql
cargo_enum:        'PROPRIETARIO' | 'FUNCIONARIO' | 'VENDEDOR'
comprimento_enum:  'P' | 'M' | 'G'   -- P=Curto, M=Médio, G=Longo
status_enum:       'AGENDADO' | 'EXECUTADO' | 'CANCELADO'
categoria_enum:    'CABELO' | 'UNHAS' | 'SOBRANCELHAS' | 'CILIOS' | 'OUTRO'
tipo_despesa_enum: 'ALUGUEL' | 'ENERGIA' | 'AGUA' | 'INTERNET' | 'MATERIAL'
                   | 'EQUIPAMENTO' | 'FORNECEDOR' | 'FUNCIONARIO' | 'OUTRO'
```

### Tabelas principais

**profissionais**
- `id`, `salao_id`, `nome`, `cargo` (cargo_enum), `salario_fixo` (numeric), `ativo` (boolean)

**procedimentos**
- `id`, `salao_id`, `nome`, `categoria` (categoria_enum)
- `requer_comprimento` (boolean) — true para CABELO
- `preco_p`, `preco_m`, `preco_g` (numeric) — P=Curto, M=Médio, G=Longo
- `porcentagem_profissional` (numeric, default 40)
- `custo_variavel` (numeric, default 0)
- `ativo` (boolean)

**atendimentos**
- `id`, `salao_id`, `data` (date), `horario` (time)
- `profissional_id` (FK profissionais), `procedimento_id` (FK procedimentos)
- `comprimento` (comprimento_enum) — obrigatório se requer_comprimento=true
- `cliente` (text), `obs` (text)
- `valor_cobrado` (numeric) — pode ser editado, se 0 o trigger preenche pelo procedimento
- `valor_pago` (numeric) — quanto foi pago no ato
- `valor_pendente` (generated) = valor_cobrado - valor_pago
- `valor_maquininha`, `valor_profissional`, `custo_fixo`, `custo_variavel` (calculados pelo trigger)
- `lucro_liquido`, `lucro_possivel` (calculados pelo trigger)
- `status` (status_enum): 'AGENDADO' | 'EXECUTADO' | 'CANCELADO'

**despesas**
- `id`, `salao_id`, `data` (date), `descricao`, `tipo` (tipo_despesa_enum)
- `valor`, `valor_pago`, `valor_pendente` (generated)

**procedimentos_paralelos**
- `id`, `salao_id`, `data`, `profissional_id` (nullable)
- `descricao`, `cliente`, `valor`, `valor_pago`, `valor_pendente` (generated)
- `valor_profissional`

**homecare**
- `id`, `salao_id`, `data`, `cliente`, `produto`
- `custo_produto`, `valor_venda`, `valor_pago`, `valor_pendente` (generated), `lucro` (generated), `obs`

**configuracoes** (1 linha por salão, criada automaticamente pelo trigger)
- `salao_id`, `custo_fixo_por_atendimento` (default 29.00)
- `taxa_maquininha_pct` (default 5.00), `prolabore_mensal`

### Views disponíveis
- `fechamento_mensal`: `salao_id, mes, total_atendimentos, faturamento_bruto, lucro_real, lucro_possivel, total_pendente, cancelamentos`
- `ranking_procedimentos`: `salao_id, mes, procedimento, quantidade, receita_total, lucro_total, ticket_medio`
- `rendimento_por_profissional`: `salao_id, mes, profissional, cargo, atendimentos, rendimento_bruto, faturamento_gerado`

---

## Arquivos a criar/substituir

### 1. `src/components/Sidebar.jsx` — SUBSTITUIR

Nova sidebar para PROPRIETARIO com:
- Fundo `slate-900`, largura `w-64`
- Topo: nome do salão (buscar de `saloes` pelo `salaoId`) + email do usuário
- Data/hora atual atualizada a cada minuto
- Menu com ícones Lucide:
  ```
  CalendarDays    → "Agenda"         → /agenda
  LayoutDashboard → "Dashboard"      → /dashboard
  Scissors        → "Paralelos"      → /paralelos
  ShoppingBag     → "HomeCare"       → /homecar
  Receipt         → "Despesas"       → /despesas
  Settings        → "Configurações"  → /configuracoes
  ```
- Item ativo: fundo branco, texto slate-900
- Item inativo: texto slate-400, hover slate-800
- Rodapé: botão Sair com ícone LogOut

---

### 2. `src/pages/Agenda.jsx` — SUBSTITUIR COMPLETAMENTE

**Objetivo:** Tela mais usada — deve ser rápida, visual e intuitiva.

**Layout:**
- Cabeçalho: setas ← → para navegar por data + data centralizada em destaque + botão "Hoje"
- Badge com total de atendimentos do dia
- Grade de horários de 08:00 às 20:00 em intervalos de 30 minutos
- FAB (botão flutuante) verde com ícone + no canto inferior direito

**Fetch de dados:**
```js
// Busca atendimentos do dia selecionado
supabase
  .from('atendimentos')
  .select('*, profissionais(nome), procedimentos(nome, requer_comprimento)')
  .eq('salao_id', salaoId)
  .eq('data', dataISO) // formato 'YYYY-MM-DD'
  .order('horario')
```

**Cards de atendimento por status:**
- AGENDADO:  borda esquerda azul  (`border-l-4 border-blue-400`),  fundo `blue-50`
- EXECUTADO: borda esquerda verde (`border-l-4 border-emerald-400`), fundo `emerald-50`
- CANCELADO: borda esquerda cinza (`border-l-4 border-slate-300`),  fundo branco, texto riscado

**Cada card mostra:** horário | nome da cliente | procedimento + comprimento (P/M/G) | profissional | valor cobrado | status badge

**Ações rápidas no card:**
- Botão "✓ Finalizar" (só em AGENDADO) → abre modal de checkout
- Botão "✗ Cancelar" (só em AGENDADO)
- Badge de pendência se `valor_pendente > 0`

**Modal de Novo Agendamento:**
Campos obrigatórios:
- Data (date, default hoje)
- Horário (time, intervalos de 30min via select: 08:00 às 20:00)
- Cliente (text)
- Profissional (select — buscar `profissionais` ativos do salão)
- Procedimento (select — buscar `procedimentos` ativos do salão)
- Comprimento P/M/G (só aparece se `procedimento.requer_comprimento === true`)
- Valor cobrado (number, pre-preenchido com o preço do procedimento+comprimento, editável)
- Observação (textarea, opcional)

Ao inserir, enviar `valor_cobrado` preenchido — o trigger calcula o resto automaticamente.

**Modal de Checkout (Finalizar):**
- Mostra: cliente, procedimento, valor cobrado
- Campo: "Valor pago agora" (number)
- Se `valor_pago < valor_cobrado`: aviso amarelo "Restará R$ X pendente"
- Botão confirmar → `UPDATE atendimentos SET status='EXECUTADO', valor_pago=X`

---

### 3. `src/pages/Dashboard.jsx` — SUBSTITUIR COMPLETAMENTE

**Seletor de mês:** select com os últimos 12 meses

**Fetch:**
```js
// Resumo financeiro
supabase.from('fechamento_mensal')
  .select('*').eq('salao_id', salaoId).eq('mes', mesSelecionado).single()

// Ranking procedimentos
supabase.from('ranking_procedimentos')
  .select('*').eq('salao_id', salaoId).eq('mes', mesSelecionado)
  .order('quantidade', { ascending: false }).limit(5)

// Rendimento profissionais
supabase.from('rendimento_por_profissional')
  .select('*').eq('salao_id', salaoId).eq('mes', mesSelecionado)
```

**Cards de resumo (4 cards):**
- Faturamento Bruto (`faturamento_bruto`) — ícone TrendingUp, azul
- Lucro Real (`lucro_real`) — ícone Wallet, verde (negrito)
- Lucro Possível (`lucro_possivel`) — ícone Target, cinza + tooltip "Se tudo fosse pago"
- Pendências (`total_pendente`) — ícone AlertCircle, âmbar

**Valores sempre com:** `Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})`

**Seção Ranking Procedimentos:**
- Tabela: Procedimento | Qtd | Receita | Lucro | Ticket Médio
- Barra de progresso relativa ao maior valor

**Seção Rendimento por Profissional:**
- Cards: foto inicial do nome | atendimentos | faturamento gerado | comissão devida

---

### 4. `src/pages/Despesas.jsx` — SUBSTITUIR COMPLETAMENTE

**Fetch:**
```js
// Mês atual por padrão, com seletor de mês
supabase.from('despesas')
  .select('*').eq('salao_id', salaoId)
  .gte('data', inicioMes).lte('data', fimMes)
  .order('data', { ascending: false })
```

**Layout:**
- Cabeçalho: título + seletor de mês + botão "Nova Despesa"
- Cards de resumo: Total do mês | Total pago | Total pendente
- Tabela de despesas com colunas: Data | Descrição | Tipo (badge) | Valor | Pago | Pendente | Ações

**Badge de tipo:**
```js
// Mapear tipo_despesa_enum para cores
ALUGUEL → roxo, ENERGIA → amarelo, AGUA → azul, INTERNET → índigo,
MATERIAL → verde, EQUIPAMENTO → laranja, FUNCIONARIO → rosa, OUTRO → cinza
```

**Modal Nova/Editar Despesa:**
- Data (date)
- Descrição (text)
- Tipo (select com todos os valores do tipo_despesa_enum em português)
- Valor total (number)
- Valor pago (number, permite pagamento parcial)

**Inserção:**
```js
supabase.from('despesas').insert({
  salao_id, data, descricao, tipo, valor: Number(valor), valor_pago: Number(valorPago)
})
```

---

### 5. `src/pages/Paralelos.jsx` — SUBSTITUIR COMPLETAMENTE

Serviços realizados fora da agenda principal (ex: Geovana faz unhas enquanto a dona faz cabelo).

**Fetch:**
```js
supabase.from('procedimentos_paralelos')
  .select('*, profissionais(nome)')
  .eq('salao_id', salaoId)
  .gte('data', inicioMes).lte('data', fimMes)
  .order('data', { ascending: false })
```

**Layout:**
- Resumo: Total faturado | Total recebido | A receber | Total comissões
- Tabela: Data | Cliente | Descrição | Profissional | Valor | Pago | Comissão Prof. | Pendente

**Modal Novo Paralelo:**
- Data, Cliente, Descrição do serviço
- Profissional (select, opcional — nullable no banco)
- Valor cobrado
- Valor pago (permite parcial)
- Valor do profissional (comissão em R$, não %)

```js
supabase.from('procedimentos_paralelos').insert({
  salao_id, data, cliente, descricao, profissional_id: profId || null,
  valor: Number(valor), valor_pago: Number(valorPago),
  valor_profissional: Number(valorProf)
})
```

---

### 6. `src/pages/HomeCar.jsx` — SUBSTITUIR COMPLETAMENTE

Venda de produtos para uso em casa.

**Fetch:**
```js
supabase.from('homecare')
  .select('*').eq('salao_id', salaoId)
  .gte('data', inicioMes).lte('data', fimMes)
  .order('data', { ascending: false })
```

**Resumo:** Total vendas | Total recebido | Lucro total | Pendências

**Tabela:** Data | Cliente | Produto | Custo | Venda | Pago | Lucro | Pendente

**Modal Nova Venda:**
- Data, Cliente, Produto
- Custo do produto (number)
- Valor de venda (number)
- Valor pago (number, parcial ok)
- Observação (textarea)

O `lucro` e `valor_pendente` são colunas geradas no banco — não enviar no insert.

---

### 7. `src/pages/Configuracoes.jsx` — SUBSTITUIR COMPLETAMENTE

Página em 4 abas horizontais:

**Aba "Procedimentos"**
- Lista de procedimentos agrupados por categoria
- Cada linha: Nome | Categoria | P R$ | M R$ | G R$ | Comissão% | toggle Ativo | botão Deletar
- Edição inline com `onBlur` salvando no Supabase
- Botão "+ Novo Procedimento" → modal com todos os campos
- Se `requer_comprimento = false`, campos M e G ficam ocultos/desabilitados

**Aba "Equipe"**
- Lista de profissionais: Nome | Cargo (badge) | Salário Fixo | toggle Ativo | Deletar
- Edição inline
- Botão "+ Novo Profissional"

**Aba "Financeiro"**
- Editar configurações do salão:
  - Custo fixo por atendimento (R$)
  - Taxa maquininha (%) — padrão 5%
  - Pró-labore mensal (R$)
- Botão "Salvar configurações"
- Fetch e update em `configuracoes` where `salao_id = salaoId`

**Aba "Despesas Fixas"**
- Lista de despesas recorrentes (pode filtrar por tipo)
- Botão para marcar como paga parcial ou total

---

## Componentes a criar

### `src/components/PageHeader.jsx`
```jsx
// Props: title, subtitle, action (JSX)
// Linha divisória abaixo, action alinhado à direita
```

### `src/components/EmptyState.jsx`
```jsx
// Props: icon (Lucide), title, subtitle, action (JSX opcional)
// Centralizado, ícone grande em slate-200
```

### `src/components/Toast.jsx`
```jsx
// Toast global: fixed bottom-6 left-6
// Tipos: success (verde) | error (vermelho) | info (azul)
// Some após 3 segundos com animação slide-up
// Exportar também: useToast hook ou showToast função
```

### `src/components/Modal.jsx`
```jsx
// Wrapper de modal reutilizável
// Props: open, onClose, title, children
// Backdrop com click para fechar
// Scroll interno se conteúdo longo
```

---

## Padrões de código obrigatórios

### Formatação de moeda
```js
const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
```

### Formatação de data
```js
const hoje = new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD'
const fmtData = (d) => new Date(d + 'T00:00:00').toLocaleDateString('pt-BR');
```

### Início e fim de mês
```js
const inicioMes = `${ano}-${mes}-01`;
const fimMes    = new Date(ano, mes, 0).toISOString().split('T')[0];
```

### Estados de loading
Cada página deve ter estado `carregando` com spinner discreto.

### Tratamento de erro
```js
const { data, error } = await supabase.from(...).select(...)
if (error) { showToast('Erro: ' + error.message, 'error'); return; }
```

---

## Regras gerais

1. **NÃO usar** `pago` (boolean) — o banco usa `valor_pago` (numeric)
2. **NÃO usar** `executado` (boolean) — o banco usa `status` (status_enum)
3. **NÃO calcular** lucro no frontend — o trigger do banco faz isso
4. **NÃO inserir** `valor_pendente`, `lucro`, `lucro_liquido` — são colunas geradas
5. **Sempre** filtrar por `salao_id` em todas as queries
6. **Comprimento**: só exibir/exigir quando `procedimento.requer_comprimento === true`
7. Lucide React já instalado: `import { NomeIcone } from 'lucide-react'`
8. Recharts já instalado para gráficos no Dashboard
9. Manter Tailwind CSS — sem bibliotecas de UI externas
10. Testar `npm run build` sem erros antes de finalizar

---

## Ordem de implementação sugerida

1. `src/index.css` — adicionar animação fadeIn
2. `src/components/Modal.jsx`
3. `src/components/Toast.jsx`
4. `src/components/PageHeader.jsx`
5. `src/components/EmptyState.jsx`
6. `src/components/Sidebar.jsx`
7. `src/pages/Agenda.jsx` ← prioridade máxima
8. `src/pages/Configuracoes.jsx`
9. `src/pages/Dashboard.jsx`
10. `src/pages/Despesas.jsx`
11. `src/pages/Paralelos.jsx`
12. `src/pages/HomeCar.jsx`
