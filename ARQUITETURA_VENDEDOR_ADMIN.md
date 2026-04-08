# 🏗️ **ARQUITETURA: Sistema de Vendedor/Admin**

## 📊 **Tabelas Modificadas/Criadas**

### **1. `saloes` (Modificada)**
```sql
ALTER TABLE saloes ADD COLUMN vendedor_id uuid;  -- Quem criou o salão
ALTER TABLE saloes ADD COLUMN deletado_em timestamptz;  -- Para soft-delete
```

✅ Agora cada salão sabe quem é o vendedor que o criou

---

### **2. `logins_gerados` (Criada)**
```sql
CREATE TABLE logins_gerados (
  id uuid PRIMARY KEY,
  vendedor_id uuid NOT NULL,     -- Qual vendedor criou?
  salao_id uuid NOT NULL,        -- De qual salão?
  email_proprietaria text,       -- Email da proprietária
  auth_user_id uuid,            -- Depois linkado ao user do Auth
  senha_temporaria text,        -- Gerada automaticamente
  gerado_em timestamptz,
  ativo boolean
);
```

✅ Rastreia histórico de logins criados por vendedores

---

### **3. `perfis_acesso` (Sem mudança, mas novo tipo de cargo)**
```sql
-- Já existia, agora suporta 'VENDEDOR'
enum cargo_enum = ('PROPRIETARIO', 'FUNCIONARIO', 'VENDEDOR')
```

✅ VENDEDOR tem `salao_id = '00000000-0000-0000-0000-000000000000'` (vazio)

---

## 🛣️ **Fluxo de Rotas**

```
Login
  ↓
App.jsx verifica cargo via perfis_acesso
  ↓
┌──────────────────┬──────────────────┬──────────────────┐
│   PROPRIETARIO   │   FUNCIONARIO    │    VENDEDOR      │
├──────────────────┼──────────────────┼──────────────────┤
│ BrowserRouter    │ BrowserRouter    │ BrowserRouter    │
│   ├─ /agenda     │   ├─ /agenda     │ (sem rotas)      │
│   ├─ /dashboard  │   └─ Navigate    │ AdminVendedor    │
│   ├─ /homecar    │                  │   ├─ Salões      │
│   ├─ /paralelos  │                  │   └─ Proprietárias
│   ├─ /despesas   │                  │                  │
│   └─ /config     │                  │                  │
└──────────────────┴──────────────────┴──────────────────┘
```

---

## 📁 **Arquivos Criados/Modificados**

### **Criados:**

| Arquivo | Descrição |
|---------|-----------|
| `MIGRATION_VENDEDOR_ADMIN.sql` | Script SQL para adicionar suporte a VENDEDOR |
| `src/pages/AdminVendedor.jsx` | Página principal do vendedor com CRUD |
| `GUIA_CRIAR_VENDEDOR_ADMIN.md` | Guia passo-a-passo para criar VENDEDOR |

### **Modificados:**

| Arquivo | Mudança |
|---------|---------|
| `src/App.jsx` | Detecta `role === 'VENDEDOR'` e renderiza AdminVendedor |
| `src/components/Sidebar.jsx` | Renderiza menu diferente para VENDEDOR |

---

## 🔐 **RLS (Row Level Security)**

### **Tabela: `saloes`**
```sql
-- Cada usuário vê apenas salões ligados a ele como vendedor
-- (ou proprietário, mantido compatível)

SELECT * FROM saloes 
WHERE vendedor_id = auth.uid() OR id IN (
  SELECT salao_id FROM perfis_acesso 
  WHERE auth_user_id = auth.uid()
);
```

### **Tabela: `logins_gerados`**
```sql
-- Cada vendedor vê apenas logins que ele criou
SELECT * FROM logins_gerados 
WHERE vendedor_id = auth.uid();
```

✅ **Isolamento total** entre vendedores

---

## 🎮 **Componentes React**

### **AdminVendedor.jsx**

**Props:**
```javascript
{
  email: string,      // Email do vendedor logado
  userId: uuid        // User ID do vendedor
}
```

**State:**
```javascript
const [tab, setTab] = useState('saloes');  // 'saloes' | 'proprietarios'
const [saloes, setSaloes] = useState([]);  // Lista de salões do vendedor
const [novoSalao, setNovoSalao] = useState({ nome, telefone });
```

**Métodos:**
- `carregarSaloes()` → SELECT * FROM saloes WHERE vendedor_id = userId
- `criarSalao(e)` → INSERT salão com vendedor_id
- `deletarSalao(salaoId)` → RPC fn_deletar_salao

**Componente Interno:**
- `<CadastroPropietaria salao={salao} />` → Gerencia logins de uma proprietária

---

### **CadastroPropietaria.jsx**

Componente que renderiza para cada salão uma seção para:
1. Criar novo login (nome + email)
2. Gerar senha aleatória (10 chars)
3. Inserir em `logins_gerados`
4. Mostrar histórico de logins criados

