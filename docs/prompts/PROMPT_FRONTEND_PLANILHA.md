# Prompt para IA do VS Code — Frontend Completo Baseado na Planilha Real do Salão

## Contexto do Projeto

Sistema SaaS de gestão de salão de beleza.
Stack: **React 18 + React Router v7 + Tailwind CSS + Supabase + Lucide React + Recharts**
Perfil em foco: **PROPRIETARIO** (dona do salão).
O `salaoId` e `role` chegam via props do `App.jsx`.

---

## Como o salão funciona na prática (leitura da planilha real)

### Profissionais reais do salão
A planilha mostra 5 profissionais trabalhando simultaneamente em colunas separadas:
- **TETA** — Proprietária (PROPRIETARIO)
- **YARA** — Funcionária (FUNCIONARIO)
- **GEOVANA** — Funcionária (FUNCIONARIO) — especialista em cílios/unhas
- **QUINHA** — Funcionária (FUNCIONARIO)
- **MIRELLY** — Funcionária (FUNCIONARIO) — especialista em unhas

Cada profissional pode ter atendimentos ao mesmo tempo em horários iguais. A agenda exibe **uma coluna por profissional**, não uma lista.

### Como a agenda funciona
A planilha tem grade de horários (08:00 às 18:00, de 30 em 30 minutos) com **uma coluna por profissional**. Vários profissionais podem ter atendimentos no mesmo horário. Na célula aparece o nome da cliente + procedimento.

### Procedimentos reais com suas categorias e custos
Extraído da aba VALORES da planilha:

**CABELO** (`requer_comprimento = true`, preços variam por P/M/G):
| Procedimento       | Custo produto/app | Comissão prof (%) |
|--------------------|------------------|-------------------|
| LUZES              | R$ 101,50        | 30%               |
| COLORAÇÃO          | R$ 34,90         | 50%               |
| BOTOX              | R$ 15,83         | 30%               |
| FUSION             | R$ 7,92          | 45%               |
| DETOX              | R$ 6,67          | 45%               |
| PLASTICA DOS FIOS  | R$ 8,33          | 45%               |
| HIDRATAÇÃO         | R$ 4,69          | 45%               |
| NUTRIÇÃO           | R$ 4,69          | 45%               |
| RECONSTRUÇÃO       | R$ 6,43          | 45%               |
| KIT LAVATORIO      | R$ 1,87          | 50%               |
| PROGRESSIVA S/F    | R$ 6,75          | 30%               |
| PROGRESSIVA C/F    | R$ 14,67         | 30%               |
| CORTE              | R$ 0,67          | 30%               |
| RELAXAMENTO        | R$ 0             | 30%               |

**UNHAS** (`requer_comprimento = false`, preço único):
| Procedimento | Custo produto/app | Comissão prof (%) |
|--------------|------------------|-------------------|
| UNHAS        | R$ 4,00          | 45%               |

**SOBRANCELHAS** (`requer_comprimento = false`):
| Procedimento | Custo produto/app | Comissão prof (%) |
|--------------|------------------|-------------------|
| SOMBRANCELHA | R$ 2,00          | 50%               |
| BUSSO        | R$ 3,00          | —                 |
| AXILA        | R$ 3,00          | —                 |
| DEPILAÇÃO    | R$ 8,00          | —                 |

**CILIOS** (`requer_comprimento = false`):
| Procedimento       | Custo produto/app | Comissão prof (%) |
|--------------------|------------------|-------------------|
| EXTENSÃO DE CILIOS | R$ 50,00         | 100%              |
| CILIOS             | R$ 2,00          | —                 |

### Como o preço por comprimento funciona
O comprimento (P/M/G) determina o **valor cobrado da cliente**, não a comissão.
A comissão % é fixa por procedimento independente do comprimento.
Exemplo real da planilha (BOTOX):
- P: R$ 100–121 cobrado
- M: ~R$ 130–145 cobrado
- G: ~R$ 150–157 cobrado

### Custo fixo por atendimento
A planilha divide os custos fixos mensais pelo número de atendimentos esperados (~100/mês):
- Aluguel: R$ 1.750 → R$ 17,50/atendimento
- Energia: R$ 190 → R$ 1,90/atend
- Água: R$ 120 → R$ 1,20/atend
- Internet: R$ 150 → R$ 1,50/atend
- Produtos de limpeza: R$ 55 → R$ 0,55/atend
- Sistema: R$ 100 → R$ 1,00/atend
- Acessórios: R$ 100 → R$ 1,00/atend
- Café: R$ 150 → R$ 1,50/atend
- **Total: R$ 28,15/atendimento** (valor default em `configuracoes.custo_fixo_por_atendimento`)

