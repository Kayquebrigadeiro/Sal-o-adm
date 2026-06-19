# REGRAS DE NEGÓCIO — Salão Secreto V8

---

## 1. CATEGORIAS DE PROCEDIMENTOS

O banco usa `categoria_enum` com exatamente 3 valores:

| Valor | Descrição | requer_comprimento |
|-------|-----------|--------------------|
| `SERVICO_CABELO` | Corte, progressiva, coloração... | true (automático) |
| `PRODUTO_APLICADO` | Produtos cobrados por aplicação | false (definido manualmente) |
| `SERVICO_ESTETICA` | Unhas, sobrancelha, cílios... | false (automático) |

> O trigger `trg_calc_produto_aplicado` seta `requer_comprimento` automaticamente ao salvar.

---

## 2. REGRA DO COMPRIMENTO (P / M / G)

Apenas procedimentos com `requer_comprimento = true` usam esta regra.

| Tamanho | Multiplicador | Lógica |
|---------|---------------|--------|
| P (Curto) | 1.00x | usa `preco_p` |
| M (Médio) | 1.20x | usa `preco_m` ou `preco_p * 1.20` |
| G (Longo) | 1.30x | usa `preco_g` ou `preco_p * 1.30` |

Exceções (Coloração, Luzes e similares): os valores M e G são cadastrados manualmente, não seguem o multiplicador.

---

## 3. CÁLCULO FINANCEIRO DO ATENDIMENTO

Executado pelo trigger `fn_calcular_atendimento` (BEFORE INSERT OR UPDATE em `atendimentos`):

```
valor_maquininha   = valor_cobrado × (taxa_maquininha_pct / 100)
custo_fixo         = configuracoes.custo_fixo_por_atendimento  (padrão: R$ 29,00)
custo_variavel     = procedimentos.custo_variavel
valor_profissional = 0  (campo reservado, não calculado no trigger atual)

lucro_liquido  = valor_cobrado - valor_maquininha - custo_fixo - custo_variavel
lucro_possivel = valor_cobrado - custo_fixo - custo_variavel
```

Se atendimento CANCELADO: maquininha, profissional e lucros = 0.

---

## 4. VALOR MANUAL (Sprint 1)

O campo de valor no modal de agendamento é editável.

- `valor_indicado`: preço tabela calculado pelo sistema no momento do agendamento. Não muda.
- `valor_cobrado`: valor real digitado/confirmado pelo salão. Pode diferir da tabela.

Ambos são salvos em `atendimento_procedimentos`. O `valor_cobrado` do atendimento pai é a soma dos filhos via trigger.

---

## 5. IMUTABILIDADE HISTÓRICA (Sprint 2)

Atendimentos passados nunca mudam quando o preço do procedimento é alterado.

**Como funciona:** os campos `valor_cobrado`, `lucro_liquido`, `custo_variavel` etc. são colunas próprias em `atendimentos` — não são joins para a tabela `procedimentos`. Portanto, alterar o preço de um procedimento não afeta nenhum atendimento já salvo.

---

## 6. MULTI-SERVIÇOS (Sprint 3)

Um agendamento pode ter N procedimentos.

**Fluxo de salvamento:**
1. Criar registro em `atendimentos` com `valor_cobrado = 0`
2. Inserir N registros em `atendimento_procedimentos` com `sequencia = 1, 2, 3...`
3. Trigger `trg_atend_proc_totais` soma os valores e atualiza o atendimento pai
4. Trigger `trg_calcular_atendimento` recalcula lucro com o total somado

**Backward compatibility:** o campo `procedimento_id` em `atendimentos` é preenchido com o primeiro procedimento para manter compatibilidade com queries antigas.

---

## 7. LUCRO REAL vs LUCRO POSSÍVEL

| Métrica | Fórmula | Uso |
|---------|---------|-----|
| Lucro Real | valor_cobrado - maquininha - custo_fixo - custo_variavel | Resultado efetivo |
| Lucro Possível | valor_cobrado - custo_fixo - custo_variavel | Motivacional: "se fosse no PIX" |

No gráfico do Dashboard:
- Barra "Lucro Possível" → `lucro_possivel`
- Barra "Lucro Real" → `lucro_real` (alias de `lucro_liquido` na view)

---

## 8. SAÚDE FINANCEIRA

Calculada na view `fechamento_mensal`:

```
saude_financeira = lucro_real + lucro_homecare - total_despesas - total_salarios_fixos
```

- Verde: está bancando a operação
- Vermelho: está pagando para trabalhar

---

## 9. SOFT DELETE DE SALÕES

Salões não são deletados fisicamente. São marcados com `deletado_em = now()` e `ativo = false`. As Edge Functions fazem a limpeza dos usuários Auth em cascata.

---

## 10. SISTEMA DE ASSINATURA

Tabelas `planos`, `assinaturas`, `pagamentos_assinatura` estão no banco mas o módulo está **desativado no frontend** via comentários em `App.jsx`. Não deve ser removido — será ativado em sprint futura.
