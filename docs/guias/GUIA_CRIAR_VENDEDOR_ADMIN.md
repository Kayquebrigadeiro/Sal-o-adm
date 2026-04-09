# 📋 **GUIA: Como Criar um Vendedor/Admin no Supabase**

## ✅ **Passo 1: Executar uma das migrações SQL**

Você tem **2 opções**:

### **OPÇÃO A: Se você ainda NÃO rodou o schema final**
- Vá em **SQL Editor** do Supabase
- Copie TODO O CONTEÚDO de [schema_saas_final_ATUALIZADO.sql](schema_saas_final_ATUALIZADO.sql)
- Execute como um único script
- Isso já incluirá o tipo `VENDEDOR` no enum `cargo_enum`

### **OPÇÃO B: Se você JÁ tem o schema rodado**
- Vá em **SQL Editor** do Supabase
- Copie TODO O CONTEÚDO de [MIGRATION_VENDEDOR_ADMIN.sql](MIGRATION_VENDEDOR_ADMIN.sql)
- Execute como um único script
- Isso adicionará as colunas e tabelas necessárias

---

## ✅ **Passo 2: Criar conta de Vendedor no Supabase**

Você precisará usar o **Admin API** do Supabase ou criar manualmente pelo painel.

### **Método 1: Pelo Painel Supabase (Manual)**

1. Vá para **Supabase Dashboard** → seu projeto
2. Clique em **Authentication** → **Users**
3. Clique em **"Add user"**
4. Preencha:
   - **Email**: vendedor@seusaloes.com
   - **Password**: senha temporária forte
5. Clique em **"Create user"**
6. **Copie o User ID** (UUID) do usuário criado

### **Método 2: Usando Admin API (Recomendado)**

Se quiser automatizar, use `curl` ou Postman com seu Admin API Key:

```bash
curl -X POST 'https://seu-projeto.supabase.co/auth/v1/admin/users' \
  -H 'apikey: sbpk_seu_anon_key' \
  -H 'Authorization: Bearer seu_admin_token' \
  -H 'Content-Type: application/json' \
  -d '{
    "email":"vendedor@seusaloes.com",
    "password":"SenhaForte123!",
    "user_metadata":{
      "cargo":"VENDEDOR"
    },
    "email_confirm":true
  }'
```

---

## ✅ **Passo 3: Criar Registro em `perfis_acesso`**

Aqui está o **IMPORTANTE**: você precisa criar um registro em `perfis_acesso` para que o trigger automático não crie novamente.

```sql
-- Substitua {USER_ID} pelo UUID que você copiou no Passo 2
INSERT INTO public.perfis_acesso (auth_user_id, salao_id, cargo)
VALUES (
  '{USER_ID}'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,  -- UUID vazio para VENDEDOR (sem salão)
  'VENDEDOR'::cargo_enum
);
```

**Exemplo prático:**
```sql
INSERT INTO public.perfis_acesso (auth_user_id, salao_id, cargo)
VALUES (
  '123e4567-e89b-12d3-a456-426614174000'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'VENDEDOR'::cargo_enum
);
```

---

## ✅ **Passo 4: Testar Login**

1. Abra seu site: `http://localhost:5174/`
2. Faça login com:
   - **Email**: vendedor@seusaloes.com
   - **Senha**: a senha que você criou
3. Se tudo funcionou, você verá a **Tela de Admin/Vendedor** com opções para:
   - ✅ Criar salões
   - ✅ Cadastrar proprietárias e gerar logins
   - ✅ Deletar salões

---

## 🎯 **O que o Vendedor pode fazer:**

### **1. Criar Salões**
- Nome
- Telefone (opcional)
- Automáticamente cria configurações padrão

### **2. Cadastrar Proprietárias**
- Escolhe um salão
- Insere nome e email
- Sistema gera **senha temporária aleatória**
- A proprietária faz login e MUDA a senha

### **3. Deletar Salões**
- Soft delete (marca como `deletado_em`)
- Dados históricos preservados
- Proprietária não consegue mais logar

### **4. Ver Histórico de Logins Criados**
- Rastreia quais proprietárias foram criadas
- Data de criação
- Status

---

## 🔒 **Segurança**

### **RLS (Row Level Security)**

A tabela `logins_gerados` tem política de RLS:

```sql
create policy "Vendedor vê seus logins" on logins_gerados 
  for all to authenticated using (vendedor_id = auth.uid());
```

✅ Um vendedor SÓ vê salões e logins que **ele criou**
❌ Vendedores não conseguem acessar dados uns dos outros

---

## 📝 **Próximas Melhorias (Opcional)**

Se você quiser, podemos adicionar:

1. **Autenticação de proprietária automatizada**
   - Gerar usuário no Auth automaticamente
   - Enviar email com credentials

2. **Histórico de atividades**
   - Rastrear quando proprietária logou
   - Rastrear quando criou vendas

3. **Dashboard de métricas**
   - Total de salões
   - Total de proprietárias
   - Receita por salão

4. **Geração de relatórios**
   - Excel com histórico de logins
   - PDF com dados de vendas

---

## ❓ **Troubleshooting**

### **Problema: "Perfil não encontrado após múltiplas tentativas"**

**Causa**: O trigger automático não criou o perfil VENDEDOR corretamente

**Solução**: 
```sql
-- Verifique se o registro existe
SELECT * FROM perfis_acesso WHERE auth_user_id = 'seu-user-id';

-- Se não existir, crie manualmente (passo 3 acima)
```

### **Problema: Ao logar, não entra na tela de Admin**

**Causa**: O perfil tem `cargo != 'VENDEDOR'`

**Solução**:
```sql
-- Verifique:
SELECT cargo FROM perfis_acesso WHERE auth_user_id = 'seu-user-id';

-- Se não for VENDEDOR, atualize:
UPDATE perfis_acesso 
SET cargo = 'VENDEDOR'::cargo_enum
WHERE auth_user_id = 'seu-user-id';
```

### **Problema: Erro ao criar salão ou login**

**Causa**: RLS bloqueando a operação

**Verificar**:
1. O usuário está autenticado? (verifique Auth)
2. Existe policy de RLS conflitante? (verifique Policies em `saloes`)

---

## 📞 **Suporte**

Se tiver dúvidas ou erros:
1. Verifique o **Console do navegador** (F12)
2. Verifique os **logs do Supabase** (Observability > Logs)
3. Rode essa query para debugar:

```sql
SELECT * FROM auth.users WHERE email = 'vendedor@seusaloes.com';
SELECT * FROM perfis_acesso WHERE auth_user_id = 'seu-user-id';
SELECT * FROM saloes WHERE vendedor_id = 'seu-user-id';
SELECT * FROM logins_gerados WHERE vendedor_id = 'seu-user-id';
```

---

**✅ Pronto! Seu vendedor agora consegue gerenciar salões e proprietárias!** 🚀