### Fórmula de lucro (o trigger do banco faz isso — NÃO calcular no frontend)
```
Para FUNCIONARIO:
  lucro_real    = valor_cobrado - maquininha(5%) - valor_profissional - custo_fixo - custo_variavel
  lucro_possivel = valor_cobrado - valor_profissional - custo_fixo - custo_variavel

Para PROPRIETARIO:
  lucro_real    = valor_cobrado - maquininha(5%) - custo_fixo - custo_variavel
  lucro_possivel = valor_cobrado - custo_fixo - custo_variavel
```

### HomeCar (venda de produtos para casa)
Kits de produtos capilares vendidos para levar pra casa.
- **Custo produto** = o que o salão pagou pelo kit
- **Valor venda** = o que a cliente paga
- **Lucro** = valor_venda - custo_produto (coluna gerada no banco)
- Exemplos reais: mini fusion (custo R$45, venda R$80), kit tutano (custo R$105, venda R$180)

### Procedimentos Paralelos
Serviços feitos em paralelo à agenda principal, geralmente por uma funcionária específica enquanto a dona atende outra cliente.
- Ex: Geovana faz cílios (R$70–100) enquanto Teta faz cabelo
- Campos: data, funcionário (opcional), descrição livre, cliente, valor, valor pago, comissão do profissional em R$

### Despesas
Registro de saídas financeiras do salão:
- Tipos reais: ALUGUEL, ENERGIA, AGUA, INTERNET, MATERIAL (produtos), EQUIPAMENTO, FORNECEDOR, FUNCIONARIO (salários), OUTRO
- Pagamento pode ser parcial (fiado com fornecedor)
- Exemplos reais: aluguel R$1.750, energia R$190, água R$120, internet R$150

---

## Schema do Banco V4 — Tabelas e Campos Exatos

```sql
-- Enums
cargo_enum:        'PROPRIETARIO' | 'FUNCIONARIO' | 'VENDEDOR'
comprimento_enum:  'P' | 'M' | 'G'
status_enum:       'AGENDADO' | 'EXECUTADO' | 'CANCELADO'
categoria_enum:    'CABELO' | 'UNHAS' | 'SOBRANCELHAS' | 'CILIOS' | 'OUTRO'
tipo_despesa_enum: 'ALUGUEL' | 'ENERGIA' | 'AGUA' | 'INTERNET' | 'MATERIAL'
                   | 'EQUIPAMENTO' | 'FORNECEDOR' | 'FUNCIONARIO' | 'OUTRO'
```

**profissionais**: `id, salao_id, nome, cargo (cargo_enum), salario_fixo, ativo`

**procedimentos**: `id, salao_id, nome, categoria (categoria_enum), requer_comprimento (bool), preco_p, preco_m, preco_g, custo_variavel, porcentagem_profissional (default 40), ativo`

**atendimentos**: `id, salao_id, data, horario, profissional_id, procedimento_id, comprimento (só se requer_comprimento=true), cliente, obs, valor_cobrado, valor_pago, valor_pendente (gerado), valor_maquininha (gerado), valor_profissional (gerado), custo_fixo (gerado), custo_variavel (gerado), lucro_liquido (gerado), lucro_possivel (gerado), status ('AGENDADO'|'EXECUTADO'|'CANCELADO')`

**homecare**: `id, salao_id, data, cliente, produto, custo_produto, valor_venda, valor_pago, valor_pendente (gerado), lucro (gerado), obs`

**procedimentos_paralelos**: `id, salao_id, data, profissional_id (nullable), descricao, cliente, valor, valor_pago, valor_pendente (gerado), valor_profissional`

**despesas**: `id, salao_id, data, descricao, tipo (tipo_despesa_enum), valor, valor_pago, valor_pendente (gerado)`

**configuracoes**: `salao_id, custo_fixo_por_atendimento (default 29.00), taxa_maquininha_pct (default 5.00), prolabore_mensal`

