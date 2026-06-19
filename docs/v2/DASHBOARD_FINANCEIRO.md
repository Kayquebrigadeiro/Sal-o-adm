# VIEWS E DASHBOARD — Salão Secreto V8

---

## VIEWS DE PRODUÇÃO

### `v_atendimentos_completo` *(Sprint 3)*
**Finalidade:** Exibir atendimentos com todos os procedimentos expandidos em JSON para a tela de Agenda.

**Campos retornados:** id, salao_id, data, horario, profissional_id, cliente, valor_cobrado, valor_pago, valor_pendente, valor_maquininha, valor_profissional, custo_fixo, custo_variavel, lucro_liquido, status, obs, criado_em, atualizado_em + campo `procedimentos` (JSON array).

**JSON de procedimentos:**
```json
[
  {
    "id": "uuid",
    "procedimento_id": "uuid",
    "procedimento_nome": "PROGRESSIVA",
    "categoria": "SERVICO_CABELO",
    "comprimento": "M",
    "valor_indicado": 180.00,
    "valor_cobrado": 160.00,
    "valor_pago": 160.00,
    "sequencia": 1
  }
]
```

**Dependências:** `atendimentos`, `atendimento_procedimentos`, `procedimentos`
**Filtro:** Exclui atendimentos `CANCELADO`

---

### `fechamento_mensal`
**Finalidade:** Base do Dashboard financeiro. Agrega todos os dados financeiros por salão e mês.

**Aliases obrigatórios (usados pelo frontend):**

| Alias | Origem | Descrição |
|-------|--------|-----------|
| `faturamento_bruto` | SUM(atendimentos.valor_cobrado) WHERE EXECUTADO | Total faturado |
| `lucro_real` | SUM(atendimentos.lucro_liquido) WHERE EXECUTADO | Lucro líquido real |
| `lucro_possivel` | SUM(atendimentos.lucro_possivel) WHERE EXECUTADO | Lucro sem maquininha |
| `total_pendente` | SUM(valor_cobrado - valor_pago) WHERE EXECUTADO | A receber |
| `total_maquininha` | SUM(valor_maquininha) | Total de taxas |
| `total_profissionais` | SUM(valor_profissional) | Total de comissões |
| `total_custo_fixo` | SUM(custo_fixo) | Total custo fixo |
| `total_custo_variavel` | SUM(custo_variavel) | Total custo variável |
| `total_atendimentos` | COUNT WHERE EXECUTADO | Qtd atendimentos |
| `total_cancelamentos` | COUNT WHERE CANCELADO | Qtd cancelamentos |
| `receita_homecare` | SUM(homecare.valor_venda) | Receita de produtos |
| `lucro_homecare` | SUM(homecare.lucro) | Lucro de produtos |
| `receita_paralelos` | SUM(procedimentos_paralelos.valor) | Receita terceirizados |
| `total_despesas` | SUM(despesas.valor) | Total de despesas |
| `total_salarios_fixos` | SUM(profissionais.salario_fixo) WHERE ativo AND FUNCIONARIO | Folha fixa |
| `receita_total` | faturamento + homecare + paralelos | Receita consolidada |
| `saude_financeira` | lucro_real + lucro_homecare - despesas - salarios | Saúde da empresa |

---

### `ranking_procedimentos`
**Finalidade:** Ranking de serviços mais executados e lucrativos.

**Campos:** salao_id, mes, procedimento (nome), categoria, quantidade, receita_total, lucro_total, ticket_medio

**Filtro:** Apenas status EXECUTADO

---

### `rendimento_por_profissional`
**Finalidade:** Performance por profissional no mês.

**Campos:** salao_id, mes, profissional (nome), cargo, atendimentos, rendimento_bruto, faturamento_gerado

> ⚠️ `rendimento_bruto` = `valor_cobrado` (comissão foi removida no V7 — não há campo separado de comissão calculada aqui)

---

### `agenda_do_dia`
**Finalidade:** View auxiliar com join de profissional e procedimento para consultas de agenda.

> ⚠️ Esta view usa a tabela `atendimentos` diretamente com JOIN em `procedimentos` (schema pré-Sprint 3). Não inclui múltiplos serviços. Prefira `v_atendimentos_completo` no componente de Agenda.

---

### `custo_composto_procedimento`
**Finalidade:** Calcula o custo total de insumos de cada procedimento com base na composição de produtos.

**Fórmula:** `SUM(produtos_catalogo.custo_por_uso * procedimento_produtos.qtd_por_uso)`

**Campos:** procedimento_id, salao_id, custo_total_composicao, qtd_produtos

**Usado em:** `Agenda.jsx` — carregado no `useEffect` inicial para enriquecer o preview financeiro.

---

### `gastos_pessoais_resumo`
**Finalidade:** Resumo mensal dos gastos pessoais da dona.

**Campos:** salao_id, mes, quantidade_gastos, total_gastos, gasto_medio
