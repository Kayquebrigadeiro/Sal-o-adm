# Salão Secreto — Gestão Financeira para Salões de Beleza

> SaaS multi-tenant que mostra, atendimento por atendimento, quanto o salão realmente lucra.

O **Salão Secreto** substitui a planilha de controle do salão por um sistema que calcula o lucro de cada serviço no momento em que ele é lançado na agenda: desconta a taxa da maquininha, a comissão da profissional, o custo dos produtos usados e o custo fixo rateado por atendimento. No fim do mês, o fechamento mostra faturamento, receita recebida, pendências, despesas, retiradas e o resultado real do negócio.

---

## 🔍 Demonstração ao vivo

O sistema está em produção. Acesse e explore com o salão de demonstração:

**URL:** [https://adm-salao.vercel.app](https://adm-salao.vercel.app)

| Campo | Valor |
|---|---|
| E-mail | `beleza.real@teste.com` |
| Senha | `BelezaReal123!` |

> O salão demo possui 3 meses de dados reais simulados (145+ atendimentos, 4 profissionais com comissões diferentes, produtos vinculados, custos fixos, homecare, procedimentos paralelos e fechamentos auditados). Fique à vontade para explorar — é um ambiente de demonstração.

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
- Resultado do mês: lucro dos atendimentos + homecare − despesas − gastos pessoais − salários fixos.
- Ranking de procedimentos por lucro e rendimento por profissional.
- **Fechamento mensal com snapshot imutável**: meses fechados não podem ser editados — protegido no backend com guard de 403.

### Precificação (motor de preços)
- Custo variável por procedimento, estático ou **dinâmico via insumos** (produto × quantidade por uso).
- Cadastro de **produtos** (preço de compra ÷ aplicações) e vínculo com procedimentos.
- **Custos fixos mensais** (aluguel, água, energia, internet...) e custo fixo rateado por atendimento.
- **Engenharia reversa de preço**: informe o ganho líquido desejado e o sistema calcula o preço exato para atingi-lo, descontando todos os custos e a taxa da maquininha.
- Simulador "e se?" para testar preços e comissões antes de aplicar.

### Outros módulos
- **HomeCare**: vendas de produtos para uso em casa, com custo, venda e lucro por item.
- **Procedimentos paralelos**: eventos fora da agenda (noivas, formaturas) com repasse à profissional.
- **Clientes**: cadastro com telefone e histórico.
- **Configurações**: taxa de maquininha, custo fixo por atendimento, comissões da equipe, salários fixos, proteção do dashboard por PIN.
- **Área do vendedor/admin**: criação e gestão das contas de salões (tenants).

---

## 👥 Perfis de acesso

| Perfil | O que vê |
|---|---|
| **VENDEDOR** | Painel de todos os salões, criação de contas de proprietária. |
| **PROPRIETARIO** | Tudo do salão: agenda, dashboard, precificação, clientes, homecare, configurações. |
| **FUNCIONARIO** | Apenas a própria agenda e seus atendimentos. |

Todos os dados são isolados por `salao_id` (multi-tenant) em todas as queries do backend. O `salao_id` é extraído do JWT no servidor — o frontend não consegue forjar o salão de outro tenant.

---

## 🧮 Como o sistema calcula o lucro

Para cada atendimento EXECUTADO, o motor financeiro (`financialEngine.service.js`) calcula:

```
maquininha     = valor cobrado × taxa (%)
comissão       = valor cobrado × % da profissional   (apenas FUNCIONARIO com comissão > 0)
custo variável = soma dos insumos vinculados          (ou custo estático do procedimento)
lucro líquido  = valor cobrado − maquininha − custo fixo/atend. − custo variável − comissão
lucro possível = valor cobrado − custo fixo/atend. − custo variável − comissão
```

O **fechamento do mês** consolida:

```
resultado = lucro dos atendimentos + lucro do homecare − despesas − gastos pessoais − salários fixos
```

Cada mês é calculado de forma independente — não há arraste de saldo entre meses (decisão registrada no [roadmap](roadmap.md)).

O motor foi auditado com uma réplica independente (fora do código do servidor) que recalcula tudo do zero e compara centavo a centavo com a API: **0 divergências em 141 atendimentos e 3 meses de fechamento** (auditoria de 08/09/2026).

---

## ⚙️ Stack técnica

**Frontend** — React 18 · Vite · Tailwind CSS · Recharts · React Router

**Backend** — Node.js (Express) · MySQL/TiDB (mysql2) · JWT + bcrypt · rate limiting · cache (`node-cache`) · Sentry

**Infra** — Frontend na Vercel · Backend no Render · Banco TiDB Cloud

---

## 📁 Estrutura do repositório

```
Sal-o-adm/
├── src/                        # Frontend (React + Vite)
│   ├── pages/                  # Agenda, Dashboard, Precificacao, HomeCar, Paralelos...
│   ├── components/             # Componentes reutilizáveis (Sidebar, modais, gráficos)
│   ├── services/               # FinancialEngine.js (réplica do motor) e api.js
│   ├── hooks/                  # Hooks customizados
│   ├── constants/              # Constantes e enums
│   └── vendedor/               # Telas do admin/vendedor
│
├── backend-node/               # Backend (Node.js + Express)
│   ├── src/
│   │   ├── controllers/        # atendimentos, fechamento, CRUD, auth, relatórios
│   │   ├── services/           # financialEngine.service.js (motor de cálculo)
│   │   ├── routes/             # Rotas da API
│   │   ├── middlewares/        # Auth (JWT), permissões por cargo
│   │   └── config/             # Pool de conexão (TiDB/MySQL)
│   ├── tests/                  # Suíte de testes end-to-end da API
│   ├── scripts/                # Simulações, auditorias e utilitários
│   └── docs/                   # Documentação técnica do backend
│
├── docs/                       # Auditorias e documentação (multi-tenant, carga)
├── scripts/                    # Utilitários de manutenção
└── roadmap.md                  # Pendências e decisões registradas
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
# 1. Backend (porta 3334)
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
| `VITE_API_URL` | URL da API do backend |
| `VITE_DASHBOARD_PIN` | PIN de proteção do dashboard |
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

O núcleo financeiro é tratado como o componente mais crítico do sistema e é validado por **contagem independente**: scripts que recriam o cálculo do zero (fora do código do servidor) e comparam centavo a centavo com o que a API retorna.

```bash
# Suíte end-to-end da API
cd backend-node
bash tests/run-full-tests.sh                        # 57 testes funcionais

# Simulação realista de 3 meses + auditoria financeira
node scripts/simular_validacao_final.js             # cria dados e audita
node scripts/testar_correcoes.js                    # 30 testes dos fixes críticos

# Suíte completa (unitários + funcional + correções + carga)
bash scripts/rodar_suite.sh
```

**Última auditoria (08/09/2026):** 141 atendimentos conferidos linha a linha, fechamentos de 3 meses com **0 divergências** em 33 campos — detalhes em [`docs/auditorias/`](docs/auditorias/).

**Resultados de carga:** 0 erros em todas as fases (5→10→20→35→50 usuários simultâneos). Stress de escrita com 50 salões simultâneos: **100/100 fechamentos com sucesso, 0 divergências financeiras**.

---

## 📚 Documentação

- [`roadmap.md`](roadmap.md) — pendências técnicas/de negócio, decisões registradas e guia de revalidação.
- [`docs/MULTI_TENANT.md`](docs/MULTI_TENANT.md) — arquitetura de isolamento por salão.
- [`docs/auditorias/`](docs/auditorias/) — relatórios de auditoria (carga, simulação realista).
- [`backend-node/docs/TESTES_MANUAIS.md`](backend-node/docs/TESTES_MANUAIS.md) — testes manuais da API.
- [`backend-node/docs/IMPLEMENTACAO_RESUMO.md`](backend-node/docs/IMPLEMENTACAO_RESUMO.md) — decisões do motor financeiro.

---

## 🗺️ Roadmap

Pendências, limitações conhecidas e funcionalidades em avaliação estão registradas com contexto e proposta de implementação no [`roadmap.md`](roadmap.md). Destaques:

- Arraste de prejuízo/saldo acumulado entre meses (em avaliação)
- Refresh token para sessões longas
- Gateway de pagamento real (Stripe / Mercado Pago)
- Serialização das requisições paralelas do Dashboard para evitar 429 no Render free tier

---

## 📝 Licença

Software proprietário desenvolvido por **Kayque Brigadeiro**.
Distribuição e uso comercial mediante contrato.