**Views disponíveis:**
- `fechamento_mensal`: `salao_id, mes, total_atendimentos, faturamento_bruto, lucro_real, lucro_possivel, total_pendente, cancelamentos`
- `ranking_procedimentos`: `salao_id, mes, procedimento, quantidade, receita_total, lucro_total, ticket_medio`
- `rendimento_por_profissional`: `salao_id, mes, profissional, cargo, atendimentos, rendimento_bruto, faturamento_gerado`

---

## Arquivo 1 — `src/components/Sidebar.jsx` (SUBSTITUIR)

- Fundo `slate-900`, largura `w-64`
- Topo: nome do salão (buscar de `saloes` pelo `salaoId`) + email truncado
- Data e hora atual atualizadas a cada minuto (`useEffect` + `setInterval`)
- Menu com ícones Lucide React:
  ```
  CalendarDays    → "Agenda"         → /agenda
  LayoutDashboard → "Dashboard"      → /dashboard
  Scissors        → "Paralelos"      → /paralelos
  ShoppingBag     → "HomeCare"       → /homecar
  Receipt         → "Despesas"       → /despesas
  Settings        → "Configurações"  → /configuracoes
  ```
- Item ativo: `bg-white text-slate-900 font-medium rounded-lg`
- Item inativo: `text-slate-400 hover:bg-slate-800 hover:text-white`
- Rodapé: botão Sair com ícone `LogOut`

---

## Arquivo 2 — `src/pages/Agenda.jsx` (SUBSTITUIR)

### Layout geral
A agenda exibe uma **grade com uma coluna por profissional**, igual à planilha.
Linhas = horários de 30 em 30 minutos (08:00 às 18:00).
Colunas = profissionais ativos do salão.

### Cabeçalho
- Navegação de data: ← [Terça, 08 de outubro] → + botão "Hoje"
- Badge: "X atendimentos hoje" + "R$ X,XX em valor"

### Fetch dos dados
```js
// Profissionais ativos
const { data: profissionais } = await supabase
  .from('profissionais')
  .select('id, nome, cargo')
  .eq('salao_id', salaoId)
  .eq('ativo', true)
  .order('nome')

// Atendimentos do dia (com join)
const { data: atendimentos } = await supabase
  .from('atendimentos')
  .select('*, profissionais(nome), procedimentos(nome, requer_comprimento, categoria)')
  .eq('salao_id', salaoId)
  .eq('data', dataISO)  // 'YYYY-MM-DD'
  .order('horario')
```

### Grade da agenda
```
         | TETA      | YARA      | GEOVANA   | MIRELLY   |
08:00    | [card]    |           |           | [card]    |
08:30    |           | [card]    |           |           |
09:00    | [card]    | [card]    |           |           |
```

Horários sem atendimento = célula vazia cinza clara com botão "+" ao hover.

### Cards de atendimento
**AGENDADO:** `border-l-4 border-blue-400 bg-blue-50`
**EXECUTADO:** `border-l-4 border-emerald-400 bg-emerald-50`
**CANCELADO:** `border-l-4 border-slate-300 bg-white opacity-60 line-through`

Conteúdo do card:
- Nome da cliente em negrito
- Procedimento + comprimento (ex: "Botox — M")
- Valor cobrado
- Badge de pendência se `valor_pendente > 0`: "Deve R$ X,XX"
- Botão "✓ Finalizar" (só em AGENDADO) → abre modal de checkout
- Botão "✗ Cancelar" (só em AGENDADO)

### FAB (botão flutuante)
- Círculo verde `bg-emerald-500`, ícone `Plus`, `fixed bottom-6 right-6`
- Sombra `shadow-xl`, hover `scale-110`
- Abre modal de novo agendamento

### Modal: Novo Agendamento
Campos em ordem:
1. **Data** (date input, default hoje)
2. **Horário** (select: 08:00 até 18:00 de 30 em 30 min)
3. **Profissional** (select — buscar profissionais ativos)
4. **Cliente** (text)
5. **Procedimento** (select — buscar procedimentos ativos, agrupados por categoria)
6. **Comprimento** (radio P/M/G — **só aparece se** `procedimento.requer_comprimento === true`)
7. **Valor cobrado** (number — pré-preenchido com o preço do procedimento+comprimento, editável)
   - Ao selecionar procedimento + comprimento, auto-preencher:
     - P → `procedimento.preco_p`
     - M → `procedimento.preco_m`
     - G → `procedimento.preco_g`
8. **Observação** (textarea, opcional)

