# Prompt para IA do VS Code — Redesign de Navegação e UX do Sistema de Salão

## Contexto do projeto

Sistema SaaS de gestão de salão de beleza em React + Tailwind CSS + Supabase.
Stack: React 18, React Router v7, Tailwind CSS, Lucide React (ícones já instalado), Recharts.
O sistema tem dois perfis: **VENDEDOR** (admin) e **PROPRIETARIO** (dona do salão).

---

## Objetivo

Melhorar a navegação, UX e visual do sistema para o perfil **PROPRIETARIO** sem quebrar funcionalidade existente.
O foco é: **velocidade de uso, clareza visual, centralização e facilidade para pessoas não técnicas**.

---

## 1. Nova Sidebar (substituir `src/components/Sidebar.jsx`)

A sidebar atual é simples demais. Criar uma nova com:

### Visual
- Fundo `slate-900`, largura `w-64`
- Logo/nome do salão no topo com avatar circular com inicial do nome
- Ícones Lucide ao lado de cada item de menu (importar do `lucide-react`)
- Item ativo: fundo branco, texto `slate-900`, rounded-lg
- Item inativo: texto `slate-400`, hover `slate-800`
- Tooltip com o nome do item ao passar o mouse (para futura versão compacta)

### Itens do menu com ícones (importar do lucide-react)
```
CalendarDays   → "Agenda"         → /agenda
LayoutDashboard → "Dashboard"     → /dashboard
DollarSign     → "Atendimentos"  → /paralelos
Receipt        → "Despesas"       → /despesas
Settings       → "Configurações"  → /configuracoes
```

### Rodapé da sidebar
- Email do usuário truncado
- Botão "Sair" com ícone `LogOut`

### Indicador de dia e hora atual
- Abaixo do logo, mostrar: "Terça, 12 de abril" em texto pequeno
- Atualizar a cada minuto com `useEffect` + `setInterval`

---

## 2. Layout geral (atualizar `src/App.jsx` — apenas a parte do sistema normal)

- Container principal com `max-w-6xl mx-auto` em cada página
- Padding padrão `px-6 py-8`
- Fundo geral `bg-slate-50`
- Transição suave entre páginas: adicionar classe `animate-fadeIn` com CSS keyframe simples

No `src/index.css`, adicionar:
```css
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
.animate-fadeIn {
  animation: fadeIn 0.2s ease-out;
}
```

Envolver o `<main>` com a classe `animate-fadeIn` na troca de rota.

---

## 3. Header de página padronizado (criar `src/components/PageHeader.jsx`)

Criar um componente reutilizável de cabeçalho de página:

```jsx
// src/components/PageHeader.jsx
// Props: title (string), subtitle (string, opcional), action (JSX, opcional)
// Uso: <PageHeader title="Agenda" subtitle="Hoje, 12 de abril" action={<button>...</button>} />
```

Visual:
- `title`: texto 22px, font-semibold, slate-900
- `subtitle`: texto 13px, slate-400
- `action`: alinhado à direita (botão de adicionar, etc.)
- Linha divisória `border-b border-slate-200` abaixo
- Margem inferior `mb-6`

Usar esse header em todas as páginas: Agenda, Dashboard, Despesas, Paralelos, Configuracoes.

---

## 4. Melhorias na página Configurações (`src/pages/Configuracoes.jsx`)

Essa é a página mais crítica — onde a proprietária edita preços, funcionários e despesas.

### Estrutura em abas (tabs)
Criar 4 abas horizontais no topo da página:
```
[Procedimentos] [Equipe] [Horários] [Despesas]
```

Aba ativa: borda inferior `border-b-2 border-emerald-500`, texto `emerald-600`.
Aba inativa: texto `slate-500`, hover `slate-700`.

### Aba Procedimentos
- Listar procedimentos agrupados por categoria (CABELO, UNHAS, ESTETICA, OUTROS)
- Cada procedimento em uma linha editável inline:
  - Nome (input texto)
  - Valor (input número com prefixo R$)
  - Botão deletar (ícone Trash2 vermelho)
- Botão "+ Adicionar" no final de cada categoria
- Salvar ao perder foco (`onBlur`) — sem botão de salvar separado
- Toast de confirmação discreto: "✓ Salvo" que some após 2 segundos

