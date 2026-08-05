# PREPARAÇÃO PARA DEPLOY EM PRODUÇÃO

## Data
17 de julho de 2026

## ✅ BACKEND (Node.js + Express no Render)

### 1. CORS Restringido ✓
**Arquivo**: `backend-node/src/app.js`
**Mudança**: Trocado de `app.use(cors())` (aberto) para CORS restringido com variável de ambiente.

**Como funciona**:
```js
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(',').map(origin => origin.trim());
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
```

**Como configurar no Render**:
1. Acesse o painel do app no Render
2. Environment → Add Environment Variable
3. Nome: `ALLOWED_ORIGINS`
4. Valor: `http://localhost:5173,https://seu-dominio.vercel.app` (separado por vírgula, sem espaços ou com trim())

### 2. Script de Start ✓
**Arquivo**: `backend-node/package.json`
**Status**: Já existe e está correto
```json
"start": "node src/server.js"
```

### 3. Health Check ✓
**Arquivo**: `backend-node/src/app.js`
**Endpoint**: `GET /health`
**Resposta**: `{ "ok": true }`
**Render usa isso para**: Health checks automáticos

### 4. .env.example Atualizado ✓
**Arquivo**: `backend-node/.env.example`
**Mudança**: Adicionada variável de exemplo para CORS

```env
# CORS (production)
# Multiple origins separated by comma
ALLOWED_ORIGINS=http://localhost:5173,https://seu-dominio.vercel.app
```

---

## ✅ FRONTEND (React + Vite no Vercel)

### 1. VITE_API_URL Documentada ✓
**Arquivo**: `.env.example` (raiz do projeto)
**Mudança**: Adicionada variável e outros exemplos para clareza

```env
# API Configuration
VITE_API_URL=http://localhost:3333
```

**Como usar no Vercel**:
1. Acesse o projeto no Vercel
2. Settings → Environment Variables
3. Nome: `VITE_API_URL`
4. Valor: `https://seu-backend.onrender.com` (URL do backend no Render)

**Nota**: Essa variável é lida em `src/services/api.js` para chamar o backend.

---

## 📋 CHECKLIST PARA O RENDER (Backend)

- [ ] Criar app Node.js no Render
- [ ] Apontar branch: `main` (ou qual branch usar)
- [ ] Build Command: `npm install`
- [ ] Start Command: `npm start`
- [ ] Environment Variable: `ALLOWED_ORIGINS=...` (valor com a URL do Vercel depois)
- [ ] Other env vars: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET`, `PORT=3333`
- [ ] Deploy e anotar URL do backend (ex: `https://seu-backend.onrender.com`)

## 📋 CHECKLIST PARA O VERCEL (Frontend)

- [ ] Criar projeto no Vercel apontando este repositório
- [ ] Framework Preset: `Vite`
- [ ] Build Command: `npm run build`
- [ ] Output Directory: `dist`
- [ ] Install Command: `npm ci`
- [ ] Environment Variable: `VITE_API_URL=https://seu-backend.onrender.com` (usar URL do backend do passo anterior)
- [ ] Deploy

## 📋 ORDEM DE DEPLOY

1. **Deploy Backend primeiro** → Anotar URL (ex: `https://seu-backend.onrender.com`)
2. **Configure Frontend com URL do Backend** → `VITE_API_URL=...`
3. **Deploy Frontend**

---

## ✅ TESTES REALIZADOS

- [x] Sintaxe backend: OK
- [x] CORS configuration: OK
- [x] Health endpoint: OK
- [x] Frontend build: OK

---

## 🔄 ROLLBACK

Se precisar reverter as mudanças:
```bash
git revert <commit-hash>
```

Mudanças feitas são mínimas e isoladas — apenas configuração de produção.

---

**Preparado por**: Copilot CLI
**Status**: Pronto para deploy manual (sem criar contas nem fazer deploy de verdade)