**Insert:**
```js
await supabase.from('atendimentos').insert({
  salao_id: salaoId,
  data,
  horario,
  profissional_id,
  procedimento_id,
  comprimento: requerComprimento ? comprimento : null,
  cliente,
  obs: obs || null,
  valor_cobrado: Number(valorCobrado),
  valor_pago: 0,
  status: 'AGENDADO'
})
// O trigger calcula: valor_maquininha, valor_profissional, custo_fixo, custo_variavel, lucro_liquido, lucro_possivel
```

### Modal: Checkout (Finalizar atendimento)
- Mostra resumo: cliente, procedimento, valor cobrado
- Campo: **"Valor recebido hoje (R$)"** (number)
- Se `valor_pago < valor_cobrado`: aviso âmbar "⚠️ Restará R$ X,XX pendente (fiado)"
- Botão "Confirmar e Finalizar"

```js
await supabase.from('atendimentos')
  .update({ status: 'EXECUTADO', valor_pago: Number(valorRecebido) })
  .eq('id', atendimentoId)
```

---

## Arquivo 3 — `src/pages/Dashboard.jsx` (SUBSTITUIR)

### Seletor de mês
Select com os últimos 12 meses. Formato enviado às views: `'YYYY-MM-01'`

### Fetch
```js
const [{ data: resumo }, { data: ranking }, { data: rendimento }] = await Promise.all([
  supabase.from('fechamento_mensal').select('*').eq('salao_id', salaoId).eq('mes', mes).single(),
  supabase.from('ranking_procedimentos').select('*').eq('salao_id', salaoId).eq('mes', mes).order('quantidade', { ascending: false }).limit(8),
  supabase.from('rendimento_por_profissional').select('*').eq('salao_id', salaoId).eq('mes', mes)
])
```

### Cards de resumo (4 cards em grid)
Todos com `Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })`:
- **Faturamento Bruto** (`faturamento_bruto`) — ícone `TrendingUp`, azul
- **Lucro Real** (`lucro_real`) — ícone `Wallet`, verde, fonte maior (é o mais importante)
- **Lucro Possível** (`lucro_possivel`) — ícone `Target`, cinza + subtítulo "se tudo fosse pago"
- **Pendências/Fiado** (`total_pendente`) — ícone `AlertCircle`, âmbar

### Ranking de procedimentos
Tabela: Procedimento | Qtd | Receita | Lucro | Ticket Médio
Barra de progresso horizontal proporcional ao maior faturamento.

### Rendimento por profissional
Cards por profissional:
- Inicial do nome em círculo colorido
- Nome + cargo (badge: "Proprietária" verde / "Funcionária" azul)
- Atendimentos realizados
- Faturamento gerado
- Comissão devida (rendimento_bruto)

### Mini gráfico de linha (Recharts)
Evolução do lucro real dos últimos 6 meses — buscar separado sem filtro de mês.

---

## Arquivo 4 — `src/pages/Despesas.jsx` (SUBSTITUIR)

### Seletor de mês + cards de resumo
- Total do mês | Total pago | Total pendente (a pagar)

### Fetch
```js
const inicioMes = `${ano}-${String(mes).padStart(2,'0')}-01`
const fimMes = new Date(ano, mes, 0).toISOString().split('T')[0]

await supabase.from('despesas')
  .select('*')
  .eq('salao_id', salaoId)
  .gte('data', inicioMes)
  .lte('data', fimMes)
  .order('data', { ascending: false })
```

### Tabela de despesas
Colunas: Data | Descrição | Tipo (badge colorido) | Valor Total | Pago | Pendente | Ações

**Mapeamento de tipo para cor (badge):**
```
ALUGUEL     → roxo    (bg-purple-100 text-purple-700)
ENERGIA     → amarelo (bg-yellow-100 text-yellow-700)
AGUA        → azul    (bg-blue-100 text-blue-700)
INTERNET    → índigo  (bg-indigo-100 text-indigo-700)
MATERIAL    → verde   (bg-green-100 text-green-700)
EQUIPAMENTO → laranja (bg-orange-100 text-orange-700)
FORNECEDOR  → vermelho(bg-red-100 text-red-700)
FUNCIONARIO → rosa    (bg-pink-100 text-pink-700)
OUTRO       → cinza   (bg-slate-100 text-slate-600)
```

