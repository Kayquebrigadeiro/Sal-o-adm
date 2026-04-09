# 🎯 Fluxo Completo: Criação de Salão com Username/Senha

## ✅ Alterações Implementadas

### 1. **Frontend (NovoSalao.jsx)**
- ✓ Adicionado `useEffect` para gerar credenciais automaticamente
- ✓ Função `gerarUsernameDoNome()` - converte nome em username válido
- ✓ Função `gerarSenhaAleatoria()` - gera senha segura com 12 caracteres
- ✓ Geração dispara quando carrega a etapa 5 ou quando muda o nome da proprietária
- ✓ Metadata agora inclui: `username`, `senha`, `vendedor_id`, `salao_id`, `cargo`
- ✓ Email único gerado com timestamp: `salao_{timestamp}@proprietaria.local`
- ✓ Etapa5Acesso exibe credenciais geradas de forma clara

### 2. **Backend (schema_saas_final_CORRIGIDO.sql)**
- ✓ Tabela `logins_gerados` com campos: `username`, `senha_temporaria`, `auth_user_id`, `vendedor_id`, `salao_id`
- ✓ Constraint `UNIQUE(salao_id, username)` - evita duplicatas
- ✓ Função `fn_gerar_username()` - remove acentos e caracteres especiais
- ✓ Função `fn_gerar_senha_aleatoria()` - 12 caracteres seguros
- ✓ Função `fn_registrar_login_gerado()` - trigger que popula `logins_gerados`
- ✓ Trigger `on_auth_user_created` - cria perfis_acesso e configurações
- ✓ Trigger `on_auth_user_login_registered` - registra login em logins_gerados

---

## 🔄 Fluxo Passo-a-Passo

### **Etapa 1-4: Dados, Profissionais, Serviços, Despesas**
- Usuário preenche informações básicas do salão
- Neste ponto, as credenciais ainda não existem

### **Etapa 5: Criar Acesso (AUTOMÁTICO)**
1. Ao entrar na etapa 5, `useEffect` detecta a proprietária
2. Gera automaticamente:
   - **Username**: `nome_proprietaria` → `nome_proprietaria` (limpo, sem acentos, max 20 chars)
   - **Senha**: 12 caracteres aleatórios com segurança (letras, números, símbolos)
3. Usuário pode editar se desejar
4. Credenciais aparecem em caixa visual para anotar

### **Ao Clicar "✓ Criar salão e acesso"**

#### Frontend (NovoSalao.jsx):
1. Cria **salão** na tabela `saloes`
2. Cria **configurações** padrão
3. Cria **profissionais** da equipe
4. Cria **procedimentos** selecionados
5. Cria **despesas** fixas
6. **Chama `supabase.auth.signUp()`** com:
   ```javascript
   {
     email: "salao_1712693400000@proprietaria.local",
     password: "GeX@9kP#2mL!",
     options: {
       data: {
         nome: "Ana Silva",
         salao_id: "uuid-do-salao",
         cargo: "PROPRIETARIO",
         username: "ana_silva",
         senha: "GeX@9kP#2mL!",
         vendedor_id: "uuid-do-vendedor"
       }
     }
   }
   ```

#### Backend (Supabase Triggers):

**Trigger 1: `on_auth_user_created` (handle_new_user_salao)**
- Detecta novo usuário em `auth.users`
- Lê `raw_user_meta_data` (username, cargo, salao_id, vendedor_id)
- Se cargo = PROPRIETARIO:
  - ✓ Cria registro em `perfis_acesso` (auth_user_id, salao_id, cargo)
  - ✓ Já foi criado salão pelo frontend, então só vincula

**Trigger 2: `on_auth_user_login_registered` (fn_registrar_login_gerado)**
- Detecta novo usuário em `auth.users`
- Se cargo = PROPRIETARIO + vendedor_id + salao_id válidos:
  - ✓ **Insere em `logins_gerados`:**
    ```sql
    {
      id: uuid,
      vendedor_id: uuid-do-vendedor,
      salao_id: uuid-do-salao,
      username: "ana_silva",
      senha_temporaria: "GeX@9kP#2mL!",
      auth_user_id: uuid-do-novo-user,
      gerado_em: now(),
      ativo: true
    }
    ```

---

## 🔐 Fluxo de Login da Proprietária

