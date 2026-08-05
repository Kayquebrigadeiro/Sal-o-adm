# PREPARAÇÃO DE SEGURANÇA - .GITIGNORE

## Data
18 de julho de 2026

## ✅ ARQUIVOS ATUALIZADOS

### 1. Raiz do Projeto - `.gitignore` ✓
**Localização**: `/`.gitignore
**Mudanças**: Expandido com proteção completa para informações sensíveis

**Padrões Adicionados**:
```
✓ .env e variações (.env.*, .env.production, etc)
✓ Logs detalhados (npm-debug.log, yarn-error.log, etc)
✓ Chaves & Certificados (*.pem, *.key, *.pub)
✓ Credenciais (credentials.json, service-account-key.json)
✓ Diretórios sensíveis (secrets/, .secrets/, private/)
✓ Backups de banco (dump.sql, *.sql.bak)
✓ IDE files (.vscode/, .idea/, .sublime-project)
✓ Cache & temp files (tmp/, temp/, .cache/)
```

### 2. Backend - `backend-node/.gitignore` ✓
**Localização**: `backend-node/.gitignore`
**Status**: Criado (não existia antes)

**Padrões de Proteção**:
```
✓ Environment variables (.env, .env.*)
✓ Logs (logs/, *.log, debug.log)
✓ Build artifacts (dist/, build/)
✓ Dependencies (node_modules/)
✓ Test coverage (coverage/, .nyc_output/)
✓ Credentials (.pem, .key, .jks, .keystore)
✓ Database files (*.db, *.sqlite, *.sqlite3)
✓ API keys e senhas (api-keys.json, etc)
```

---

## 🔒 INFORMAÇÕES SENSÍVEIS PROTEGIDAS

| Tipo | Exemplos | Status |
|------|----------|--------|
| **Environment Variables** | .env, .env.production | ✅ Ignorado |
| **Chaves Privadas** | *.pem, *.key, *.pub | ✅ Ignorado |
| **Credenciais JSON** | credentials.json, service-account-key.json | ✅ Ignorado |
| **Database Backups** | dump.sql, *.sql.bak | ✅ Ignorado |
| **Logs** | *.log, npm-debug.log | ✅ Ignorado |
| **Certificados** | *.der, *.jks, *.keystore | ✅ Ignorado |
| **Segredos** | secrets/, .secrets/, private/ | ✅ Ignorado |

---

## ✅ SCAN DE SEGURANÇA REALIZADO

### Arquivos Sensíveis Já Commitados
```
✓ Nenhum arquivo .env real encontrado (apenas .env.example)
✓ Nenhuma chave privada encontrada
✓ Nenhuma credencial comprometida
```

### Arquivos Exemplo Permitidos
Os seguintes arquivos permanecem commited (são exemplos, sem dados reais):
```
.env.example          ← Exemplo seguro (valores placeholders)
backend-node/.env.example ← Exemplo seguro (valores placeholders)
```

---

## 📋 CHECKLIST DE SEGURANÇA

- [x] `.gitignore` raiz atualizado
- [x] `.gitignore` backend criado
- [x] Padrões de proteção compilados
- [x] Scan de arquivos sensíveis já commited
- [x] `.env.example` documentado (valores placeholders apenas)

---

## 🔍 COMO USAR

### Antes de Fazer Commit
```bash
# Verificar se há arquivos sensíveis não-stage
git status

# Ver arquivos que serão commited
git diff --cached --name-only

# Se acidentalmente stagear arquivo sensível
git reset backend-node/.env
```

### Se Acidentalmente Commitar Arquivo Sensível

⚠️ **Se você já fez commit com arquivo .env real**:
```bash
# Remover arquivo do histórico (use BFG Repo-Cleaner para melhor performance)
# Opção 1 - git filter-branch (mais lento)
git filter-branch --tree-filter 'rm -f backend-node/.env' HEAD

# Opção 2 - BFG Repo-Cleaner (recomendado)
bfg --delete-files backend-node/.env

# Force push para remover do repositório remoto
git push -f origin main
```

**IMPORTANTE**: Após remover do histórico, regenere TODAS as credenciais (API keys, JWT_SECRET, passwords) pois elas foram expostas!

---

## 🚨 VARIÁVEIS SENSÍVEIS NO BACKEND

**Nunca commit com valores reais**:
```env
# ❌ NÃO FAÇA ISSO
DB_PASSWORD=minha_senha_real_123

# ✅ FAÇA ISSO (.env.example com placeholders)
DB_PASSWORD=troque_por_um_seguro_segredo
```

**Definir via variáveis de ambiente em produção**:
- **Render**: Environment Variables no painel
- **Vercel**: Environment Variables no painel
- **Local**: Arquivo `.env` (não commit)

---

## 📖 RESUMO DE SEGURANÇA

| Item | Descrição |
|------|-----------|
| **Raiz .gitignore** | ✅ Proteção completa |
| **Backend .gitignore** | ✅ Proteção específica Node.js |
| **Arquivo .env real** | ✅ Ignorado (nunca sobe) |
| **Arquivo .env.example** | ✅ Commited (referência) |
| **Logs** | ✅ Ignorados |
| **node_modules** | ✅ Ignorados |
| **Chaves & Certificados** | ✅ Ignorados |
| **Histórico comprometido** | ✅ Limpo |

---

**Pronto para produção com segurança! 🔒**