### Modal Nova/Editar Despesa
- Data (date)
- Descrição (text)
- Tipo (select com labels em português):
  ```
  ALUGUEL → Aluguel, ENERGIA → Energia/Luz, AGUA → Água,
  INTERNET → Internet, MATERIAL → Material/Produtos,
  EQUIPAMENTO → Equipamento, FORNECEDOR → Fornecedor,
  FUNCIONARIO → Funcionário/Salário, OUTRO → Outro
  ```
- Valor total (number)
- Valor pago (number — permite pagamento parcial ou zero)

**Insert:**
```js
await supabase.from('despesas').insert({
  salao_id: salaoId, data, descricao, tipo,
  valor: Number(valor), valor_pago: Number(valorPago || 0)
})
```

---

## Arquivo 5 — `src/pages/Paralelos.jsx` (SUBSTITUIR)

Serviços adicionais que acontecem em paralelo à agenda principal.
Ex: Geovana faz extensão de cílios (R$80) enquanto Teta faz botox.

### Resumo do mês
Total faturado | Recebido | A receber | Total comissões (soma valor_profissional)

### Tabela
Colunas: Data | Cliente | Descrição | Profissional | Valor | Pago | Comissão | Pendente | Ações

### Modal Novo Paralelo
- Data (date, default hoje)
- Cliente (text)
- Descrição do serviço (text — livre, ex: "Extensão de cílios completa")
- Profissional (select — profissionais ativos, **mais opção "Nenhum/Sem profissional"**)
- Valor cobrado (number)
- Valor pago agora (number — parcial ok, zero ok)
- Comissão do profissional em R$ (number — não é %, é valor fixo em reais)
  - Só aparece se profissional selecionado

**Insert:**
```js
await supabase.from('procedimentos_paralelos').insert({
  salao_id: salaoId, data, cliente, descricao,
  profissional_id: profId || null,
  valor: Number(valor),
  valor_pago: Number(valorPago || 0),
  valor_profissional: Number(valorProf || 0)
})
// NÃO inserir valor_pendente — é coluna gerada
```

---

## Arquivo 6 — `src/pages/HomeCar.jsx` (SUBSTITUIR)

Venda de kits de produtos capilares para a cliente levar pra casa.

### Resumo do mês
Total vendas | Total recebido | Lucro total | A receber (pendente)

### Tabela
Colunas: Data | Cliente | Produto | Custo | Venda | Pago | Lucro | Pendente | Obs | Ações

**Lucro e valor_pendente são colunas geradas — só exibir, não calcular.**

### Modal Nova Venda
- Data (date, default hoje)
- Cliente (text)
- Produto (text — nome livre do kit, ex: "Mini Fusion", "Kit Tutano")
- Custo do produto (number — quanto o salão pagou)
- Valor de venda (number — quanto a cliente paga)
- Valor pago agora (number — parcial ok)
- Observação (textarea, opcional)

**Insert:**
```js
await supabase.from('homecare').insert({
  salao_id: salaoId, data, cliente, produto,
  custo_produto: Number(custoProduto),
  valor_venda: Number(valorVenda),
  valor_pago: Number(valorPago || 0),
  obs: obs || null
})
// NÃO inserir lucro nem valor_pendente — são colunas geradas
```

---

## Arquivo 7 — `src/pages/Configuracoes.jsx` (SUBSTITUIR)

4 abas horizontais. Aba ativa: `border-b-2 border-emerald-500 text-emerald-600`.

### Aba "Procedimentos"

Listar agrupados por categoria. Cada linha editável inline:

```
[Nome editável] | [Categoria] | [P R$] | [M R$] | [G R$] | [Comissão%] | [toggle ativo] | [🗑️]
```
- Para `requer_comprimento = false`: campos M e G ocultos, só P (preço único)
- Salvar no `onBlur` com `UPDATE procedimentos SET ... WHERE id = proc.id`
- Toast "✓ Salvo" ao atualizar
- Botão "+ Novo Procedimento" → modal:
  - Nome, Categoria (select enum), Requer comprimento? (toggle)
  - Se sim: Preço P, M, G separados
  - Se não: Preço único (vai para preco_p)
  - Custo do produto (custo_variavel)
  - Comissão % (porcentagem_profissional)

### Aba "Equipe"

Lista de profissionais: Nome | Cargo (badge) | Salário fixo R$ | toggle Ativo | Deletar

Edição inline com onBlur salvando em `UPDATE profissionais SET ...`

Botão "+ Novo Profissional" → modal:
- Nome, Cargo (select: FUNCIONARIO / PROPRIETARIO), Salário fixo

