# 🚀 GUIA: Deploy das Edge Functions - Gerenciar Admins

## 📋 O que foi implementado

Sistema completo para gerenciar admins no painel do vendedor:

✅ **Componente React:** `GerenciarAdmins.jsx`
✅ **Rota adicionada:** `/admin/admins`
✅ **Menu atualizado:** Item "Admins" no sidebar
✅ **Edge Function 1:** `criar-admin` - Cria novos admins
✅ **Edge Function 2:** `remover-admin` - Remove admins

---

## 🔧 Como fazer o Deploy das Edge Functions

### Opção 1: Via Supabase CLI (Recomendado)

```bash
# 1. Instalar Supabase CLI (se ainda não tiver)
npm install -g supabase

# 2. Fazer login
supabase login

# 3. Link com seu projeto
supabase link --project-ref fnvhwfdrmozihekmhbke

# 4. Deploy das funções
supabase functions deploy criar-admin
supabase functions deploy remover-admin

# 5. Verificar se foram deployadas
supabase functions list
```

### Opção 2: Via Dashboard do Supabase

1. Acesse: https://supabase.com/dashboard/project/fnvhwfdrmozihekmhbke/functions

2. **Criar função: criar-admin**
   - Clique em "New Function"
   - Nome: `criar-admin`
   - Cole o conteúdo de `supabase/functions/criar-admin/index.ts`
   - Clique em "Deploy"

3. **Criar função: remover-admin**
   - Clique em "New Function"
   - Nome: `remover-admin`
   - Cole o conteúdo de `supabase/functions/remover-admin/index.ts`
   - Clique em "Deploy"

---

## 🔑 Configurar Variáveis de Ambiente

As Edge Functions precisam da `SUPABASE_SERVICE_ROLE_KEY` para criar/remover usuários.

### No Supabase Dashboard:

1. Vá em: **Settings → API**
2. Copie a `service_role` key (secret)
3. Vá em: **Edge Functions → Settings**
4. Adicione a variável:
   ```
   SUPABASE_SERVICE_ROLE_KEY = sua_service_role_key_aqui
   ```

**⚠️ IMPORTANTE:** A `service_role` key tem poderes de admin. NUNCA exponha no frontend!

---

## 🧪 Como Testar

### 1. Testar Criação de Admin

```bash
# Via curl (substitua a URL e a key)
curl -X POST \
  https://fnvhwfdrmozihekmhbke.supabase.co/functions/v1/criar-admin \
  -H "Authorization: Bearer SUA_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "novoadmin@teste.com",
    "senha": "senha123",
    "nome": "Novo Admin"
  }'
```

### 2. Testar no Frontend

1. Faça login como **Vendedor/Admin**
2. Clique em **"Admins"** no menu
3. Clique em **"+ Novo admin"**
4. Preencha:
   - Nome: `Admin Teste`
   - Email: `admin.teste@exemplo.com`
   - Senha: `teste123`
5. Clique em **"Criar admin"**
6. ✅ Deve aparecer na lista!

### 3. Testar Remoção

1. Na lista de admins
2. Clique em **"Remover"** em um admin (não você mesmo)
3. Confirme
4. ✅ Admin deve ser removido!

---

## 📁 Estrutura de Arquivos Criados

```
Salao-secreto/
├── src/
│   └── vendedor/
│       ├── GerenciarAdmins.jsx          ← NOVO
│       ├── VendedorApp.jsx              ← MODIFICADO (rota adicionada)
│       └── VendedorSidebar.jsx          ← MODIFICADO (menu atualizado)
│
└── supabase/
    └── functions/
        ├── criar-admin/
        │   └── index.ts                 ← NOVO
        └── remover-admin/
            └── index.ts                 ← NOVO
```

---

## 🔒 Segurança

### Proteções Implementadas:

✅ **Admin não pode se remover**
- Botão "Remover" oculto para o próprio usuário
- Validação no backend também

✅ **Apenas admins podem criar admins**
- Edge Functions verificam autenticação
- RLS protege tabela `perfis_acesso`

