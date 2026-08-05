# 📝 Exemplo Detalhado: Antes vs Depois

## Função: `criarProprietaria()` em `salao.controller.js`

### ❌ ANTES (Errado - causava bug de FK)

```javascript
const pool = require('../config/db');
const bcrypt = require('bcrypt');
const { randomUUID } = require('crypto');

async function criarProprietaria(req, res) {
  const { email, senha, nome, nome_salao, telefone, vendedor_id } = req.body;
  if (!email || !senha || !nome || !nome_salao) 
    return res.status(400).json({ error: 'Missing fields' });

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // ❌ PROBLEMA 1: Não passando coluna 'id' - deixa o banco gerar
    const [salaoResult] = await connection.query(
      'INSERT INTO saloes (nome, nome_proprietaria, telefone, vendedor_id) VALUES (?, ?, ?, ?)',
      [nome_salao, nome, telefone || null, vendedor_id || null]
    );
    
    // ❌ PROBLEMA 2: Usar insertId para UUID -> RETORNA 0!
    const salao_id = salaoResult.insertId; // salao_id = 0 ❌
    
    // ❌ PROBLEMA 3: Usar salao_id=0 em FK -> Viola integridade referencial!
    await connection.query(
      'INSERT INTO configuracoes (salao_id, taxa_maquininha_pct, custo_fixo_por_atendimento) VALUES (?, ?, ?)',
      [salao_id, 5.0, 10.65]  // ❌ Insere com salao_id=0
    );

    const auth_user_id = randomUUID(); // ✓ Já faz certo aqui
    const senha_hash = await bcrypt.hash(senha, 10);
    await connection.query(
      'INSERT INTO usuarios_auth (id, email, senha_hash) VALUES (?, ?, ?)',
      [auth_user_id, email, senha_hash]
    );

    await connection.query(
      'INSERT INTO perfis_acesso (auth_user_id, salao_id, cargo, username) VALUES (?, ?, ?, ?)',
      [auth_user_id, salao_id, 'PROPRIETARIO', email]  // ❌ salao_id=0 aqui também
    );

    await connection.query(
      'INSERT INTO logins_gerados (vendedor_id, salao_id, username, senha_temporaria, auth_user_id) VALUES (?, ?, ?, ?, ?)',
      [vendedor_id || null, salao_id, email, senha, auth_user_id]  // ❌ salao_id=0
    );

    await connection.commit();
    return res.json({ sucesso: true, salao_id, auth_user_id });
    // ❌ Response: { sucesso: true, salao_id: 0, ... } - salao_id é 0!
  } catch (err) {
    console.error(err);
    await connection.rollback();
    return res.status(500).json({ error: 'Transaction failed' });
  } finally {
    connection.release();
  }
}
```

**Resultado do INSERT na tabela `saloes`**:
```sql
INSERT INTO saloes (nome, nome_proprietaria, telefone, vendedor_id) 
VALUES ('Salão Beleza', 'Maria Silva', '11999999999', NULL);
-- Banco gera UUID automaticamente: id = '550e8400-e29b-41d4-a716-446655440000'
-- Mas código JavaScript pega insertId = 0 ❌
```

**Erro ao inserir em `configuracoes`**:
```sql
INSERT INTO configuracoes (salao_id, taxa_maquininha_pct, custo_fixo_por_atendimento) 
VALUES (0, 5.0, 10.65);
-- ❌ Erro de Foreign Key: salao_id=0 não existe em saloes!
```

---

### ✅ DEPOIS (Correto - gera UUID antes)

```javascript
const pool = require('../config/db');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');  // ✅ Usar uuid library

async function criarProprietaria(req, res) {
  const { email, senha, nome, nome_salao, telefone, vendedor_id } = req.body;
  if (!email || !senha || !nome || !nome_salao) 
    return res.status(400).json({ error: 'Missing fields' });

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // ✅ SOLUÇÃO 1: Gerar UUIDs em JavaScript ANTES do insert
    const salao_id = uuidv4();           // Gera UUID: '550e8400-e29b-41d4-a716-446655440000'
    const auth_user_id = uuidv4();       // Gera UUID: '660f8400-e29b-41d4-a716-446655440001'
    
    // ✅ SOLUÇÃO 2: Passar coluna 'id' explicitamente no INSERT
    const [salaoResult] = await connection.query(
      'INSERT INTO saloes (id, nome, nome_proprietaria, telefone, vendedor_id) VALUES (?, ?, ?, ?, ?)',
      [salao_id, nome_salao, nome, telefone || null, vendedor_id || null]  // ✅ Passa UUID
    );
    
    // ✅ SOLUÇÃO 3: Usar a variável salao_id que já foi gerada (não insertId)
    
    // ✅ Agora salao_id é um UUID válido!
    await connection.query(
      'INSERT INTO configuracoes (salao_id, taxa_maquininha_pct, custo_fixo_por_atendimento) VALUES (?, ?, ?)',
      [salao_id, 5.0, 10.65]  // ✅ Insere com salao_id válido
    );

    const senha_hash = await bcrypt.hash(senha, 10);
    await connection.query(
      'INSERT INTO usuarios_auth (id, email, senha_hash) VALUES (?, ?, ?)',
      [auth_user_id, email, senha_hash]  // ✅ auth_user_id é UUID válido
    );

    await connection.query(
      'INSERT INTO perfis_acesso (auth_user_id, salao_id, cargo, username) VALUES (?, ?, ?, ?)',
      [auth_user_id, salao_id, 'PROPRIETARIO', email]  // ✅ IDs válidos
    );

    await connection.query(
      'INSERT INTO logins_gerados (vendedor_id, salao_id, username, senha_temporaria, auth_user_id) VALUES (?, ?, ?, ?, ?)',
      [vendedor_id || null, salao_id, email, senha, auth_user_id]  // ✅ IDs válidos
    );

    await connection.commit();
    return res.json({ sucesso: true, salao_id, auth_user_id });
    // ✅ Response: { sucesso: true, salao_id: '550e8400-e29b-41d4-a716-446655440000', ... }
  } catch (err) {
    console.error(err);
    await connection.rollback();
    return res.status(500).json({ error: 'Transaction failed' });
  } finally {
    connection.release();
  }
}
```