### Aba "Financeiro"

Formulário para editar `configuracoes`:
- **Custo fixo por atendimento** (R$) — ex: 28,15 — é a soma dos fixos dividida pela qtd esperada de atendimentos/mês
- **Taxa maquininha** (%) — default 5% — fixo para cartão
- **Pró-labore mensal** (R$) — retirada mensal da dona

Fetch: `supabase.from('configuracoes').select('*').eq('salao_id', salaoId).single()`
Save: `supabase.from('configuracoes').update({...}).eq('salao_id', salaoId)`

### Aba "Despesas Fixas"

Lista das despesas recorrentes do mês atual com opção de marcar como paga.
Igual à página Despesas mas filtrada só por tipo de despesa fixa (ALUGUEL, ENERGIA, AGUA, INTERNET).

---

## Componentes a criar

### `src/components/PageHeader.jsx`
```jsx
// Props: title (string), subtitle (string?), action (JSX?)
// Linha divisória border-b border-slate-200 embaixo
// action alinhado à direita
```

### `src/components/EmptyState.jsx`
```jsx
// Props: icon (Lucide component), title, subtitle, action (JSX?)
// Centralizado, ícone 48px em slate-300, textos slate-400
```

### `src/components/Modal.jsx`
```jsx
// Props: open (bool), onClose, title, children, footer (JSX?)
// Backdrop click fecha
// max-w-lg, overflow-y-auto para conteúdo longo
// Não usar position: fixed — usar flex justify-center items-center com min-height
```

### `src/components/Toast.jsx`
```jsx
// Toast global: fixed bottom-6 left-6, z-50
// Tipos: 'success' (verde) | 'error' (vermelho) | 'info' (azul)
// Slide-up animation, some após 3s
// Exportar: useToast() hook com showToast(msg, tipo)
```

---

## CSS a adicionar em `src/index.css`

```css
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
.animate-fadeIn {
  animation: fadeIn 0.2s ease-out;
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}
.animate-slideUp {
  animation: slideUp 0.25s ease-out;
}
```

Envolver o `<main>` com `animate-fadeIn` na troca de rota.

---

## Padrões obrigatórios

```js
// Formatação de moeda
const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Data ISO para input
const toISO = (d) => d instanceof Date ? d.toISOString().split('T')[0] : d;

// Início e fim do mês
const inicioMes = `${ano}-${String(mes).padStart(2,'0')}-01`;
const fimMes    = new Date(ano, mes, 0).toISOString().split('T')[0];

// Horários da agenda (30 em 30 min)
const horarios = Array.from({ length: 21 }, (_, i) => {
  const h = Math.floor(i / 2) + 8;
  const m = i % 2 === 0 ? '00' : '30';
  return `${String(h).padStart(2,'0')}:${m}`;
}); // 08:00 até 18:00
```

---

## Regras críticas — NÃO VIOLAR

1. **NUNCA** usar `pago` (boolean) — o banco usa `valor_pago` (numeric)
2. **NUNCA** usar `executado` (boolean) — o banco usa `status` enum
3. **NUNCA** calcular lucro no frontend — o trigger do banco faz isso automaticamente
4. **NUNCA** inserir `valor_pendente`, `lucro`, `lucro_liquido`, `valor_profissional`, `custo_fixo`, `custo_variavel` — são colunas geradas ou calculadas pelo trigger
5. **SEMPRE** filtrar por `salao_id` em todas as queries
6. **Comprimento** só aparece/é obrigatório quando `procedimento.requer_comprimento === true`
7. Lucide React já instalado: `import { CalendarDays } from 'lucide-react'`
8. Recharts já instalado para gráficos
9. Manter Tailwind CSS — sem bibliotecas de UI externas (shadcn, MUI, etc.)
10. Rodar `npm run build` sem erros antes de considerar concluído

---

## Ordem de implementação

1. `src/index.css` — animações
2. `src/components/Toast.jsx`
3. `src/components/Modal.jsx`
4. `src/components/PageHeader.jsx`
5. `src/components/EmptyState.jsx`
6. `src/components/Sidebar.jsx`
7. `src/pages/Agenda.jsx` ← **prioridade máxima, mais complexo**
8. `src/pages/Configuracoes.jsx`
9. `src/pages/Dashboard.jsx`
10. `src/pages/Despesas.jsx`
11. `src/pages/Paralelos.jsx`
12. `src/pages/HomeCar.jsx`
