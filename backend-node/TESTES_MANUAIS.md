# TESTES MANUAIS - Backend Node.js (Financial Engine)

Este arquivo contém exemplos de `curl` para testar todas as rotas implementadas. Execute em ordem, pois algumas dependem de IDs gerados pelas anteriores.

## 1. AUTENTICAÇÃO

### Login
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@salao.com",
    "senha": "senha123"
  }'
```

**Resposta esperada:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "usuario": {
    "id": 1,
    "salao_id": 1,
    "email": "admin@salao.com",
    "role": "admin"
  }
}
```

Guarde o `token` para usar nos próximos testes. Vamos chamar de `$TOKEN`.

## 2. CADASTROS BÁSICOS (CRUD Genérico)

### 2.1 Criar um Cliente
```bash
curl -X POST http://localhost:3000/cadastros/clientes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "nome": "João Silva",
    "email": "joao@email.com",
    "telefone": "11999999999",
    "cpf": "12345678901"
  }'
```

**Resposta esperada:** `{ "id": 1, "salao_id": 1, "nome": "João Silva", ... }`

Guarde o `id` como `$CLIENTE_ID`.

### 2.2 Listar Clientes
```bash
curl -X GET http://localhost:3000/cadastros/clientes \
  -H "Authorization: Bearer $TOKEN"
```

### 2.3 Obter Cliente por ID
```bash
curl -X GET http://localhost:3000/cadastros/clientes/1 \
  -H "Authorization: Bearer $TOKEN"
```

### 2.4 Atualizar Cliente
```bash
curl -X PUT http://localhost:3000/cadastros/clientes/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "telefone": "11988888888"
  }'
```

### 2.5 Deletar Cliente
```bash
curl -X DELETE http://localhost:3000/cadastros/clientes/1 \
  -H "Authorization: Bearer $TOKEN"
```

---

### 2.6 Criar um Profissional
```bash
curl -X POST http://localhost:3000/cadastros/profissionais \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "nome": "Maria Terapeuta",
    "email": "maria@salao.com",
    "cargo": "FUNCIONARIO",
    "porc_comissao": 25,
    "salario_fixo": 2000,
    "ativo": 1
  }'
```

Guarde o `id` como `$PROFISSIONAL_ID`.

### 2.7 Criar um Procedimento
```bash
curl -X POST http://localhost:3000/cadastros/procedimentos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "nome": "Massagem Terapêutica",
    "descricao": "Massagem completa 60 minutos",
    "preco_p": 100.00,
    "preco_m": 120.00,
    "preco_g": 130.00,
    "custo_variavel_base": 15.00,
    "tempo_estimado": 60
  }'
```

Guarde o `id` como `$PROCEDIMENTO_ID`.

### 2.8 Criar Configuração do Salão
```bash
curl -X POST http://localhost:3000/cadastros/configuracoes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "taxa_maquininha_pct": 2.5,
    "custo_fixo_por_atendimento": 10.00,
    "qtd_atendimentos_mes": 50
  }'
```

---

## 3. ATENDIMENTOS (Lógica Financeira)

### 3.1 Criar um Atendimento com Procedimentos
```bash
curl -X POST http://localhost:3000/atendimentos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "cliente_id": '$CLIENTE_ID',
    "profissional_id": '$PROFISSIONAL_ID',
    "data_atendimento": "2024-01-15",
    "procedimentos": [
      {
        "procedimento_id": '$PROCEDIMENTO_ID',
        "valor_cobrado": 100.00,
        "comprimento": "P",
        "quantidade": 1,
        "notas": "Cliente com preferência por massagem suave"
      }
    ],
    "valor_pago": 100.00,
    "forma_pagamento": "cartao",
    "status": "EXECUTADO"
  }'
```

**Resposta esperada:**
```json
{
  "id": 1,
  "salao_id": 1,
  "cliente_id": 1,
  "profissional_id": 1,
  "data_atendimento": "2024-01-15",
  "valor_cobrado": 100,
  "valor_pago": 100,
  "forma_pagamento": "cartao",
  "status": "EXECUTADO",
  "total_lucro_liquido": 52.5,
  "total_lucro_possivel": 55,
  "procedimentos_count": 1
}
```