✅ **Service Role Key protegida**
- Apenas no backend (Edge Functions)
- Nunca exposta no frontend

✅ **CORS configurado**
- Permite apenas requisições do seu domínio
- Headers de segurança configurados

---

## 🐛 Troubleshooting

### Erro: "Function not found"
```
✅ Solução:
- Verifique se fez deploy das funções
- Execute: supabase functions list
- Deve aparecer: criar-admin e remover-admin
```

### Erro: "Service role key not found"
```
✅ Solução:
- Configure SUPABASE_SERVICE_ROLE_KEY nas Edge Functions
- Dashboard → Edge Functions → Settings → Secrets
```

### Erro: "You cannot remove yourself"
```
✅ Esperado!
- Admin não pode se auto-remover
- Peça para outro admin remover você
```

### Erro: "Failed to create user"
```
✅ Solução:
- Email já existe? Use outro email
- Senha muito curta? Mínimo 6 caracteres
- Verifique logs: Dashboard → Edge Functions → Logs
```

---

## 📊 Fluxo Completo

```
┌─────────────────────────────────────────────────────────┐
│ CRIAR ADMIN                                             │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ 1. Admin clica "Novo admin"                             │
│ 2. Preenche: nome, email, senha                         │
│ 3. Frontend chama Edge Function: criar-admin            │
│ 4. Edge Function:                                       │
│    - Cria usuário no Supabase Auth                      │
│    - Confirma email automaticamente                     │
│    - Cria perfil em perfis_acesso                       │
│    - cargo = 'VENDEDOR'                                 │
│    - salao_id = '00000000-0000-0000-0000-000000000000'  │
│ 5. Retorna sucesso                                      │
│ 6. Frontend recarrega lista                             │
│ 7. ✅ Novo admin aparece na lista                       │
│                                                         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ REMOVER ADMIN                                           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ 1. Admin clica "Remover" em outro admin                 │
│ 2. Confirma ação                                        │
│ 3. Frontend chama Edge Function: remover-admin          │
│ 4. Edge Function:                                       │
│    - Valida que não é auto-remoção                      │
│    - Remove perfil de perfis_acesso                     │
│    - Remove usuário do Supabase Auth                    │
│ 5. Retorna sucesso                                      │
│ 6. Frontend recarrega lista                             │
│ 7. ✅ Admin removido da lista                           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## ✅ Checklist de Implementação

- [x] Criar `GerenciarAdmins.jsx`
- [x] Adicionar rota em `VendedorApp.jsx`
- [x] Adicionar menu em `VendedorSidebar.jsx`
- [x] Criar Edge Function `criar-admin`
- [x] Criar Edge Function `remover-admin`
- [ ] **Deploy das Edge Functions no Supabase**
- [ ] **Configurar SUPABASE_SERVICE_ROLE_KEY**
- [ ] Testar criação de admin
- [ ] Testar remoção de admin
- [ ] Verificar que não pode se auto-remover

---

## 🎯 Próximos Passos

1. **Deploy das Edge Functions:**
   ```bash
   supabase functions deploy criar-admin
   supabase functions deploy remover-admin
   ```

2. **Configurar Service Role Key:**
   - Dashboard → Edge Functions → Settings
   - Adicionar `SUPABASE_SERVICE_ROLE_KEY`

3. **Testar no Frontend:**
   - Login como admin
   - Ir em "Admins"
   - Criar novo admin
   - Testar remoção

4. **Documentar credenciais:**
   - Anotar emails e senhas dos admins criados
   - Guardar em local seguro

---

## 📞 Comandos Úteis

```bash
# Ver logs das funções
supabase functions logs criar-admin
supabase functions logs remover-admin

# Testar localmente (opcional)
supabase functions serve criar-admin
supabase functions serve remover-admin

# Deletar função (se necessário)
supabase functions delete criar-admin
supabase functions delete remover-admin
```

---

**✨ Sistema de Gerenciamento de Admins implementado com sucesso!**

Agora você pode criar e remover admins diretamente pelo painel, sem precisar acessar o Supabase Dashboard.