**Resultado do INSERT na tabela `saloes`**:
```sql
INSERT INTO saloes (id, nome, nome_proprietaria, telefone, vendedor_id) 
VALUES ('550e8400-e29b-41d4-a716-446655440000', 'Salão Beleza', 'Maria Silva', '11999999999', NULL);
-- ✅ Passa UUID válido explicitamente
```

**Insere em `configuracoes` com sucesso**:
```sql
INSERT INTO configuracoes (salao_id, taxa_maquininha_pct, custo_fixo_por_atendimento) 
VALUES ('550e8400-e29b-41d4-a716-446655440000', 5.0, 10.65);
-- ✅ salao_id é um UUID válido, FK constraint satisfeito!
```

---

## Comparação Lado a Lado

| Aspecto | ❌ Antes | ✅ Depois |
|---------|---------|---------|
| Gera UUID | `randomUUID()` | `uuidv4()` (biblioteca uuid) |
| Quando gera | Depois do INSERT | ANTES do INSERT |
| Como obtém o ID | `resultAtendimento.insertId` | Variável `salao_id` já gerada |
| Coluna 'id' no INSERT | NÃO (deixa banco gerar) | SIM (passa explicitamente) |
| Valor de salao_id | `0` (insertId) ❌ | UUID válido ✅ |
| Foreign Key | Viola integridade | Satisfeito ✅ |
| Erro esperado | FK constraint failed | Sucesso ✅ |

---

## Mudanças no Banco de Dados

Nenhuma mudança necessária no banco! O `DEFAULT (UUID())` continua existindo:

```sql
CREATE TABLE saloes (
  id CHAR(36) DEFAULT (UUID()) PRIMARY KEY,  -- ✅ Continua igual
  nome VARCHAR(255) NOT NULL,
  nome_proprietaria VARCHAR(255),
  telefone VARCHAR(20),
  vendedor_id CHAR(36),
  ...
);
```

**Por quê**: É uma camada extra de segurança. Se algum INSERT futuro esquecer de passar o `id`, o banco gera um UUID. Mas o código Node.js **nunca mais** confia nisso.

---

## Comparação de Imports

### ❌ Antes
```javascript
const { randomUUID } = require('crypto');
// Usa randomUUID()
```

### ✅ Depois
```javascript
const { v4: uuidv4 } = require('uuid');  // NPM library
// Usa uuidv4()
```

**Por quê trocar?**
- `crypto.randomUUID()` é nativo (OK)
- `uuid.v4()` é mais estável e amplamente usado
- Ambas geram UUID v4 válidos
- Escolha: Para padronizar o projeto, usa `uuid` library em todos os places

---

## Resumo de Alterações

```diff
- const { randomUUID } = require('crypto');
+ const { v4: uuidv4 } = require('uuid');

- const [salaoResult] = await connection.query(
-   'INSERT INTO saloes (nome, nome_proprietaria, telefone, vendedor_id) VALUES (?, ?, ?, ?)',
-   [nome_salao, nome, telefone || null, vendedor_id || null]
- );
- const salao_id = salaoResult.insertId;

+ const salao_id = uuidv4();
+ const auth_user_id = uuidv4();
+
+ const [salaoResult] = await connection.query(
+   'INSERT INTO saloes (id, nome, nome_proprietaria, telefone, vendedor_id) VALUES (?, ?, ?, ?, ?)',
+   [salao_id, nome_salao, nome, telefone || null, vendedor_id || null]
+ );

- const auth_user_id = randomUUID();
```

Simples e elegante! ✅