### Aba Equipe
- Listar profissionais com: nome, cargo (badge colorido), comissão %
- Edição inline igual aos procedimentos
- Botão "+ Adicionar profissional"
- Toggle ativo/inativo por profissional

### Aba Horários
- Igual ao wizard — dias da semana com toggle + horários
- Botão "Salvar horários" centralizado

### Aba Despesas
- Igual à aba de procedimentos — lista editável
- Campo nome + campo valor mensal
- Total das despesas fixas em rodapé: "Total fixo mensal: R$ X.XXX,XX"

---

## 5. Melhorias na Agenda (`src/pages/Agenda.jsx`)

Não quebrar a lógica existente. Apenas melhorias visuais:

### Cabeçalho da agenda
- Navegação de data com setas ← → e data centralizada em destaque
- Botão "Hoje" que volta para a data atual
- Badge com número de atendimentos do dia: "3 atendimentos"

### Cards de atendimento
- Status visual mais claro:
  - AGENDADO: borda esquerda `border-l-4 border-blue-400`, fundo `blue-50`
  - EXECUTADO: borda esquerda `border-l-4 border-emerald-400`, fundo `emerald-50`
  - CANCELADO: borda esquerda `border-l-4 border-red-300`, fundo `red-50` + texto riscado
- Mostrar: horário em destaque, nome da cliente, procedimento, valor
- Ação rápida: botão "✓ Finalizar" diretamente no card (sem precisar abrir modal para status simples)

### Botão de novo agendamento
- FAB (Floating Action Button) fixo no canto inferior direito: círculo verde com ícone `+`
- `position: fixed`, `bottom: 24px`, `right: 24px`
- Sombra pronunciada, hover com scale

---

## 6. Cards do Dashboard (`src/pages/Dashboard.jsx`)

Melhorias nos cards de resumo financeiro:

- Adicionar ícone Lucide em cada card (TrendingUp, Wallet, Clock, AlertCircle)
- Comparativo discreto com mês anterior se disponível: "↑ 12% vs mês passado" em verde
- Cards com sombra suave `shadow-sm` e hover `shadow-md`
- Valores em formato brasileiro: `toLocaleString('pt-BR', {style:'currency', currency:'BRL'})`

---

## 7. Toast de feedback global (criar `src/components/Toast.jsx`)

Criar um componente simples de notificação que aparece no canto inferior esquerdo:

```jsx
// Uso em qualquer página:
// showToast('Agendamento criado!', 'success')
// showToast('Erro ao salvar', 'error')
```

- Posição: `fixed bottom-6 left-6`
- Tipos: success (verde), error (vermelho), info (azul)
- Aparece com slide-up animation, some após 3 segundos
- Implementar via Context ou prop drilling simples

---

## 8. Estado vazio padronizado (criar `src/components/EmptyState.jsx`)

Para quando não há dados (sem agendamentos, sem despesas, etc.):

```jsx
// Props: icon (Lucide component), title, subtitle, action (JSX opcional)
<EmptyState 
  icon={CalendarDays}
  title="Nenhum agendamento hoje"
  subtitle="Clique no botão + para adicionar"
/>
```

Visual: centralizado, ícone grande em slate-200, texto slate-400.

---

## Ordem de implementação sugerida

1. `src/index.css` — adicionar keyframe fadeIn
2. `src/components/PageHeader.jsx` — criar
3. `src/components/Sidebar.jsx` — substituir
4. `src/components/EmptyState.jsx` — criar
5. `src/components/Toast.jsx` — criar
6. `src/pages/Configuracoes.jsx` — refatorar com abas
7. `src/pages/Agenda.jsx` — melhorias visuais
8. `src/pages/Dashboard.jsx` — melhorias nos cards

---

## Regras importantes

- NÃO quebrar a lógica de fetch/supabase existente — apenas UI
- NÃO remover props ou mudar assinaturas de componentes que o App.jsx usa
- Manter Tailwind CSS — sem bibliotecas de UI externas
- Lucide React já está instalado: `import { NomeDoIcone } from 'lucide-react'`
- Testar que o build (`npm run build`) passa sem erros antes de finalizar
