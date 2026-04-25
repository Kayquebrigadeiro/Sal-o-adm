# 💇♀️ SaaS Salão de Beleza

Sistema completo de gerenciamento para salões de beleza com painel administrativo multi-tenant.

## 📋 Índice

- [Sobre o Projeto](#sobre-o-projeto)
- [Tecnologias](#tecnologias)
- [Instalação](#instalação)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Funcionalidades](#funcionalidades)
- [Documentação](#documentação)
- [Deploy](#deploy)

---

## 🎯 Sobre o Projeto

Sistema SaaS multi-tenant para gerenciamento completo de salões de beleza:

- **Painel Administrativo** - Vendedores gerenciam múltiplos salões
- **Painel Proprietária** - Gestão completa do salão
- **Sistema de Login Dual** - Email para admins, username para proprietárias
- **Dashboard Financeiro** - Controle de receitas, despesas e lucro
- **Agenda Inteligente** - Agendamentos com horários de 30 em 30 minutos

---

## 🛠️ Tecnologias

- **Frontend:** React 18 + Vite
- **Estilização:** Tailwind CSS
- **Roteamento:** React Router v7
- **Backend:** Supabase (PostgreSQL + Auth)
- **Gráficos:** Recharts
- **Ícones:** Lucide React

---

## 📦 Instalação

```bash
# Clone o repositório
git clone https://github.com/Kayquebrigadeiro/Salao-secreto.git

# Entre na pasta
cd Salao-secreto

# Instale as dependências
npm install

# Configure o banco de dados
# Execute o arquivo: docs/sql/schema_saas_final_CORRIGIDO.sql no Supabase

# Inicie o servidor
npm run dev
```

Acesse: http://localhost:5173

---

## 📁 Estrutura do Projeto

```
Salao-secreto/
├── src/
│   ├── components/          # Componentes reutilizáveis
│   ├── hooks/              # Custom hooks
│   ├── pages/              # Páginas principais
│   ├── vendedor/           # Painel administrativo
│   ├── App.jsx             # Componente principal
│   └── supabaseClient.js   # Configuração Supabase
├── docs/
│   ├── guias/              # Guias de uso e deploy
│   ├── sql/                # Scripts SQL e migrations
│   ├── prompts/            # Prompts de desenvolvimento
│   └── resumos/            # Resumos de implementações
├── supabase/
│   └── functions/          # Edge Functions
├── backup/                 # Arquivos de backup
└── README.md
```

---

## ✨ Funcionalidades

### 🔐 Sistema de Login Dual

**Admin/Vendedor:**
- Login com **email + senha**
- Acesso ao painel administrativo
- Gerenciamento de múltiplos salões

**Proprietária:**
- Login com **username + senha**
- Acesso ao dashboard do salão
- Gestão completa de atendimentos

### 👨‍💼 Painel do Vendedor (Admin)

- ✅ Criar e gerenciar múltiplos salões
- ✅ Configurar profissionais e procedimentos
- ✅ Definir preços e comissões
- ✅ Gerar credenciais de acesso (username/senha)
- ✅ Gerenciar outros admins do sistema

### 👩‍💼 Painel da Proprietária

- ✅ Agenda visual (08:00 às 19:00)
- ✅ Dashboard com gráficos financeiros
- ✅ Controle de despesas mensais
- ✅ Gestão de profissionais
- ✅ Configuração de procedimentos
- ✅ Relatórios de receita e lucro

### 📊 Dashboard Financeiro

- Receita total e recebida
- Pendências de pagamento
- Lucro líquido vs possível
- Ranking de procedimentos
- Rendimento por profissional
- Controle de despesas

---

## 📚 Documentação

### Guias Principais

- **[Guia de Deploy](docs/guias/GUIA_DEPLOY.md)** - Como fazer deploy do sistema
- **[Guia de Criação de Vendedor](docs/guias/GUIA_CRIAR_VENDEDOR_ADMIN.md)** - Como criar o primeiro admin
- **[Guia de Testes](docs/guias/GUIA_TESTES_PRATICO.md)** - Como testar o sistema

### Arquitetura

- **[Arquitetura do Sistema](docs/ARQUITETURA_VENDEDOR_ADMIN.md)** - Visão geral da arquitetura
- **[Fluxo de Criação de Salão](docs/FLUXO_CRIACAO_SALAO_COMPLETO.md)** - Passo a passo detalhado

### SQL

- **[Schema Principal](docs/sql/schema_saas_final_CORRIGIDO.sql)** - Schema completo do banco
- **[Migrations](docs/sql/)** - Histórico de alterações

### Resumos de Implementação

- **[Resumo de Alterações](docs/resumos/RESUMO_ALTERACOES.md)**
- **[Implementação de Admins](docs/resumos/RESUMO_IMPLEMENTACAO_ADMINS.md)**
- **[Sistema de Username](docs/resumos/RESUMO_USERNAME.md)**

---

## 🚀 Deploy

### Supabase

1. Crie um projeto no [Supabase](https://supabase.com)
2. Execute o SQL: `docs/sql/schema_saas_final_CORRIGIDO.sql`
3. Configure as variáveis de ambiente:

```env
VITE_SUPABASE_URL=sua_url_aqui
VITE_SUPABASE_ANON_KEY=sua_chave_aqui
```

### Vercel (Recomendado)

```bash
npm run build
vercel --prod
```

Ou use o botão:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Kayquebrigadeiro/Salao-secreto)

---

## 🔑 Credenciais de Teste

Após configurar o banco, crie um vendedor manualmente:

```sql
-- 1. Crie um usuário no Supabase Authentication
-- 2. Execute:
INSERT INTO perfis_acesso (auth_user_id, salao_id, cargo)
VALUES (
  'UUID_DO_USUARIO',
  '00000000-0000-0000-0000-000000000000',
  'VENDEDOR'
);
```

---

## 🗄️ Banco de Dados

### Tabelas Principais

- `saloes` - Dados dos salões
- `perfis_acesso` - Usuários e permissões
- `logins_gerados` - Credenciais de proprietárias
- `profissionais` - Funcionários
- `procedimentos` - Serviços oferecidos
- `atendimentos` - Agendamentos
- `despesas` - Controle financeiro

### Views

- `fechamento_mensal` - Resumo financeiro mensal
- `ranking_procedimentos` - Procedimentos mais rentáveis
- `rendimento_por_profissional` - Performance da equipe

---

## 🔐 Segurança

- ✅ Row Level Security (RLS) em todas as tabelas
- ✅ Isolamento multi-tenant
- ✅ Autenticação via Supabase Auth
- ✅ Senhas geradas com 12 caracteres seguros
- ✅ Triggers automáticos para integridade

---

## 🤝 Contribuindo

1. Crie uma branch: `git checkout -b feature/nova-funcionalidade`
2. Commit: `git commit -m 'Adiciona nova funcionalidade'`
3. Push: `git push origin feature/nova-funcionalidade`
4. Abra um Pull Request

---

## 📝 Notas Importantes

### Para Desenvolvedores

- O sistema usa **2 tipos de login**: email (admin) e username (proprietária)
- Triggers automáticos criam perfis e registram logins
- Edge Functions precisam ser deployadas separadamente
- RLS protege todos os dados por salão

### Para Vendedores

- Anote as credenciais ao criar um salão
- Username e senha são gerados automaticamente
- Entregue credenciais em papel (não por WhatsApp)
- Cada salão é isolado dos demais

---

## 🆘 Suporte

Para dúvidas:

1. Consulte a [documentação](docs/)
2. Verifique os [guias](docs/guias/)
3. Entre em contato com o desenvolvedor

---

## 📄 Licença

Projeto privado - Todos os direitos reservados

---

## 🎯 Roadmap

- [ ] App mobile (React Native)
- [ ] Notificações por WhatsApp
- [ ] Integração com pagamento online
- [ ] Sistema de fidelidade
- [ ] Relatórios em PDF

---

**Desenvolvido para salões de beleza**

