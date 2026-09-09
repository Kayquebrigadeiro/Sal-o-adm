# Sal-o-adm — Gestão Financeira para Salões de Beleza

> SaaS multi-tenant que mostra, atendimento por atendimento, quanto o salão realmente lucra.

O **Sal-o-adm** substitui a planilha de controle do salão por um sistema que calcula o lucro
de cada serviço no momento em que ele é lançado na agenda: desconta a taxa da maquininha, a
comissão da profissional, o custo dos produtos usados e o custo fixo rateado por atendimento.
No fim do mês, o fechamento mostra faturamento, receita recebida, pendências, despesas,
retiradas e o resultado real do negócio.

---

## Índice

- [Funcionalidades](#-funcionalidades)
- [Perfis de acesso](#-perfis-de-acesso)
- [Como o sistema calcula o lucro](#-como-o-sistema-calcula-o-lucro)
- [Stack técnica](#-stack-técnica)
- [Estrutura do repositório](#-estrutura-do-repositório)
- [Rodando localmente](#-rodando-localmente)
- [Variáveis de ambiente](#-variáveis-de-ambiente)
- [Deploy](#-deploy)
- [Testes e validação financeira](#-testes-e-validação-financeira)
- [Documentação](#-documentação)
- [Roadmap](#-roadmap)
- [Licença](#-licença)

---

## 🧩 Funcionalidades

### Agenda (operação do dia a dia)
- Cadastro de atendimentos por cliente, profissional e procedimento, com preços P/M/G (pequeno/médio/grande).
- **Prévia financeira em tempo real**: antes de salvar, o sistema já mostra maquininha, comissão, custos e lucro — e alerta se o valor cobrado gera prejuízo.
- Procedimentos adicionais no mesmo atendimento (somados ao total, com recálculo automático).
- Controle de pagamento: total, parcial ou pendente; status AGENDADO / EXECUTADO / CANCELADO.

### Dashboard (fechamento mensal)
- Faturamento bruto, receita recebida, pendências, lucro real e lucro possível.
- Resultado do mês: lucro + homecare − despesas − gastos pessoais − salários fixos.
- Ranking de procedimentos por lucro e rendimento por profissional.
- **Fechamento mensal com snapshot** imutável: meses fechados não podem ser editados (guarda no backend).

### Precificação (motor de preços)
- Custo variável por procedimento, estático ou **dinâmico via insumos** (produto × quantidade por uso).
- Cadastro de **produtos** (preço de compra ÷ aplicações) e vínculo com procedimentos.
- **Custos fixos mensais** (aluguel, água, energia, internet...) e **custo fixo rateado por atendimento**.
- **Ganho líquido desejado** por procedimento com **engenharia reversa**: o sistema calcula o preço preciso para atingir o ganho alvo.
- Simulador "e se?" para testar preços e comissões antes de aplicar.

### Outros módulos
- **HomeCare**: vendas de produtos para uso em casa, com custo, venda e lucro por item.
- **Procedimentos paralelos**: eventos fora da agenda (noivas, formaturas) com repasse à profissional.
- **Clientes**: cadastro com telefone e histórico.
- **Configurações**: taxa de maquininha, custo fixo por atendimento, comissões da equipe, salários fixos, proteção do dashboard por PIN.
- **Área do vendedor/admin**: criação e gestão das contas de salões (tenants) e assinaturas.

---

## 👥 Perfis de acesso

| Perfil | O que vê |
|---|---|
| **VENDEDOR (admin)** | Painel de todos os salões, criação de contas de proprietária, assinaturas. |
| **PROPRIETARIO** | Tudo do salão: agenda, dashboard, precificação, clientes, homecare, configurações. |
| **FUNCIONARIO** | Apenas a própria agenda e seus atendimentos. |

Todos os dados são isolados por `salao_id` (multi-tenant) em todas as queries do backend.

---

## 🧮 Como o sistema calcula o lucro

Para cada atendimento EXECUTADO, o motor financeiro (`financialEngine.service.js`) calcula:

```
maquininha        = valor cobrado × taxa (%)
comissão          = valor cobrado × % da profissional   (apenas FUNCIONARIO com comissão)
custo variável    = soma dos insumos vinculados          (ou custo estático do procedimento)
lucro líquido     = valor cobrado − maquininha − custo fixo/atend. − custo variável − comissão
lucro possível    = valor cobrado − custo fixo/atend. − custo variável − comissão
```

O **fechamento do mês** consolida:

```
resultado = lucro dos atendimentos + lucro do homecare − despesas − gastos pessoais − salários fixos
```

Cada mês é calculado de forma independente (não há arraste de saldo entre meses — decisão
registrada no [roadmap](roadmap.md)). Todos os cálculos foram auditados com uma réplica
independente do motor: **0 divergências em 3 meses de dados simulados** (141 atendimentos
conferidos linha a linha).

---

## ⚙️ Stack técnica

**Frontend** — React 18 · Vite · Tailwind CSS · Recharts · React Router

**Backend** — Node.js (Express) · MySQL/TiDB (mysql2) · JWT + bcrypt · rate limiting · cache (`node-cache`) · Sentry (monitoramento de erros)

**Infra** — Frontend na Vercel · Backend no Render · Banco TiDB Cloud

> O Supabase permanece apenas como dependência *legacy* da tela de Assinaturas e do painel do vendedor, em processo de desativação.

---

## 📁 Estrutura do repositório

```
Sal-o-adm/
├── src/                      # Frontend (React + Vite)
│   ├── pages/                # Agenda, Dashboard, Precificacao, HomeCar, Paralelos...
│   ├── components/           # Componentes reutilizáveis (Sidebar, modais, gráficos)
│   ├── services/             # FinancialEngine.js (réplica do motor de cálculo) e API
│   ├── hooks/                # Hooks customizados
│   ├── constants/            # Constantes e enums
│   └── vendedor/             # Telas do admin/vendedor (assinaturas)
│
├── backend-node/             # Backend (Node.js + Express)
│   ├── src/
│   │   ├── controllers/      # atendimentos, fechamento, CRUD, auth, relatórios
│   │   ├── services/         # financialEngine.service.js (motor de cálculo)
│   │   ├── routes/           # Rotas da API
│   │   ├── middlewares/      # Auth (JWT), permissões por cargo
│   │   └── config/           # Pool de conexão (TiDB/MySQL)
│   ├── tests/                # Suíte de testes end-to-end da API
│   ├── scripts/              # Simulações, auditorias e utilitários
│   └── docs/                 # Documentação técnica do backend
│
├── docs/                     # Auditorias e documentação (multi-tenant, carga)
├── scripts/                  # Utilitários de manutenção
└── roadmap.md                # Pendências e decisões registradas
```

---

## 🚀 Rodando localmente

### Pré-requisitos
- Node.js 18+
- Acesso a um banco MySQL/TiDB (local ou cloud)

### Instalação

```bash
git clone https://github.com/Kayquebrigadeiro/Sal-o-adm.git
cd Sal-o-adm

# Frontend
npm install

# Backend
cd backend-node && npm install
```

### Execução

```bash
# 1. Backend (staging na porta 3334)
cd backend-node
npm run dev

# 2. Frontend (em outro terminal, na raiz)
npm run dev
```

Copie os `.env.example` para `.env` (raiz e `backend-node/`) e preencha as credenciais do banco e o segredo JWT antes de subir.

---

## 🔑 Variáveis de ambiente

### Frontend (`.env` na raiz)

| Variável | Descrição |
|---|---|
| `VITE_API_URL` | URL da API do backend (**principal**) |
| `VITE_DASHBOARD_PIN` | PIN de proteção do dashboard |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | Supabase (legacy — tela de assinaturas) |
| `VITE_PIX_CHAVE` / `VITE_PIX_NOME` / `VITE_PIX_COPIA_COLA` | Dados de PIX exibidos no sistema |
| `VITE_WHATSAPP_SUPORTE` | Contato de suporte |

### Backend (`backend-node/.env`)

| Variável | Descrição |
|---|---|
| `DB_HOST` / `DB_PORT` / `DB_USER` / `DB_PASSWORD` / `DB_NAME` | Conexão MySQL/TiDB (porta padrão 4000) |
| `JWT_SECRET` | Segredo de assinatura dos tokens |
| `STAGING_PORT` | Porta do servidor de staging (3334) |
| `SENTRY_DSN` | Monitoramento de erros (opcional) |
| `GROQ_API_KEY` / `GROQ_MODEL` | Credenciais do agente noturno (opcional) |
| `TEST_VENDEDOR_EMAIL` / `TEST_VENDEDOR_SENHA` | Credenciais para suíte de testes (opcional) |

---

## ☁️ Deploy

- **Frontend**: Vercel (`vercel.json` com rewrites de SPA e cache de assets) — build `npm run build`.
- **Backend**: Render — `cd backend-node && npm start` (usa `src/server.js`).
- **Banco**: TiDB Cloud (compatível com MySQL, porta 4000, conexão TLS obrigatória).

---

## ✅ Testes e validação financeira

O núcleo financeiro é tratado como o componente mais crítico do sistema e é validado por
**contagem independente**: scripts que recriam o cálculo do zero (fora do código do servidor)
e comparam centavo a centavo com o que a API retorna.

```bash
# Suíte end-to-end da API (backend)
cd backend-node
node tests/run-full-tests.js

# Simulação realista de 3 meses + auditoria financeira (salão demo)
node scripts/simulacao_producao_realista.js                      # cria dados e audita
node scripts/simulacao_producao_realista.js --somente-auditoria  # só auditoria
```

Última auditoria (08/09/2026): **141 atendimentos conferidos linha a linha e fechamentos de
3 meses com 0 divergências** — detalhes em
[`docs/auditorias/SIMULACAO_REALISTA_PRODUCAO_2026-09-08.md`](docs/auditorias/SIMULACAO_REALISTA_PRODUCAO_2026-09-08.md).

---

## 📚 Documentação

- [`roadmap.md`](roadmap.md) — pendências técnicas/de negócio, decisões registradas e guia de revalidação.
- [`docs/MULTI_TENANT.md`](docs/MULTI_TENANT.md) — arquitetura de isolamento por salão.
- [`docs/auditorias/`](docs/auditorias/) — relatórios de auditoria (carga, simulação realista).
- [`backend-node/docs/TESTES_MANUAIS.md`](backend-node/docs/TESTES_MANUAIS.md) — testes manuais da API.
- [`backend-node/docs/IMPLEMENTACAO_RESUMO.md`](backend-node/docs/IMPLEMENTACAO_RESUMO.md) — decisões do motor financeiro.

---

## 🗺️ Roadmap

As pendências, limitações conhecidas e funcionalidades em avaliação (incluindo o possível
**arraste de prejuízo/saldo acumulado entre meses**) estão registradas com contexto e
proposta de implementação no [`roadmap.md`](roadmap.md).

---

## 📝 Licença

Software de uso privado. Todos os direitos reservados para **Kayque Brigadeiro**.



