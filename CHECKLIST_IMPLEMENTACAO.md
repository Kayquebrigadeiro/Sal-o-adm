# ✅ **CHECKLIST: Implementação de Vendedor/Admin**

## 🎯 **O que foi implementado:**

### **Frontend (React)**
- [x] `AdminVendedor.jsx` → Página completa de gerenciamento
- [x] `CadastroPropietaria.jsx` → Componente de cadastro de proprietárias
- [x] Atualização de `App.jsx` → Detecta VENDEDOR e renderiza AdminVendedor
- [x] Atualização de `Sidebar.jsx` → Menu diferente para VENDEDOR
- [x] Icones (lucide-react): Building2, Users, Trash2, Plus
- [x] Estilos Tailwind CSS

### **Backend SQL**
- [x] Script de migração: `MIGRATION_VENDEDOR_ADMIN.sql`
- [x] Tabela: `logins_gerados`
- [x] Função: `fn_gerar_senha_aleatoria()`
- [x] Função: `fn_deletar_salao()`
- [x] Alterações em `saloes`: `vendedor_id`, `deletado_em`
- [x] RLS Policy para `logins_gerados`
- [x] Trigger atualizado: `handle_new_user_salao()`

### **Documentação**
- [x] `GUIA_CRIAR_VENDEDOR_ADMIN.md` → Passo-a-passo para criar VENDEDOR
- [x] `ARQUITETURA_VENDEDOR_ADMIN.md` → Detalhes técnicos da implementação

---

## 📝 **TODO: Próximos Passos (Para Você)**

### **1️⃣ BANCO DE DADOS (OBRIGATÓRIO)**

- [ ] Abrir **SQL Editor** do Supabase
- [ ] Copiar **TODO** o conteúdo de [MIGRATION_VENDEDOR_ADMIN.sql](MIGRATION_VENDEDOR_ADMIN.sql)
- [ ] **Executar como um único script**
- [ ] Verificar se executou sem erros

**Resultado esperado:**
```
✅ Tabela logins_gerados criada
✅ Colunas adicionadas em saloes
✅ Functions criadas
✅ RLS Policy aplicada
```

---

### **2️⃣ CRIAR CONTA DE VENDEDOR**

- [ ] Vá para **Supabase** → **Authentication** → **Users**
- [ ] Clique **"Add user"**
- [ ] Preencha:
  - Email: `vendedor@seusaloes.com`
  - Password: uma senha forte (ex: `VendedorSalas2024!`)
- [ ] Clique **"Create user"**
- [ ] **COPIE o User ID** (aparece na tabela)

---

### **3️⃣ INSERIR PERFIL DE VENDEDOR**

- [ ] Vá para **SQL Editor** do Supabase
- [ ] Execute esta query:

```sql
INSERT INTO public.perfis_acesso (auth_user_id, salao_id, cargo)
VALUES (
  'COLE_O_USER_ID_AQUI'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'VENDEDOR'::cargo_enum
);
```

**Exemplo:**
```sql
INSERT INTO public.perfis_acesso (auth_user_id, salao_id, cargo)
VALUES (
  '123e4567-e89b-12d3-a456-426614174000'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'VENDEDOR'::cargo_enum
);
```

- [ ] Execute a query

---

### **4️⃣ TESTAR NO FRONTEND**

- [ ] Recarregue seu navegador (Ctrl+Shift+R)
- [ ] Faça **LOGOUT** se estiver logado
- [ ] Faça login com:
  - Email: `vendedor@seusaloes.com`
  - Senha: a que você criou
- [ ] Deve abrir **"Painel de Vendedor"** com 2 abas:
  - Salões (criar/deletar)
  - Proprietárias (gerar logins)

✅ **Se tudo funcionou, parabéns!** 🎉

---

## 🧪 **Testes Recomendados:**

