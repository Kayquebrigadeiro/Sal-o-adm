# 🚀 GUIA DE DEPLOY - SaaS Salão de Beleza

## 📋 Pré-requisitos

- ✅ Conta no GitHub
- ✅ Conta no Vercel (gratuita)
- ✅ Supabase configurado e rodando
- ✅ Código funcionando localmente

---

## 🎯 PASSO 1: Preparar o Código

### 1.1 Criar arquivo `.gitignore` (se não existir)

```
# dependencies
node_modules/
.pnp
.pnp.js

# testing
coverage/

# production
dist/
build/

# misc
.DS_Store
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# editor
.vscode/
.idea/
*.swp
*.swo
*~

# Supabase
.supabase/
```

### 1.2 Criar arquivo `.env.example`

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-aqui
```

### 1.3 Atualizar `src/supabaseClient.js` para usar variáveis de ambiente

```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://fnvhwfdrmozihekmhbke.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZudmh3ZmRybW96aWhla21oYmtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwODQ1ODcsImV4cCI6MjA5MDY2MDU4N30.aaMy8bupl4dT-MX8dVlHuxhMwqqrI1YZUFiUuOCVDxs';

export const supabase = createClient(supabaseUrl, supabaseKey);
```

---

## 🎯 PASSO 2: Subir para o GitHub

### 2.1 Inicializar Git (se ainda não fez)

```bash
cd c:\Ptojeto-jaco\SASS-Sal-o
git init
git add .
git commit -m "Initial commit - SaaS Salão completo"
```

### 2.2 Criar repositório no GitHub

1. Acesse: https://github.com/new
2. Nome: `saas-salao-beleza`
3. Descrição: `Sistema SaaS para gerenciamento de salões de beleza`
4. Visibilidade: **Private** (recomendado)
5. Clique em **"Create repository"**

### 2.3 Conectar e fazer push

```bash
git remote add origin https://github.com/SEU-USUARIO/saas-salao-beleza.git
git branch -M main
git push -u origin main
```

---

## 🎯 PASSO 3: Deploy na Vercel

### 3.1 Acessar Vercel

1. Acesse: https://vercel.com
2. Faça login com GitHub
3. Clique em **"Add New..."** → **"Project"**

### 3.2 Importar Repositório

1. Selecione o repositório `saas-salao-beleza`
2. Clique em **"Import"**

### 3.3 Configurar Projeto

**Framework Preset:** Vite
**Root Directory:** `./` (deixe padrão)
**Build Command:** `npm run build`
**Output Directory:** `dist`

### 3.4 Adicionar Variáveis de Ambiente

Clique em **"Environment Variables"** e adicione:

```
VITE_SUPABASE_URL = https://fnvhwfdrmozihekmhbke.supabase.co
VITE_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZudmh3ZmRybW96aWhla21oYmtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwODQ1ODcsImV4cCI6MjA5MDY2MDU4N30.aaMy8bupl4dT-MX8dVlHuxhMwqqrI1YZUFiUuOCVDxs
```

### 3.5 Deploy

1. Clique em **"Deploy"**
2. Aguarde 2-3 minutos
3. ✅ Deploy concluído!

---

## 🎯 PASSO 4: Configurar Supabase para Produção

### 4.1 Adicionar URL da Vercel no Supabase

1. Acesse: https://app.supabase.com/project/fnvhwfdrmozihekmhbke/auth/url-configuration
2. Em **"Site URL"**, adicione: `https://seu-projeto.vercel.app`
3. Em **"Redirect URLs"**, adicione:
   - `https://seu-projeto.vercel.app/**`
   - `http://localhost:5173/**` (para desenvolvimento)
4. Clique em **"Save"**

### 4.2 Verificar RLS Policies

Execute no SQL Editor do Supabase:

```sql
-- Verificar se RLS está ativo em todas as tabelas
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('saloes', 'perfis_acesso', 'profissionais', 'procedimentos', 'atendimentos');
```

Todas devem ter `rowsecurity = true`.

---

## 🎯 PASSO 5: Testar em Produção

### 5.1 Acessar o Site

1. Acesse: `https://seu-projeto.vercel.app`
2. Faça login como **VENDEDOR**
3. Teste criar um salão
4. Faça logout
5. Faça login como **PROPRIETÁRIA** (com as credenciais criadas)
6. Teste a agenda, dashboard, etc.

### 5.2 Checklist de Testes

- [ ] Login funciona
- [ ] Vendedor consegue criar salão
- [ ] Proprietária consegue acessar seu salão
- [ ] Agenda funciona
- [ ] Dashboard carrega dados
- [ ] Configurações salvam
- [ ] Logout funciona

---

## 🎯 PASSO 6: Domínio Personalizado (Opcional)

### 6.1 Adicionar Domínio na Vercel

1. No painel da Vercel, vá em **"Settings"** → **"Domains"**
2. Adicione seu domínio: `www.seusalao.com.br`
3. Configure os DNS conforme instruções da Vercel

### 6.2 Atualizar Supabase

1. Adicione o novo domínio nas **Redirect URLs** do Supabase
2. Atualize o **Site URL** para o domínio personalizado

---

## 📊 Monitoramento e Logs

### Vercel Analytics (Gratuito)

1. No painel da Vercel, vá em **"Analytics"**
2. Ative o **"Web Analytics"**
3. Veja visitantes, performance, etc.

### Supabase Logs

1. Acesse: https://app.supabase.com/project/fnvhwfdrmozihekmhbke/logs/explorer
2. Monitore queries, erros, autenticação

---

## 🔧 Troubleshooting

### Erro: "Failed to fetch"

**Causa:** CORS ou URL do Supabase incorreta
**Solução:** Verifique as variáveis de ambiente na Vercel

### Erro: "Row Level Security"

**Causa:** RLS bloqueando acesso
**Solução:** Execute o SQL do PASSO 4.2

### Erro: "Auth redirect"

**Causa:** URL não configurada no Supabase
**Solução:** Adicione a URL da Vercel nas Redirect URLs

### Build falha na Vercel

**Causa:** Dependências faltando ou erro de sintaxe
**Solução:** 
```bash
# Teste localmente primeiro
npm run build
```

---

## 🎉 Deploy Concluído!

Seu sistema está no ar em:
- 🌐 **Produção:** https://seu-projeto.vercel.app
- 🔧 **Desenvolvimento:** http://localhost:5173
- 📊 **Supabase:** https://app.supabase.com/project/fnvhwfdrmozihekmhbke

---

## 📝 Próximos Passos

1. ✅ Criar backup do banco de dados
2. ✅ Configurar domínio personalizado
3. ✅ Adicionar Google Analytics (opcional)
4. ✅ Configurar email customizado no Supabase Auth
5. ✅ Criar documentação para usuários finais

---

## 🆘 Suporte

- **Vercel Docs:** https://vercel.com/docs
- **Supabase Docs:** https://supabase.com/docs
- **Vite Docs:** https://vitejs.dev

---

**Data:** 2026-04-07
**Versão:** 1.0.0
**Status:** ✅ Pronto para produção