Guarde o `id` como `$ATENDIMENTO_ID`.

**Fórmula esperada:**
- valor_maquininha = 100 * 2.5% = 2.50
- custo_fixo = 10.00
- valor_profissional = 100 * 25% = 25.00
- custo_variavel = 15.00
- **lucro_liquido = 100 - 2.50 - 10.00 - 25.00 - 15.00 = 47.50**
- **lucro_possivel = 100 - 10.00 - 25.00 - 15.00 = 50.00** (sem maquininha)

### 3.2 Listar Atendimentos
```bash
curl -X GET http://localhost:3000/atendimentos \
  -H "Authorization: Bearer $TOKEN"
```

### 3.3 Listar Atendimentos de um Dia Específico
```bash
curl -X GET 'http://localhost:3000/atendimentos?data=2024-01-15' \
  -H "Authorization: Bearer $TOKEN"
```

### 3.4 Obter um Atendimento com Detalhes
```bash
curl -X GET http://localhost:3000/atendimentos/$ATENDIMENTO_ID \
  -H "Authorization: Bearer $TOKEN"
```

**Resposta esperada:**
```json
{
  "id": 1,
  "salao_id": 1,
  "cliente_id": 1,
  "profissional_id": 1,
  "data_atendimento": "2024-01-15",
  "valor_cobrado": 100,
  "valor_pago": 100,
  "forma_pagamento": "cartao",
  "status": "EXECUTADO",
  "total_lucro_liquido": 47.50,
  "total_lucro_possivel": 50.00,
  "procedimentos": [
    {
      "id": 1,
      "atendimento_id": 1,
      "procedimento_id": 1,
      "quantidade": 1,
      "valor_cobrado": 100,
      "valor_maquininha": 2.50,
      "custo_fixo": 10.00,
      "valor_profissional": 25.00,
      "custo_variavel": 15.00,
      "lucro_liquido": 47.50,
      "lucro_possivel": 50.00,
      "comprimento": "P",
      "notas": "Cliente com preferência por massagem suave"
    }
  ]
}
```

### 3.5 Atualizar um Atendimento
```bash
curl -X PUT http://localhost:3000/atendimentos/$ATENDIMENTO_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "valor_pago": 100.00,
    "status": "FINALIZADO"
  }'
```

---

## 4. FECHAMENTO MENSAL

### 4.1 Obter Fechamento Mensal
```bash
curl -X GET http://localhost:3000/fechamento/2024-01 \
  -H "Authorization: Bearer $TOKEN"
```

**Resposta esperada:**
```json
{
  "mes": "2024-01",
  "faturamentoBruto": 500.00,
  "receitaRecebida": 450.00,
  "totalPendente": 50.00,
  "receitaHomecare": 0.00,
  "receitaParalelos": 0.00,
  "receitaTotalCaixa": 500.00,
  "lucroAtendimentosReal": 237.50,
  "lucroHomecare": 0.00,
  "totalDespesas": 100.00,
  "totalSalariosFixos": 2000.00,
  "saudeFinanceira": -1862.50,
  "margemLucro": "47.50"
}
```

---

## 5. OUTROS CADASTROS (CRUD Genérico)

### 5.1 Criar um Produto no Catálogo
```bash
curl -X POST http://localhost:3000/cadastros/produtos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "nome": "Oleo de Massagem Premium",
    "descricao": "Óleo 100% natural para terapia",
    "preco_compra": 50.00,
    "qtd_aplicacoes": 10,
    "unidade": "L"
  }'
```

### 5.2 Criar um Custo Fixo
```bash
curl -X POST http://localhost:3000/cadastros/custos-fixos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "descricao": "Aluguel do Salão",
    "valor_mensal": 2000.00,
    "data_inicio": "2024-01-01"
  }'
```

### 5.3 Criar uma Despesa
```bash
curl -X POST http://localhost:3000/cadastros/despesas \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "descricao": "Compra de toalhas",
    "valor": 150.00,
    "data": "2024-01-10",
    "categoria": "MATERIAL"
  }'
```

