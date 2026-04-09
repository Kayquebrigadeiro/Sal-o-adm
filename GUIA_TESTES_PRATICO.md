# 🧪 GUIA PRÁTICO DE TESTES

## 1️⃣ Preparação no Supabase

### Executar SQL
```sql
-- 1. Abra Supabase Dashboard
-- 2. SQL Editor
-- 3. Cole TODO o arquivo: schema_saas_final_CORRIGIDO.sql
-- 4. Execute como um único script
-- 5. Aguarde execução completa (deve rodar em < 10 segundos)
```

### Validar Execução
```sql
-- Verificar se tabelas foram criadas
SELECT tablename FROM pg_tables WHERE schemaname = 'public' 
ORDER BY tablename;

-- Resultado esperado: saloes, profissionais, procedimentos, atendimentos, 
--                    homecare, procedimentos_paralelos, despesas, 
--                    gastos_pessoais, logins_gerados, perfis_acesso, configuracoes

-- Verificar função gerar_username
SELECT proname FROM pg_proc WHERE proname LIKE 'fn_gerar%';
-- Resultado: fn_gerar_username, fn_gerar_senha_aleatoria, fn_gerar_senha_aleatoria

-- Verificar triggers
SELECT trigger_name FROM information_schema.triggers 
WHERE trigger_schema = 'public' AND event_object_table = 'users';
-- Resultado: on_auth_user_created, on_auth_user_login_registered
```

---

## 2️⃣ Testar no Frontend

### Passo 1: Iniciar Dev Server
```bash
cd z:\trampo\Salao-secreto
npm run dev
# Acesse http://localhost:5173
```

### Passo 2: Criar Conta de Vendedor
```
1. Clique em "Registre-se" ou "Criar Conta"
2. Email: vendedor@teste.com
3. Senha: Teste@123456
4. Clique "Registrar"
5. Verifique email ou confirme na interface
```

### Passo 3: Login como Vendedor
```
1. Email: vendedor@teste.com
2. Senha: Teste@123456
3. Clique "Entrar"
4. Você deve ver dashboard de vendedor
```

### Passo 4: Criar Novo Salão
```
1. Clique "Novo Salão" ou botão similar
2. Etapa 1: Dados do Salão
   - Nome: "Studio Teste"
   - Telefone: "(11) 99999-9999"
   - Clique "Próximo"

3. Etapa 2: Profissionais
   - Nome: "Maria Silva"
   - Cargo: "Proprietária"
   - Clique "Próximo"

4. Etapa 3: Procedimentos
   - Selecione pelo menos um (ex: Corte, Coloração)
   - Clique "Próximo"

5. Etapa 4: Despesas
   - Deixe como está ou adicione alguma
   - Clique "Próximo"

6. Etapa 5: Criar Acesso (IMPORTANTE!)
   ✅ VERIFIQUE:
   - Nome da proprietária: "Maria Silva"
   - Username gerado: "maria_silva" (ou similar)
   - Senha gerada: algo como "X9kP#2mL@Q1w" (12 caracteres aleatório)
   
   📋 ANOTE ESSAS CREDENCIAIS!
   
   - Clique "✓ Criar salão e acesso"
   - Aguarde mensagem de sucesso
```

---

## 3️⃣ Validar Dados no Supabase

### Verificar Salão Criado
```sql
SELECT id, nome, vendedor_id, ativo, criado_em 
FROM saloes 
ORDER BY criado_em DESC 
LIMIT 1;

-- Esperado: 1 registro com nome "Studio Teste"
```

### Verificar Profissional Criado
```sql
SELECT id, salao_id, nome, cargo, criado_em 
FROM profissionais 
ORDER BY criado_em DESC 
LIMIT 1;

-- Esperado: 1 registro com nome "Maria Silva" e cargo "PROPRIETARIO"
```

### Verificar Usuário Auth Criado
```sql
SELECT id, email, created_at, raw_user_meta_data 
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 1;

-- Esperado: 
-- email: "salao_XXXXX@proprietaria.local"
-- raw_user_meta_data: {
--   "username": "maria_silva",
--   "senha": "X9kP#2mL@Q1w",
--   "salao_id": "uuid-...",
--   "vendedor_id": "uuid-...",
--   "cargo": "PROPRIETARIO"
-- }
```

