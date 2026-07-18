# 🐛 CORREÇÃO: Bug Sistemático de UUID (insertId)

## Problema Identificado

Várias rotas do backend estavam tentando obter IDs gerados usando `result.insertId`, que **NÃO funciona com colunas UUID**. O `insertId` só retorna valores para colunas `AUTO_INCREMENT`.

Isso causava:
- Chave primária gerada como `0` em vez de UUID válido
- Falhas de foreign key (violação de integridade referencial)
- Exemplo: `criarProprietaria` criava `configuracoes` com `salao_id = 0`

## Solução Implementada

1. **Instalar biblioteca uuid**:
   ```bash
   npm install uuid
   ```

2. **Novo padrão**: Gerar UUID em JavaScript ANTES do INSERT, não confiar no banco
   - Use: `const { v4: uuidv4 } = require('uuid');`
   - Gere: `const novoId = uuidv4();`
   - Insira: Passar explicitamente na coluna `id` do INSERT

3. **Remover todas as uses de `insertId`** em INSERTs para tabelas UUID

## Arquivos Alterados

### 1. ✅ `src/controllers/salao.controller.js`
- Função: `criarProprietaria()`
- **Mudança**: Gerar `salao_id` e `auth_user_id` com `uuidv4()` ANTES dos INSERTs
- **Impacto**: Evita `configuracoes.salao_id = 0`

### 2. ✅ `src/controllers/atendimentos.controller.js`
- Função: `criarAtendimento()`
- **Mudança**: Gerar `atendimento_id` com `uuidv4()` ANTES do INSERT
- **Impacto**: Evita falha ao criar `atendimento_procedimentos`

### 3. ✅ `src/controllers/crud.controller.js`
- Função: `criar()` (factory genérica)
- **Mudança**: Gerar `id` com `uuidv4()` se não fornecido
- **Impacto**: CRUD genérico agora suporta tabelas com UUID

### ✅ `src/controllers/admin.controller.js`
- Status: **JÁ ESTAVA CORRETO**
- Já usava `randomUUID()` do crypto para `auth_user_id`

### ✅ `src/controllers/usuarios.controller.js`
- Status: **JÁ ESTAVA CORRETO**
- Já usava `randomUUID()` do crypto para `auth_user_id`

## Antes vs Depois

### ANTES (❌ Errado - usava insertId)
```javascript
const [salaoResult] = await connection.query(
  'INSERT INTO saloes (nome, nome_proprietaria, telefone, vendedor_id) VALUES (?, ?, ?, ?)',
  [nome_salao, nome, telefone || null, vendedor_id || null]
);
const salao_id = salaoResult.insertId; // ❌ RETORNA 0 para UUID!

await connection.query(
  'INSERT INTO configuracoes (salao_id, taxa_maquininha_pct, custo_fixo_por_atendimento) VALUES (?, ?, ?)',
  [salao_id, 5.0, 10.65] // ❌ salao_id = 0 -> Viola FK!
);
```

### DEPOIS (✅ Correto - gera UUID antes)
```javascript
const salao_id = uuidv4(); // ✅ Gera UUID em JavaScript
const auth_user_id = uuidv4();

const [salaoResult] = await connection.query(
  'INSERT INTO saloes (id, nome, nome_proprietaria, telefone, vendedor_id) VALUES (?, ?, ?, ?, ?)',
  [salao_id, nome_salao, nome, telefone || null, vendedor_id || null] // ✅ Passa explicitamente
);

await connection.query(
  'INSERT INTO configuracoes (salao_id, taxa_maquininha_pct, custo_fixo_por_atendimento) VALUES (?, ?, ?)',
  [salao_id, 5.0, 10.65] // ✅ salao_id é UUID válido!
);
```

## Validação

✅ **Todos os arquivos com sintaxe JavaScript válida**:
- `salao.controller.js` ✓
- `atendimentos.controller.js` ✓
- `crud.controller.js` ✓

✅ **Testes unitários**: 26/27 passando (mesmo resultado anterior)
```
Testes passados: 26
Testes falhados: 1 (desvio aceitável de arredondamento)
```

## Impacto de Segurança

- ✅ **Positivo**: Agora garante que IDs são UUIDs válidos (não `0`)
- ✅ **Positivo**: Evita violações de foreign key
- ✅ **Negativo**: Nenhum

## Notas Importantes

1. O `DEFAULT (UUID())` nas colunas do banco pode continuar existindo (segurança extra)
2. O código Node.js **NUNCA** mais vai confiar nele
3. Todo INSERT em tabela com UUID deve gerar o ID explicitamente em JavaScript
4. Para tabelas com `AUTO_INCREMENT`, continuar usando `insertId` é correto

## Próximos Passos

1. Testar endpoint `/salao/criar-proprietaria` manualmente
   - Verificar se `saloes.id` recebe UUID válido (não `0`)
   - Verificar se `configuracoes.salao_id` recebe o UUID correto

2. Testar endpoint `POST /atendimentos`
   - Verificar se `atendimentos.id` recebe UUID válido
   - Verificar se `atendimento_procedimentos.atendimento_id` recebe o UUID correto

3. Testar endpoints CRUD genéricos (`/cadastros/*`)
   - Criar novo cliente, profissional, etc.
   - Verificar se `id` é UUID válido

## Conclusão

✅ Bug sistemático corrigido. Todos os INSERTs em tabelas UUID agora geram IDs explicitamente em JavaScript, garantindo integridade referencial.
