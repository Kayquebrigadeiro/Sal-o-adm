# Salão Secreto: Ecossistema SaaS de Gestão Financeira Avançada

> **Solução integrada para otimização de margens de lucro e controle operacional multi-tenant.**

O **Salão Secreto** é uma plataforma SaaS especializada que atua como um núcleo de inteligência financeira. Projetado para substituir processos manuais e planilhas de alta complexidade, o sistema automatiza a auditoria de cada atendimento, garantindo o controle rigoroso sobre custos e lucratividade.

---

## Índice

- [Objetivo](#objetivo-segurança-operacional-e-rentabilidade)
- [Estrutura de Acessos e Perfis (RBAC)](#estrutura-de-acessos-e-perfis-rbac)
- [Diferenciais Tecnológicos](#diferenciais-tecnológicos)
- [Estrutura do Repositório](#estrutura-do-repositório)
- [Especificações Técnicas](#especificações-técnicas)
- [Implementação](#implementação)
- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [Documentação e Suporte](#documentação-e-suporte)
- [Roadmap de Evolução](#roadmap-de-evolução)
- [Termos e Licença](#termos-e-licença)

---

## 🎯 Objetivo: Segurança Operacional e Rentabilidade

O sistema elimina a incerteza financeira comum na gestão de centros de estética através de:

- **Auditoria Financeira Automática**: Algoritmos que processam instantaneamente taxas de operadoras, comissões e custos operacionais (fixos e variáveis).
- **Métricas de Lucratividade**: Visualização clara entre faturamento bruto, lucro líquido real e potencial de ganho baseado no método de pagamento.
- **Gestão de Fluxo de Caixa Integrada**: Módulo de controle de despesas e retiradas para preservar o capital de giro da empresa.

---

## 🔐 Estrutura de Acessos e Perfis (RBAC)

A plataforma possui um sistema de permissões baseado em níveis de responsabilidade:

### 👑 ADMINISTRADOR GERAL (Vendedor)
- Gestão centralizada de múltiplos salões (tenants).
- Monitoramento de indicadores globais de performance.
- Configuração de infraestrutura e provisionamento de novos acessos.

### 👩‍💼 GESTÃO DE UNIDADE (Proprietária)
- Controle administrativo total do ponto de venda.
- Configuração de regras de comissionamento e precificação.
- Acesso a dashboards estratégicos de saúde financeira e performance de equipe.

### 💆‍♀️ COLABORADOR OPERACIONAL (Staff)
- Interface simplificada para gestão de agenda individual.
- Acesso restrito a informações operacionais pertinentes à função.
- Foco na excelência do atendimento e organização de horários.

---

## 💎 Diferenciais Tecnológicos

- **🛡️ Isolamento Multi-Tenant**: Implementação robusta de Row Level Security (RLS) para garantir a total privacidade e segurança dos dados entre unidades.
- **📊 Inteligência de Dados**: Dashboards em tempo real com ranking de procedimentos e análise de rendimento por profissional.
- **📅 Agendamento Inteligente**: Sistema de reserva de horários integrado ao motor financeiro para previsão imediata de margens.
- **⚙️ Automação de Back-end**: Triggers em PostgreSQL para atualização atômica de indicadores financeiros a cada transação.

---

## 📁 Estrutura do Repositório

```
salao-secreto/
├── src/                      # Frontend (React + Vite)
│   ├── components/           # Componentes reutilizáveis
│   ├── constants/            # Constantes e enums
│   ├── hooks/                # Hooks customizados
│   ├── pages/                # Páginas da aplicação
│   ├── services/             # Serviços de API e lógica de negócio
│   └── vendedor/             # Módulo de vendedor (gestão de salões)
│
├── backend-node/             # Backend (Node.js + Express)
│   ├── src/
│   │   ├── config/           # Configurações (DB, etc.)
│   │   ├── controllers/      # Controladores da API
│   │   ├── middlewares/      # Middlewares (auth, permissões)
│   │   ├── routes/           # Rotas da API
│   │   └── services/         # Serviços (motor financeiro, etc.)
│   ├── tests/                # Scripts e suítes de teste
│   ├── scripts/              # Scripts utilitários e diagnóstico
│   └── docs/                 # Documentação específica do backend
│
├── supabase/                 # Edge Functions (Supabase) - Legacy
│   └── functions/            # Funções serverless
│
├── scripts/                  # Scripts de automação
│   ├── diagnostico/          # Scripts de diagnóstico e investigação
│   ├── patchs/               # Scripts de patch/migração de código
│   └── [scripts-util].*      # Scripts de atualização de tema, CORS, etc.
│
├── docs/                     # Documentação do projeto
│   ├── auditorias/           # Relatórios de auditoria e segurança
│   ├── contexto_ia/          # Prompts e contexto para ferramentas de IA
│   ├── guias/                # Guias de deploy e integração
│   ├── prompts/              # Prompts de desenvolvimento
│   ├── referencias/          # Arquivos de referência (imagens, planilhas)
│   ├── resumos/              # Resumos de implementações
│   ├── sprints/              # Documentação por sprint
│   ├── sql/                  # Scripts SQL (schema, migrations, views)
│   ├── testes/               # Documentação de testes
│   └── v2/                   # Documentação da v2
│
└── [config-files]            # Configurações de build/deploy (root)
    ├── .env.example          # Exemplo de variáveis de ambiente frontend
    ├── .gitignore
    ├── index.html
    ├── netlify.toml
    ├── package.json
    ├── postcss.config.js
    ├── tailwind.config.js
    ├── vercel.json
    └── vite.config.js
```

---

## ⚙️ Especificações Técnicas

Desenvolvido com tecnologias de vanguarda para garantir escalabilidade e resiliência:

### Frontend
- **Framework**: [React 18](https://reactjs.org/) + [Vite](https://vitejs.dev/)
- **Estilização**: [Tailwind CSS](https://tailwindcss.com/)
- **Visualização de Dados**: [Recharts](https://recharts.org/)
- **Rotas**: [React Router](https://reactrouter.com/)

### Backend
- **Runtime**: [Node.js](https://nodejs.org/) (Express)
- **Banco de Dados**: TiDB/MySQL (compatível com Supabase/PostgreSQL via legacy)
- **Autenticação**: JWT + Bcrypt

### Infraestrutura
- Hosting: Vercel / Netlify (frontend)
- Functions: Supabase Edge Functions (legacy)

---

## 🚀 Implementação

### Pré-requisitos
- Node.js 18+
- Banco de dados MySQL/TiDB configurado
- Projeto Supabase (legacy - opcional)

### Procedimento de Instalação

1. **Clone o Repositório**:
   ```bash
   git clone https://github.com/Kayquebrigadeiro/Sal-o-adm.git
   cd Sal-o-adm
   ```

2. **Instale as Dependências**:
   ```bash
   # Frontend
   npm install

   # Backend
   cd backend-node && npm install
   ```

3. **Configure as Variáveis de Ambiente**:
   Copie os arquivos `.env.example` para `.env` e preencha com as credenciais:
   ```bash
   # Frontend (raiz)
   cp .env.example .env

   # Backend
   cp backend-node/.env.example backend-node/.env
   ```

4. **Execute o Frontend**:
   ```bash
   npm run dev
   ```

5. **Execute o Backend**:
   ```bash
   cd backend-node
   npm run dev
   ```

---

## 🔑 Variáveis de Ambiente

### Frontend (`.env` na raiz)
| Variável | Descrição | Obrigatória |
|---|---|---|
| `VITE_SUPABASE_URL` | URL do projeto Supabase (legacy) | Sim* |
| `VITE_SUPABASE_ANON_KEY` | Chave anônima do Supabase (legacy) | Sim* |
| `VITE_DASHBOARD_PIN` | PIN de acesso ao dashboard | Sim |
| `VITE_API_URL` | URL da API backend | Sim |
| `VITE_PIX_CHAVE` | Chave PIX para recebimentos | Não |
| `VITE_PIX_NOME` | Nome do titular do PIX | Não |
| `VITE_WHATSAPP_SUPORTE` | Número do WhatsApp de suporte | Não |
| `VITE_PIX_COPIA_COLA` | Código PIX copia-e-cola | Não |

*Legacy — a aplicação está migrando para API própria.

### Backend (`backend-node/.env`)
| Variável | Descrição | Obrigatória |
|---|---|---|
| `GROQ_API_KEY` | Chave da API Groq | Sim |
| `GROQ_MODEL` | Modelo Groq (ex: llama-3.3-70b-versatile) | Sim |
| `DB_HOST` | Host do banco de dados | Sim |
| `DB_PORT` | Porta do banco (padrão 4000) | Sim |
| `DB_USER` | Usuário do banco | Sim |
| `DB_PASSWORD` | Senha do banco | Sim |
| `DB_NAME` | Nome do banco | Sim |
| `JWT_SECRET` | Segredo JWT | Sim |
| `STAGING_PORT` | Porta do servidor de staging | Sim |
| `TEST_VENDEDOR_EMAIL` | Email de teste do vendedor | Não |
| `TEST_VENDEDOR_SENHA` | Senha de teste do vendedor | Não |

---

## 📚 Documentação e Suporte

Acesse os documentos técnicos para orientações detalhadas:

- **[Guia de Deploy](docs/guias/GUIA_DEPLOY.md)**: Procedimentos para publicação.
- **[Arquitetura do Sistema](docs/ARQUITETURA_VENDEDOR_ADMIN.md)**: Documentação técnica da infraestrutura.
- **[Lógica Financeira](docs/CONTEXTO_COMPLETO_IA.md)**: Detalhamento das regras de negócio e cálculos.
- **[Gestão de Acessos](docs/resumos/RESUMO_IMPLEMENTACAO_ADMINS.md)**: Estrutura de permissões e segurança.
- **[Auditorias](docs/auditorias/)**: Relatórios de auditoria de segurança e cleanups.
- **[SQL/Migrations](docs/sql/)**: Scripts SQL organizados por categoria.

---

## 🗺️ Roadmap de Evolução

- [ ] Aplicativo Nativo (iOS/Android)
- [ ] Módulo de Comunicação Automatizada (WhatsApp API)
- [ ] Sistema de Retenção e Fidelidade
- [ ] Relatórios Executivos em PDF

---

## 📝 Termos e Licença

Software de uso privado. Todos os direitos reservados para **Kayque Brigadeiro**.

---

**Solução tecnológica voltada para a excelência operacional no setor de beleza.** 🌟