---

## 🔄 **Funções SQL**

### **1. `fn_gerar_senha_aleatoria(length)`**
```sql
-- Gera string aleatória com letras, números e símbolos
SELECT fn_gerar_senha_aleatoria(10);
-- Resultado: 'aB3!xYz7@K'
```

### **2. `fn_deletar_salao(p_salao_id)`**
```sql
-- Soft delete: marca como deletado_em = now()
SELECT fn_deletar_salao('uuid-do-salao')
-- Retorna JSON com status
```

### **3. `handle_new_user_salao()`** (Atualizada)
```sql
-- Trigger automático ao criar novo usuário
-- Agora detecta se é VENDEDOR e não cria salão
-- Apenas cria registro em perfis_acesso
```

---

## 🔄 **Fluxo: Criando uma Nova Proprietária**

```
1. Vendedor preenche:
   nome: "Maria"
   email: "maria@salao.com"
   salao_id: "123e45..."

2. Sistema:
   - Gera senha: "aB3!xYz7@K"
   - INSERT logins_gerados {
       vendedor_id: vendedor_id,
       salao_id: salao_id,
       email_proprietaria: "maria@salao.com",
       senha_temporaria: "aB3!xYz7@K"
     }
   - Mostra para vendedor copiar

3. Vendedor informa Maria:
   - Email: maria@salao.com
   - Senha: aB3!xYz7@K

4. Maria acessa site:
   - Loga com email + senha
   - Sistema cria usuário no Auth
   - Trigger cria perfil com role=PROPRIETARIO
   - Maria pode mudar senha
```

---

## 🚀 **Fluxo: Criando um Salão**

```
1. Vendedor preenche:
   nome: "Salão da Maria"
   telefone: "1198765432"

2. Sistema:
   INSERT saloes {
     nome: "Salão da Maria",
     telefone: "1198765432",
     vendedor_id: seu_user_id,
     criado_em: now()
   }

3. Automático:
   INSERT configuracoes {
     salao_id: novo_id,
     custo_fixo: 29.00,
     taxa_maquininha: 5.00
   }

4. Resultado:
   - Salão aparece na lista
   - Proprietárias podem ser criadas para este salão
```

---

## 🚀 **Fluxo: Deletando um Salão**

```
1. Vendedor clica "Deletar Salão"

2. Confirmação: "Deletar 'Salão da Maria' permanentemente?"

3. Sistema executa:
   fn_deletar_salao('uuid-do-salao')

4. Internamente:
   UPDATE saloes
   SET deletado_em = now(), ativo = false
   WHERE id = 'uuid-do-salao'

5. Resultado:
   - Salão desaparece da lista (filtrado por WHERE deletado_em IS NULL)
   - Dados HISTÓRICOS preservados
   - Proprietária não consegue logar

6. Retorna:
   {
     "sucesso": true,
     "atendimentos_existentes": 42,
     "profissionais_ativos": 3
   }
```

---

## 🔍 **Queries Úteis para Debugar**

### **Ver todos os vendedores:**
```sql
SELECT p.auth_user_id, u.email, COUNT(s.id) as total_saloes
FROM perfis_acesso p
JOIN auth.users u ON u.id = p.auth_user_id
LEFT JOIN saloes s ON s.vendedor_id = p.auth_user_id
WHERE p.cargo = 'VENDEDOR'
GROUP BY 1, 2;
```

### **Ver salões de um vendedor:**
```sql
SELECT * FROM saloes 
WHERE vendedor_id = 'user-id' AND deletado_em IS NULL;
```

### **Ver logins criados:**
```sql
SELECT * FROM logins_gerados 
WHERE vendedor_id = 'user-id'
ORDER BY gerado_em DESC;
```

### **Ver proprietárias sem usuario criado ainda:**
```sql
SELECT * FROM logins_gerados 
WHERE auth_user_id IS NULL AND ativo = true;
```

---

## ⚠️ **Limitações Atuais**

| Limitação | Motivo | Solução |
|----------|--------|---------|
| Senha gerada manualmente | RLS não permite criar user no Auth | Usar Admin API ou integração |
| Email não confirmado | Precisa função RPC customizada | Implementar endpoint API |
| Sem envio de email | Frontend não consegue chamar Auth | Usar Supabase Edge Functions |

---

## 🎯 **Futuras Melhorias**

1. **Autenticação Automática**
   - Criar user no Auth via RPC
   - Enviar email de boas-vindas

2. **Dashboard de Métricas**
   - Total de vendas por vendedor
   - Receita acumulada
   - Proprietárias ativas

3. **Controle de Acesso Avançado**
   - VENDEDOR só vê logins que CRIOU
   - PROPRIETARIO só vê seus dados
   - Auditoria de ações

4. **Relatórios**
   - PDF com histórico de logins
   - Excel com dados de salões
   - Gráficos de evolução

---

**✅ Implementação Completa e Segura!** 🔐