### ⭐ VALIDAÇÃO CRÍTICA: Verificar logins_gerados
```sql
SELECT id, vendedor_id, salao_id, username, senha_temporaria, auth_user_id, gerado_em, ativo
FROM logins_gerados 
ORDER BY gerado_em DESC 
LIMIT 1;

-- ESPERADO:
-- ✅ username: "maria_silva"
-- ✅ senha_temporaria: "X9kP#2mL@Q1w" (a mesma que foi exibida)
-- ✅ auth_user_id: (NOT NULL - preenchido pelo trigger)
-- ✅ vendedor_id: (UUID do vendedor que criou)
-- ✅ salao_id: (UUID do salão criado)
-- ✅ ativo: true
-- ✅ gerado_em: NOW()
```

### Verificar Perfil de Acesso
```sql
SELECT auth_user_id, salao_id, cargo, criado_em 
FROM perfis_acesso 
ORDER BY criado_em DESC 
LIMIT 1;

-- Esperado: 1 registro com cargo "PROPRIETARIO"
```

### Verificar Configurações Padrão
```sql
SELECT salao_id, custo_fixo_por_atendimento, taxa_maquininha_pct
FROM configuracoes 
ORDER BY salao_id DESC 
LIMIT 1;

-- Esperado: 
-- custo_fixo_por_atendimento: 29.00
-- taxa_maquininha_pct: 5.00
```

---

## 4️⃣ Teste de Fluxo Completo (Checklist)

```
TESTE: Criar Salão com Username/Senha Automático
Status: 🔄 EM PROGRESSO

✅ Pré-requisitos
├─ Supabase SQL executado: [ ]
├─ Dev server rodando: [ ]
└─ Vendedor criado e logado: [ ]

✅ Frontend (Criação do Salão)
├─ Etapa 1 preenchida e "Próximo" funciona: [ ]
├─ Etapa 2 com proprietária criada: [ ]
├─ Etapa 3 com procedimentos selecionados: [ ]
├─ Etapa 4 (despesas): [ ]
└─ Etapa 5 carrega COM username/senha auto-gerados: [ ]

✅ Validação Visual
├─ Username exibido sem acentos (ex: "maria_silva"): [ ]
├─ Senha tem 12 caracteres: [ ]
├─ Senha tem mix de letras/números/símbolos: [ ]
├─ Caixa azul exibe as credenciais: [ ]
└─ Botão "✓ Criar salão e acesso" habilitado: [ ]

✅ Criação de Dados (Backend)
├─ Salão criado em DB: [ ]
├─ Profissional criado em DB: [ ]
├─ Procedimentos criados em DB: [ ]
├─ Despesas criadas em DB: [ ]
├─ Usuário criado em auth.users: [ ]
└─ Perfil de acesso criado: [ ]

✅ Tabela logins_gerados (CRÍTICO!)
├─ Linha inserida: [ ]
├─ vendedor_id preenchido: [ ]
├─ salao_id preenchido: [ ]
├─ username igual ao exibido: [ ]
├─ senha_temporaria igual à exibida: [ ]
├─ auth_user_id preenchido (NOT NULL): [ ]
└─ ativo = true: [ ]

✅ Erros/Warnings
├─ Sem erros no console do browser: [ ]
├─ Sem erros no log do Supabase: [ ]
└─ Mensagem de sucesso exibida: [ ]

RESULTADO FINAL: ✅ PASSOU OU ❌ FALHOU
```

---

## 5️⃣ Cenários de Teste Específicos

### Teste 1: Geração de Múltiplos Salões
```bash
# Repetir a criação de salão 3 vezes com diferentes proprietárias:

1º Salão:
- Proprietária: "Ana Silva"
- Username esperado: "ana_silva"

2º Salão:
- Proprietária: "José da Silva"
- Username esperado: "jose_da_silva" ou "jose_silva"

3º Salão:
- Proprietária: "Francesca d'Agosto"
- Username esperado: "francesca_daagosto" (sem acentos)

Validar em logins_gerados: 3 linhas, 3 usernames diferentes
```

