# 💇‍♀️ SaaS Salão de Beleza

Sistema completo de gerenciamento para salões de beleza com painel administrativo multi-tenant.

## 🚀 Deploy Rápido

### Vercel (Recomendado)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Kayquebrigadeiro/SASS-Sal-o)

1. Clique no botão acima
2. Faça login com GitHub
3. O projeto já está configurado com `.env` incluído
4. Clique em **Deploy**
5. ✅ Pronto em 2 minutos!

### Netlify (Alternativa)

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/Kayquebrigadeiro/SASS-Sal-o)

---

## 📋 Sobre o Projeto

Sistema SaaS completo para gerenciamento de salões de beleza com:

- 📅 **Agenda inteligente** - Agendamento de clientes com horários de 30 em 30 minutos
- 💰 **Dashboard financeiro** - Controle completo de receitas, despesas e lucro
- 👥 **Gestão de profissionais** - Cadastro de funcionários e comissões
- 💅 **Procedimentos** - Catálogo completo de serviços (cabelo, unhas, sobrancelhas, etc)
- 🏢 **Multi-tenant** - Um vendedor pode gerenciar múltiplos salões
- 🔐 **Autenticação segura** - Sistema de login com diferentes níveis de acesso

---

## 🛠️ Tecnologias

- **Frontend:** React 18 + Vite
- **Estilização:** Tailwind CSS
- **Roteamento:** React Router v7
- **Backend:** Supabase (PostgreSQL + Auth + APIs REST)
- **Gráficos:** Recharts
- **Ícones:** Lucide React

---

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────┐
│  VENDEDOR (Admin)                       │
│  - Cria e gerencia múltiplos salões     │
│  - Define configurações iniciais        │
│  - Cria login das proprietárias         │
└─────────────────────────────────────────┘
                    │
                    ├─── Salão 1
                    │    └─── PROPRIETÁRIA
                    │         ├─── Agenda
                    │         ├─── Dashboard
                    │         ├─── Despesas
                    │         └─── Configurações
                    │
                    ├─── Salão 2
                    └─── Salão 3...
```

---

## 🔑 Níveis de Acesso

### 1. VENDEDOR (Admin)
- Acesso ao painel administrativo
- Criar novos salões
- Gerenciar múltiplos salões
- Configurar profissionais e procedimentos

### 2. PROPRIETÁRIA
- Acesso completo ao seu salão
- Agenda de atendimentos
- Dashboard financeiro
- Gestão de despesas
- Configurações do salão

### 3. FUNCIONÁRIA
- Acesso apenas à agenda
- Visualizar seus atendimentos
- Registrar procedimentos realizados

---

## 📦 Instalação Local

```bash
# Clone o repositório
git clone https://github.com/Kayquebrigadeiro/SASS-Sal-o.git

# Entre na pasta
cd SASS-Sal-o

# Instale as dependências
npm install

# O arquivo .env já está incluído (repositório privado)

# Inicie o servidor de desenvolvimento
npm run dev
```

Acesse: http://localhost:5173

---

## 🗄️ Banco de Dados

O projeto usa **Supabase** como backend. O banco já está configurado e rodando em:

```
URL: https://fnvhwfdrmozihekmhbke.supabase.co
```

### Estrutura de Tabelas:

- `saloes` - Dados dos salões
- `perfis_acesso` - Usuários e permissões
- `profissionais` - Funcionários dos salões
- `procedimentos` - Serviços oferecidos
- `atendimentos` - Agendamentos e histórico
- `despesas` - Controle financeiro
- `configuracoes` - Configurações por salão

---

## 🔐 Credenciais de Teste

### Vendedor (Admin)
```
Email: vendedor@salao.com
Senha: vendedor123
```

### Proprietária (Exemplo)
```
Email: proprietaria@salao.com
Senha: (definida pelo vendedor ao criar o salão)
```

---

## 📱 Funcionalidades Principais

### Para o Vendedor:
- ✅ Dashboard com lista de todos os salões
- ✅ Criar novo salão (wizard de 5 etapas)
- ✅ Configurar profissionais e procedimentos
- ✅ Definir preços e comissões
- ✅ Criar login da proprietária

### Para a Proprietária:
- ✅ Agenda visual com horários de 08:00 às 19:00
- ✅ Dashboard com gráficos de receita e despesas
- ✅ Controle de despesas mensais
- ✅ Gestão de profissionais
- ✅ Configuração de procedimentos e preços
- ✅ Relatórios financeiros

### Para a Funcionária:
- ✅ Visualizar agenda do dia
- ✅ Registrar atendimentos realizados
- ✅ Ver histórico de comissões

---

## 🚀 Deploy

### Variáveis de Ambiente (já configuradas no .env)

```env
VITE_SUPABASE_URL=https://fnvhwfdrmozihekmhbke.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Build de Produção

```bash
npm run build
```

Gera os arquivos otimizados na pasta `dist/`

---

## 📚 Documentação Adicional

- [GUIA_DEPLOY.md](./GUIA_DEPLOY.md) - Guia completo de deploy
- [ARQUITETURA_VENDEDOR_ADMIN.md](./ARQUITETURA_VENDEDOR_ADMIN.md) - Arquitetura do sistema
- [CHECKLIST_DEPLOY_FINAL.md](./CHECKLIST_DEPLOY_FINAL.md) - Checklist de deploy
- [PROMPT_ADMIN_COMPLETO.md](./PROMPT_ADMIN_COMPLETO.md) - Documentação técnica

---

## 🤝 Contribuindo

Este é um repositório privado. Para contribuir:

1. Crie uma branch: `git checkout -b feature/nova-funcionalidade`
2. Commit suas mudanças: `git commit -m 'Adiciona nova funcionalidade'`
3. Push para a branch: `git push origin feature/nova-funcionalidade`
4. Abra um Pull Request

---

## 📄 Licença

Projeto privado - Todos os direitos reservados

---

## 🆘 Suporte

Para dúvidas ou problemas:

1. Verifique a documentação em `/docs`
2. Consulte os arquivos `GUIA_*.md`
3. Entre em contato com o desenvolvedor

---

## 🎯 Roadmap

- [ ] App mobile (React Native)
- [ ] Notificações por WhatsApp
- [ ] Integração com pagamento online
- [ ] Sistema de fidelidade para clientes
- [ ] Relatórios avançados em PDF

---

**Desenvolvido com ❤️ para salões de beleza**

**Versão:** 1.0.0  
**Última atualização:** Janeiro 2025