### **1ª Vez - Login com username e senha gerada:**
```
Tela de Login
├─ Email: ana_silva (username)
├─ Senha: GeX@9kP#2mL!
└─ Clica "Entrar"

Backend:
├─ Procura usuário com username "ana_silva" em logins_gerados
├─ Valida senha
├─ Retorna salao_id
└─ Usuário entra no Dashboard do salão
```

### **Como implementar Login com Username:**

Na página de Login (`Login.jsx`), adicione:

```javascript
// 1. Buscar o login gerado pelo username
const { data: loginData } = await supabase
  .from('logins_gerados')
  .select('auth_user_id, senha_temporaria, salao_id')
  .eq('username', username)
  .single();

if (!loginData) {
  throw new Error('Usuário não encontrado');
}

// 2. Autenticar com o email salvo em auth.users
const { data, error } = await supabase.auth.signInWithPassword({
  email: loginData.email_do_auth, // precisa buscar também
  password: password
});

// 3. Se autenticado, redirecionar para dashboard do salao_id
```

---

## 📊 Tabela: logins_gerados

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | PK |
| `vendedor_id` | UUID | FK → auth.users (vendedor que criou) |
| `salao_id` | UUID | FK → saloes (salão associado) |
| `username` | TEXT | Nome de usuário único por salão |
| `senha_temporaria` | TEXT | Senha inicial (hash no futuro) |
| `auth_user_id` | UUID | FK → auth.users (usuário criado) |
| `gerado_em` | TIMESTAMPTZ | Data de criação |
| `alterado_em` | TIMESTAMPTZ | Data de última alteração |
| `ativo` | BOOLEAN | Ativo/Inativo |

**Índices:**
- `idx_logins_vendedor` → buscar logins por vendedor
- `idx_logins_salao` → buscar logins por salão
- `idx_logins_username` → buscar login por username (para autenticação)

**Constraint:**
- `UNIQUE(salao_id, username)` → um username por salão

---

## 🚀 Próximas Etapas

### 1. **Executar SQL no Supabase**
```sql
-- Copie schema_saas_final_CORRIGIDO.sql
-- Cole no Supabase → SQL Editor
-- Execute tudo como um script único
```

### 2. **Testar Fluxo Frontend**
```bash
cd z:\trampo\Salao-secreto
npm install  # Se necessário
npm run dev  # Inicia dev server
```

1. Crie uma conta de VENDEDOR
2. Faça login
3. Vá para criar novo salão
4. Preencha todas as etapas
5. Na etapa 5, verifique se username/senha foram gerados
6. Clique "✓ Criar salão e acesso"
7. Verifique no Supabase:
   - Tabela `saloes` → novo salão criado
   - Tabela `perfis_acesso` → nova entrada com PROPRIETARIO
   - Tabela `logins_gerados` → credenciais registradas
   - Tabela `auth.users` → novo usuário criado

### 3. **Implementar Login com Username**
Criar página de Login que:
1. Aceita username ou email
2. Busca em `logins_gerados` pelo username
3. Obtém email do auth.users
4. Autentica com `signInWithPassword()`
5. Redireciona para Dashboard do salão

### 4. **Adicionar Recuperação de Senha**
- Permitir proprietária alterar senha
- Registrar mudança em `logins_gerados` (campo `alterado_em`)

### 5. **Dashboard de Vendedor**
Exibir tabela com:
- Salões criados
- Proprietárias (nome + username)
- Data de criação
- Status (ativo/inativo)
- Ação: Copiar credenciais, Redefinir senha

---

## 🐛 Possíveis Erros e Soluções

| Erro | Causa | Solução |
|------|-------|---------|
| `violates unique constraint` | Username duplicado | Adicionar sufixo aleatório |
| `auth_user_id is null` | Trigger não executou | Verificar logs do Supabase |
| `salao_id is null` | Frontend não passou no metadata | Verificar signUp options |
| Login não funciona | Email não é o mesmo | Precisamos buscar email em `auth.users` |

---

## ✅ Checklist Final

- [x] SQL corrigido com tabela `logins_gerados`
- [x] Frontend gera username/senha automaticamente
- [x] Metadata enviada corretamente no signUp
- [x] Trigger registra login em `logins_gerados`
- [ ] Testar fluxo completo no Supabase
- [ ] Implementar Login com username
- [ ] Adicionar dashboard de credenciais para vendedor
- [ ] Documentar no README.md

---

**Pronto para testar! 🎉**