### Teste 2: Edição Manual de Credenciais
```
1. Na Etapa 5, mude o username para "proprietaria_teste"
2. Mude a senha para "MinhaSenh@123"
3. Crie o salão
4. Valide em logins_gerados se os valores editados foram salvos
```

### Teste 3: Constraint UNIQUE(salao_id, username)
```sql
-- Tentar inserir username duplicado no mesmo salão deve dar erro:
INSERT INTO logins_gerados 
(vendedor_id, salao_id, username, senha_temporaria, ativo)
VALUES (
  'uuid-vendedor',
  'uuid-salao-criado-antes',
  'maria_silva',  -- DUPLICATE!
  'nova_senha',
  true
);

-- Esperado: ERROR: duplicate key value violates unique constraint
```

### Teste 4: RLS Policy (Vendedor só vê seus logins)
```sql
-- Como VENDEDOR 1, executar:
SELECT * FROM logins_gerados;
-- Esperado: Apenas seus logins

-- Como VENDEDOR 2, executar:
SELECT * FROM logins_gerados;
-- Esperado: Apenas seus logins (não vê os do Vendedor 1)

-- Como ADMIN/SUPERUSER, executar:
SET ROLE postgres;  -- Bypass RLS
SELECT * FROM logins_gerados;
-- Esperado: TODOS os logins
```

---

## 6️⃣ Debugging

### Se username/senha não aparecerem na Etapa 5:
```javascript
// Adicione no console browser:
localStorage.setItem('DEBUG', 'true');

// Em NovoSalao.jsx, após useEffect:
console.log('Profissionais:', profissionais);
console.log('Login data:', loginProprietaria);
console.log('Proprietária:', profissionais.find(p => p.cargo === 'PROPRIETARIO'));
```

### Se logins_gerados não for preenchido:
```sql
-- Verificar se trigger foi executado:
SELECT * FROM pg_stat_user_functions WHERE funcname = 'fn_registrar_login_gerado';

-- Verificar se há erros:
SELECT * FROM pg_proc WHERE proname = 'handle_new_user_salao';

-- Forçar re-execução do trigger:
DROP TRIGGER on_auth_user_login_registered ON auth.users;
CREATE TRIGGER on_auth_user_login_registered
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION fn_registrar_login_gerado();
```

### Se auth.signUp falhar:
```javascript
// Check:
1. Email é único?
2. Senha tem pelo menos 6 caracteres?
3. Supabase Auth está habilitado?
4. RLS policies permitem insert em perfis_acesso?
```

---

## 7️⃣ Performance & Otimizações

### Índices Criados:
```sql
-- Confirmar que foram criados:
SELECT indexname FROM pg_indexes 
WHERE tablename = 'logins_gerados';

-- Esperado:
-- idx_logins_vendedor
-- idx_logins_salao
-- idx_logins_username
-- logins_gerados_pkey
```

### Query Performance:
```sql
-- Buscar login por username (DEVE ser rápido - < 1ms):
EXPLAIN ANALYZE 
SELECT * FROM logins_gerados 
WHERE username = 'maria_silva';

-- Buscar logins por vendedor (DEVE ser rápido):
EXPLAIN ANALYZE 
SELECT * FROM logins_gerados 
WHERE vendedor_id = 'uuid-vendedor';
```

---

## ✅ Tudo Passou? Próximos Passos!

1. **Implementar Login com Username:**
   - Criar página de login que aceita username
   - Buscar em logins_gerados
   - Autenticar com email + senha

2. **Dashboard de Vendedor:**
   - Listar salões criados
   - Exibir credenciais geradas
   - Copiar para clipboard
   - Redefinir senha

3. **Segurança:**
   - Hash de senhas
   - Auditoria de acessos
   - Expiração de senhas temporárias

---

**Boa sorte com os testes! 🚀**