### **Teste 1: Criar Salão**
- [ ] Vendedor clica "Criar Novo Salão"
- [ ] Preenche: Nome = "Salão Teste", Telefone = "1234567890"
- [ ] Clica "Criar Salão"
- [ ] Mensagem de sucesso aparece
- [ ] Salão aparece na lista

### **Teste 2: Gerar Login de Proprietária**
- [ ] Clica em um salão na aba "Proprietárias"
- [ ] Preenche: Nome = "Maria Silva", Email = "maria@email.com"
- [ ] Clica "Gerar Login"
- [ ] Ver senha temporária gerada
- [ ] Login aparece no histórico

### **Teste 3: Deletar Salão**
- [ ] Clica ícone lixeira em um salão
- [ ] Confirmação: "Deletar 'Salão' permanentemente?"
- [ ] Salão desaparece da lista
- [ ] RLS garante soft-delete

### **Teste 4: Proprietária Login**
- [ ] Logout do vendedor
- [ ] Tenta logar com email da proprietária gerado
- [ ] ⚠️ **Pode não funcionar ainda** pois precisamos criar user no Auth

---

## ⚠️ **Problemas Conhecidos**

| Problema | Causa | Solução |
|----------|-------|---------|
| "Perfil não encontrado" ao logar | Trigger não criou perfil | Rodou MIGRATION_VENDEDOR_ADMIN.sql? |
| Não entra em AdminVendedor | cargo ≠ 'VENDEDOR' | Verifique RoleType em perfis_acesso |
| Proprietária não consegue logar | User Auth não foi criado | Próxima fase: auto-create via RPC |
| Erro RLS ao criar salão | Policy bloqueando | Verifique que vendedor_id está correto |

---

## 🚀 **Próxima Fase (Opcional)**

Para **criar usuário automaticamente** quando vendedor gera login:

1. Criar **Supabase Edge Function**
2. Chamar Admin API do Auth
3. Retornar user_id para armazenar em `logins_gerados.auth_user_id`
4. Enviar email automático com credenciais

(Posso ajudar se quiser implementar isso depois)

---

## 📞 **Dúvidas?**

Se algo não funcionar:

1. **Verifique o Console (F12)**
   - Erros de JavaScript aparecem aqui
   - Logs: `[AdminVendedor]`, `[App]`, `[Sidebar]`

2. **Verifique o SQL**
   - Vá em **Supabase** → **SQL Editor**
   - Execute: `SELECT * FROM perfis_acesso WHERE cargo = 'VENDEDOR';`
   - Deve mostrar seu vendedor

3. **Verifique as Policies**
   - Vá em **Authentication** → **Policies**
   - Veja se `logins_gerados` tem policy criada

4. **Verifique os Dados**
   - Tabela `saloes` tem sua colunas (`vendedor_id`, `deletado_em`)?
   - Tabela `logins_gerados` existe?

---

## ✨ **Resultado Final Esperado:**

```
┌─────────────────────────────────────────┐
│   PAINEL DE VENDEDOR                    │
├─────────────────────────────────────────┤
│ Email: vendedor@seusaloes.com           │
│ Cargo: Vendedor/Admin                   │
├───────────────────┬─────────────────────┤
│  Salões (2)       │ Proprietárias       │
├───────────────────┼─────────────────────┤
│ [+] Novo Salão    │ Escolha um salão:   │
│                   │                     │
│ Salão Teste       │ ┌─────────────────┐ │
│ ├─ Ativo         │ │ Salão Teste ▼   │ │
│ ├─ Criado em:... │ │ ├─ Nome: ...     │ │
│ └─ [🗑️ Delete]    │ │ ├─ Email: ...    │ │
│                   │ │ └─ [Gerar Login] │ │
│ Salão Maria       │ │                 │ │
│ ├─ Ativo         │ │ Logins criados: │ │
│ ├─ Criado em:... │ │ • maria@email   │ │
│ └─ [🗑️ Delete]    │ └─────────────────┘ │
└─────────────────────────────────────────┘
```

---

**✅ Parabéns! Seu sistema de Vendedor/Admin está pronto!** 🚀