### 5.4 Criar Homecare
```bash
curl -X POST http://localhost:3000/cadastros/homecare \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "cliente_id": '$CLIENTE_ID',
    "descricao": "Atendimento em casa - Facial",
    "valor_venda": 200.00,
    "custo_produto": 40.00,
    "data": "2024-01-15"
  }'
```

### 5.5 Criar Procedimento Paralelo (Venda de Produtos)
```bash
curl -X POST http://localhost:3000/cadastros/procedimentos-paralelos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "descricao": "Venda de Óleo de Massagem",
    "valor": 50.00,
    "data": "2024-01-15"
  }'
```

---

## 6. TESTES DE SEGURANÇA

### 6.1 Tentar acessar sem token (deve falhar)
```bash
curl -X GET http://localhost:3000/atendimentos
```

**Resposta esperada:** `{ "error": "Token não fornecido" }` (401)

### 6.2 Tentar usar token inválido (deve falhar)
```bash
curl -X GET http://localhost:3000/atendimentos \
  -H "Authorization: Bearer token_invalido"
```

**Resposta esperada:** `{ "error": "Token inválido" }` (401)

### 6.3 Listar apenas seus dados (isolamento por salao_id)
- Fazer login como um usuário de um salão diferente e listar atendimentos
- Deve retornar apenas atendimentos daquele salão, nunca de outro

---

## 7. EXEMPLOS DE FLUXO COMPLETO

### Cenário: Criar um atendimento com múltiplos procedimentos
```bash
# 1. Login
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@salao.com","senha":"senha123"}' | jq -r '.token')

# 2. Criar cliente
CLIENTE_ID=$(curl -s -X POST http://localhost:3000/cadastros/clientes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"nome":"Ana Silva","email":"ana@email.com"}' | jq -r '.id')

# 3. Criar profissional
PROF_ID=$(curl -s -X POST http://localhost:3000/cadastros/profissionais \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"nome":"Carlos Terapeuta","cargo":"FUNCIONARIO","porc_comissao":20}' | jq -r '.id')

# 4. Criar procedimento
PROC_ID=$(curl -s -X POST http://localhost:3000/cadastros/procedimentos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"nome":"Massagem","preco_p":100,"custo_variavel_base":15}' | jq -r '.id')

# 5. Criar atendimento
curl -s -X POST http://localhost:3000/atendimentos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "cliente_id":"'$CLIENTE_ID'",
    "profissional_id":"'$PROF_ID'",
    "data_atendimento":"2024-01-15",
    "procedimentos":[
      {"procedimento_id":"'$PROC_ID'","valor_cobrado":100,"quantidade":1}
    ],
    "valor_pago":100,
    "status":"EXECUTADO"
  }' | jq '.'
```

---

## Notas Importantes

1. **Tokens JWT**: Todos os endpoints exceto `/auth/login` exigem autenticação. Use o header `Authorization: Bearer $TOKEN`.

2. **Isolamento por Salão**: Todos os dados são automaticamente filtrados pelo `salao_id` do usuário logado. Nunca confie em um `salao_id` vindo do frontend.

3. **Fórmulas de Cálculo**: Verifique os valores de `lucro_liquido` e `lucro_possivel` nos testes de atendimentos para validar que as fórmulas estão corretas.

4. **Formato de Data**: Use sempre `YYYY-MM-DD` para datas e `YYYY-MM` para meses no fechamento.

5. **Erros Comuns**:
   - `404 Not Found`: Recurso não encontrado (verifique o `id` e se é do seu salão)
   - `400 Bad Request`: Dados inválidos (verifique os campos obrigatórios)
   - `401 Unauthorized`: Autenticação necessária ou token expirado
   - `500 Internal Server Error`: Erro no servidor (verifique os logs)

---

## Comando para extrair token (facilita os testes)

Se você está usando `jq` (JSON query language):

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@salao.com","senha":"senha123"}' | jq -r '.token')

echo $TOKEN
```

Depois use `$TOKEN` nos outros comandos.
