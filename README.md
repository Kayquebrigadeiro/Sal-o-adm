# 💇‍♀️ Salão Secreto: Ecossistema SaaS de Gestão Financeira Avançada

> **Solução integrada para otimização de margens de lucro e controle operacional multi-tenant.**

O **Salão Secreto** é uma plataforma SaaS especializada que atua como um núcleo de inteligência financeira. Projetado para substituir processos manuais e planilhas de alta complexidade, o sistema automatiza a auditoria de cada atendimento, garantindo o controle rigoroso sobre custos e lucratividade.

---

## 🎯 Objetivo: Segurança Operacional e Rentabilidade

O sistema elimina a incerteza financeira comum na gestão de centros de estética através de:

- **Auditoria Financeira Automática**: Algoritmos que processam instantaneamente taxas de operadoras, comissões e custos operacionais (fixos e variáveis).
- **Métricas de Lucratividade**: Visualização clara entre faturamento bruto, lucro líquido real e potencial de ganho baseado no método de pagamento.
- **Gestão de Fluxo de Caixa Integrada**: Módulo de controle de despesas e retiradas para preservar o capital de giro da empresa.

---

## 🎭 Estrutura de Acessos e Perfis (RBAC)

A plataforma possui um sistema de permissões baseado em níveis de responsabilidade:

### 👑 ADMINISTRADOR GERAL (Vendedor)
- Gestão centralizada de múltiplos salões (tenants).
- Monitoramento de indicadores globais de performance.
- Configuração de infraestrutura e provisionamento de novos acessos.

### 👩‍💼 GESTÃO DE UNIDADE (Proprietária)
- Controle administrativo total do ponto de venda.
- Configuração de regras de comissionamento e precificação.
- Acesso a dashboards estratégicos de saúde financeira e performance de equipe.

### ✂️ COLABORADOR OPERACIONAL (Staff)
- Interface simplificada para gestão de agenda individual.
- Acesso restrito a informações operacionais pertinentes à função.
- Foco na excelência do atendimento e organização de horários.

---

## ✨ Diferenciais Tecnológicos

- **🛡️ Isolamento Multi-Tenant**: Implementação robusta de Row Level Security (RLS) para garantir a total privacidade e segurança dos dados entre unidades.
- **📈 Inteligência de Dados**: Dashboards em tempo real com ranking de procedimentos e análise de rendimento por profissional.
- **🕒 Agendamento Inteligente**: Sistema de reserva de horários integrado ao motor financeiro para previsão imediata de margens.
- **⚙️ Automação de Back-end**: Triggers em PostgreSQL para atualização atômica de indicadores financeiros a cada transação.

---

## 🛠️ Especificações Técnicas

Desenvolvido com tecnologias de vanguarda para garantir escalabilidade e resiliência:

- **Frontend**: [React 18](https://reactjs.org/) + [Vite](https://vitejs.dev/)
- **Estilização**: [Tailwind CSS](https://tailwindcss.com/)
- **Infraestrutura**: [Supabase](https://supabase.com/) (PostgreSQL & Auth)
- **Análise Visual**: [Recharts](https://recharts.org/)
- **Segurança**: Row Level Security (RLS) & JWT Authentication

---

## 🚀 Implementação

### Pré-requisitos
- Node.js 18+
- Projeto Supabase configurado

### Procedimento de Instalação

1. **Repositório e Dependências**:
   ```bash
   git clone https://github.com/Kayquebrigadeiro/Salao-secreto.git
   cd Salao-secreto
   npm install
   ```

2. **Variáveis de Ambiente**:
   Configure o arquivo `.env` com as credenciais do Supabase:
   ```env
   VITE_SUPABASE_URL=seu_projeto.supabase.co
   VITE_SUPABASE_ANON_KEY=sua_chave_anon
   ```

3. **Esquema de Banco de Dados**:
   Importe o script `docs/sql/schema_saas_final_CORRIGIDO.sql` via SQL Editor no Supabase.

4. **Execução**:
   ```bash
   npm run dev
   ```

---

## 📂 Documentação e Suporte

Acesse os documentos técnicos para orientações detalhadas:

- 📑 **[Guia de Deploy](docs/guias/GUIA_DEPLOY.md)**: Procedimentos para publicação.
- 🏗️ **[Arquitetura do Sistema](docs/ARQUITETURA_VENDEDOR_ADMIN.md)**: Documentação técnica da infraestrutura.
- 🧠 **[Lógica Financeira](docs/CONTEXTO_COMPLETO_IA.md)**: Detalhamento das regras de negócio e cálculos.
- 🔐 **[Gestão de Acessos](docs/resumos/RESUMO_IMPLEMENTACAO_ADMINS.md)**: Estrutura de permissões e segurança.

---

## 🤝 Roadmap de Evolução

- [ ] Aplicativo Nativo (iOS/Android)
- [ ] Módulo de Comunicação Automatizada (WhatsApp API)
- [ ] Sistema de Retenção e Fidelidade
- [ ] Relatórios Executivos em PDF

---

## 📄 Termos e Licença

Software de uso privado. Todos os direitos reservados para **Kayque Brigadeiro**.

---

**Solução tecnológica voltada para a excelência operacional no setor de beleza.**
