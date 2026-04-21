# 🚀 Guia de Deploy na Vercel

## 📋 Checklist Pré-Deploy

### ✅ 1. Variáveis de Ambiente do Supabase

Antes de fazer deploy, você precisa das seguintes informações:

| Variável | Onde pegar |
|----------|-----------|
| `VITE_SUPABASE_URL` | Supabase → Project Settings → API → **Project URL** |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → **anon public** |

**Como pegar:**
1. Acesse: https://supabase.com/dashboard/project/fnvhwfdrmozihekmhbke/settings/api
2. Copie a **Project URL** (ex: `https://fnvhwfdrmozihekmhbke.supabase.co`)
3. Copie a **anon public** key (começa com `eyJ...`)

---

## 🌐 Passo 1: Deploy na Vercel

### **Opção A: Via GitHub (Recomendado)**

1. Acesse: https://vercel.com/new
2. Conecte sua conta do GitHub
3. Selecione o repositório: `Kayquebrigadeiro/Salao-secreto`
4. Clique em **Import**

### **Opção B: Via CLI**

```bash
npm install -g vercel
cd c:\Ptojeto-jaco\Salao-secreto
vercel
```

---

## ⚙️ Passo 2: Configurar Variáveis de Ambiente

**IMPORTANTE:** Sem essas variáveis, o app vai dar erro 401!

1. No painel da Vercel, vá em **Settings** → **Environment Variables**
2. Adicione as seguintes variáveis:

### **Variável 1:**
- **Name:** `VITE_SUPABASE_URL`
- **Value:** `https://fnvhwfdrmozihekmhbke.supabase.co`
- **Environments:** ✅ Production, ✅ Preview, ✅ Development

### **Variável 2:**
- **Name:** `VITE_SUPABASE_ANON_KEY`
- **Value:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (sua chave completa)
- **Environments:** ✅ Production, ✅ Preview, ✅ Development

3. Clique em **Save**

---

## 🔗 Passo 3: Configurar Redirect URLs no Supabase

Após o deploy, você terá uma URL tipo: `https://salao-secreto.vercel.app`

1. Acesse: https://supabase.com/dashboard/project/fnvhwfdrmozihekmhbke/auth/url-configuration

2. Configure:

**Site URL:**
```
https://salao-secreto.vercel.app
```

**Redirect URLs (adicione):**
```
https://salao-secreto.vercel.app/**
http://localhost:5173/**
```

⚠️ **Mantenha o localhost para continuar testando localmente!**

---

## 🧪 Passo 4: Testar o Deploy

1. Acesse sua URL da Vercel
2. Faça login como vendedor
3. Crie um novo salão
4. Verifique se o e-mail de ativação chega
5. Clique no link do e-mail
6. Deve redirecionar para: `https://seu-projeto.vercel.app/agenda`

---

## 🔧 Troubleshooting

### **Erro: "supabaseUrl is required"**
- ✅ Verifique se as variáveis de ambiente estão configuradas na Vercel
- ✅ Certifique-se de que começam com `VITE_`
- ✅ Faça um novo deploy após adicionar as variáveis

### **Erro 401 Unauthorized**
- ✅ Verifique se a `VITE_SUPABASE_ANON_KEY` está correta
- ✅ Copie novamente do Supabase (pode ter expirado)

### **E-mail de ativação não chega**
- ✅ Verifique spam/lixo eletrônico
- ✅ Confirme que `email_confirm: false` está na Edge Function
- ✅ Verifique se "Enable email confirmations" está ativo no Supabase

### **Redirecionamento não funciona**
- ✅ Verifique se a URL está nas Redirect URLs do Supabase
- ✅ Confirme que o `redirectTo` está correto no código

---

## 📦 Build Settings (Vercel detecta automaticamente)

Se precisar configurar manualmente:

- **Framework Preset:** Vite
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install`

---

## 🔄 Re-deploy Após Mudanças

Sempre que fizer alterações no código:

```bash
git add .
git commit -m "feat: descrição da mudança"
git push origin main
```

A Vercel faz deploy automático! 🚀

---

## 📝 Checklist Final

- [ ] Variáveis de ambiente configuradas na Vercel
- [ ] Redirect URLs configuradas no Supabase
- [ ] Edge Function deployada (`npx supabase functions deploy criar-proprietaria`)
- [ ] Teste de criação de salão funcionando
- [ ] E-mail de ativação chegando
- [ ] Redirecionamento funcionando após ativação
- [ ] Login de vendedor funcionando
- [ ] Login de proprietária funcionando

---

## 🎯 URLs Importantes

- **Projeto Vercel:** https://vercel.com/dashboard
- **Supabase Dashboard:** https://supabase.com/dashboard/project/fnvhwfdrmozihekmhbke
- **Repositório GitHub:** https://github.com/Kayquebrigadeiro/Salao-secreto

---

**Desenvolvido com ❤️ para salões de beleza**
