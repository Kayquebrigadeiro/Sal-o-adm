# Motor de Precificação Financeira — FinancialEngine

## Diagnóstico da Planilha (Resultado da Pesquisa)

Após análise completa do arquivo `NOVA PLANILHA DE SALAO 20233 - Copia.xlsm`, identifiquei a seguinte estrutura:

### Abas e Suas Funções
| Aba | Função | Relevância para Engine |
|---|---|---|
| **VALORES** | Tabela de produtos, custos fixos, preços e fórmulas de precificação | ⭐⭐⭐ CORE |
| **CONTROLE** | Registro de atendimentos com cálculo de VALOR BASE automático | ⭐⭐⭐ CORE |
| **DADOS** | Aba consolidada com colunas calculadas (lucro, comissão, custos) | ⭐⭐⭐ CORE |
| **HOME CAR** | Venda de produtos (HomeCare) | ⭐⭐ |
| **PROCED PARALELO** | Procedimentos terceirizados (cílios, buço, etc.) | ⭐⭐ |
| **AGENDA DISPONIVEL** | Grade visual de agenda | ⭐ (já implementada no front) |
| **GRAFICOS-FECHAMENTO** | Pivot tables e gráficos de fechamento mensal | ⭐ (Dashboard) |
| **CALENDARIO** | Tabela auxiliar de datas por mês/ano | — (Não necessário no SaaS) |
| **DESPESAS - RECEITA** | Pró-labore, dívidas e saúde da empresa | ⭐ |

### Fórmulas-Chave Extraídas da Planilha

> [!IMPORTANT]
> A fórmula da planilha **NÃO** é a simplificação teórica do prompt. Ela tem particularidades reais que devem ser respeitadas:

#### 1. Valor Base (Preço Sugerido) — Célula `C5` da aba VALORES
```
= IFERROR(
    IF(OR(Comprimento="P", Proc="CORTE"),
        (VLOOKUP(Proc, custos, 4, 0) + CUSTO_FIXO_RATEADO) + VLOOKUP(Proc, ganhos, 5, 0),
    IF(Comprimento="M",
        ((custo + CUSTO_FIXO + ganho) * M%) + (custo + CUSTO_FIXO + ganho),
        ((custo + CUSTO_FIXO + ganho) * G%) + (custo + CUSTO_FIXO + ganho)
    ))
, "SEM PRODUTO") / 95%
```

**Tradução para código:**
- `Custo por Aplicação` = Preço do produto ÷ Qtd de aplicações
- `Ganho Líquido Fixo` = valor de comissão base do procedimento (coluna F da aba VALORES)
- `Custo Fixo Rateado (J30)` = soma de `energia/cab + água/cab + internet/cab + ...` = **R$ 10,65** no exemplo
- Multiplicador M = **20%** a mais (célula `J4`)
- Multiplicador G = **30%** a mais (célula `J5`)
- O resultado final é dividido por **0.95** (95%), que representa a **taxa de maquininha de 5%** incluída na engenharia reversa

#### 2. Tratamento Especial — LUZES e COLORAÇÃO
A planilha trata luzes e coloração como soma de múltiplos produtos (pó descolorante, ox, teraplex, etc.):
- **COLORAÇÃO P** → `V7` = soma de custos fixos individuais dos produtos
- **LUZES P** → `V16` = soma de todos os produtos de luzes + custos fixos
- Para M e G, aplica-se `Z5`/`Z6` (coloração) e `Z14`/`Z15` (luzes) com multiplicadores

#### 3. Lucro Líquido Real — Célula da aba DADOS (coluna W)
```
Lucro Real = (Valor_Cobrado - (Valor_Cobrado × Taxa_Maq%)) 
           - (Valor_Cobrado × Porcentual_Procedimento%) 
           - Custo_Fixo_Rateado 
           - Custo_Produto
```
Onde o **Porcentual do Procedimento** (coluna Q da aba DADOS) varia por tipo (30%, 45%, 50%).

#### 4. Lógica PROPRIETÁRIO vs FUNCIONÁRIO
```
SE cargo = PROPRIETÁRIO:
    lucro = valor - maquininha - custo_fixo - custo_produto
    (SEM desconto de comissão — ela faz pra si mesma)
SE cargo = FUNCIONÁRIO:
    lucro = valor - maquininha - comissão - custo_fixo - custo_produto
```

#### 5. HomeCare (Venda de Produtos)
```
Lucro HomeCare = Valor_Venda - Custo_Produto
Pendência = Valor_Venda - Valor_Pago
```
Sem taxa de maquininha, sem comissão, sem custo fixo.

#### 6. Procedimentos Paralelos
```
Pendência = Valor - Valor_Pago
```
São serviços de terceiros (cílios pela Geovana, buço, etc.).

---

## Proposta de Alterações

### Componente 1: Motor Financeiro Puro (Novo)

#### [NEW] [FinancialEngine.js](file:///c:/Ptojeto-jaco/Salao-secreto/src/services/FinancialEngine.js)

Classe utilitária pura (sem dependência de React/Supabase) contendo:

1. **`calcularCustoFixoRateado(despesasFixas, qtdCabelosMes)`**
   - Replica a célula `J30` da aba VALORES
   - Soma todos os custos fixos (aluguel, energia, água, internet, etc.) dividido pela quantidade de atendimentos/mês

2. **`calcularValorBase(params)`** — Engenharia reversa
   - Input: `{ custoMaterial, custoFixoRateado, ganhoLiquido, comprimento, multiplicadorM, multiplicadorG, taxaMaquininha }`
   - Aplica multiplicador por comprimento (P=1x, M=1.20x, G=1.30x)
   - Divide por `(1 - taxaMaquininha)` para incorporar a maquininha = `/0.95`
   - Retorna o preço sugerido para cobrar

3. **`calcularLucroReal(params)`** — Cálculo centavo a centavo
   - Input: `{ valorCobrado, taxaMaquininha, porcentualProcedimento, custoFixoRateado, custoProduto, cargoProf }`
   - Retorna objeto detalhado:
     ```js
     {
       valorBruto, valorMaquininha, valorComissao, 
       custoFixo, custoProduto, lucroLiquido, 
       margemReal, lucroSeProprietario
     }
     ```

4. **`calcularPrecoSugerido(params)`** — Fórmula de Engenharia Reversa genérica
   - Input: `{ custoTotal, taxaMaq, taxaCom, taxaImposto, margemAlvo }`
   - `R_sug = custoTotal / (1 - taxaMaq - taxaCom - taxaImposto - margemAlvo)`
   - Validação: se soma das taxas ≥ 1, retorna erro `MARGEM_IMPOSSIVEL`

5. **`calcularHomeCare(params)`**
   - Input: `{ valorVenda, custoProduto, valorPago }`
   - `lucro = valorVenda - custoProduto`
   - `pendencia = valorVenda - valorPago`

6. **`calcularResumoMensal(atendimentos, despesas, homecare)`**
   - Consolida todos os atendimentos do mês
   - Retorna: faturamento bruto, lucro total, ticket médio, total de pendências, etc.

> [!WARNING]
> **Precisão de ponto flutuante:** Todos os cálculos internos usarão multiplicação por 100 (inteiros em centavos) para evitar erros de arredondamento do JS. Formatação com 2 casas decimais apenas no output.

---

### Componente 2: Constantes e Configuração (Novo)

#### [NEW] [financialConstants.js](file:///c:/Ptojeto-jaco/Salao-secreto/src/services/financialConstants.js)

Extraído diretamente da aba VALORES:
```js
export const MULTIPLICADORES = { P: 0, M: 20, G: 30 }; // % adicional
export const PERCENTUAIS_PROCEDIMENTO = {
  'CABELO': 30, 'UNHAS': 45, 'SOMBRANCELHA': 50,
  'EXTENSÃO DE CILIOS': 50, 'ADICIONAL': 50
};
```

---

### Componente 3: Hook de Integração (Novo)

#### [NEW] [useFinancialEngine.js](file:///c:/Ptojeto-jaco/Salao-secreto/src/hooks/useFinancialEngine.js)

Hook React que:
- Busca as `configuracoes` do salão no Supabase
- Instancia o `FinancialEngine` com os dados reais
- Expõe métodos prontos: `calcularAtendimento()`, `calcularPrecoSugerido()`, etc.

---

## Compatibilidade com o Schema SQL Existente

O [trigger `fn_calcular_atendimento()`](file:///c:/Ptojeto-jaco/Salao-secreto/teste.sql#L226-L281) no banco já faz a mesma lógica no backend. O `FinancialEngine.js` servirá de **espelho no frontend** para:
1. Preview em tempo real na tela de Precificação (sem round-trip ao banco)
2. Validação antes de enviar ao Supabase
3. Simulações "what-if" (ex: "se eu mudar o comprimento pra G, quanto fico?")

O trigger SQL continua sendo a **fonte de verdade** para os dados persistidos.

---

## Verificação

### Testes Automatizados
- Criarei um arquivo de teste com dados reais extraídos da planilha para validar que os resultados do `FinancialEngine` batem centavo por centavo com os valores da planilha.

**Exemplos de validação (dados reais da planilha):**
| Procedimento | Compr. | Valor Cobrado | Valor Base (planilha) | Lucro Real |
|---|---|---|---|---|
| LUZES | P | R$ 230 | R$ 539.11 | R$ 37.35 |
| KIT LAVATORIO | P | R$ 35 | R$ 39.49 | R$ 3.23 |
| BOTOX | G | R$ 150 | R$ 133.40 | R$ 71.02 |
| RECONSTRUÇÃO | P | R$ 85 | R$ 96.92 | R$ 25.42 |
| UNHAS | — | R$ 25 | — | R$ 9.75 |

### Manual
- Rodar o app localmente e comparar a tela de Precificação com os valores da planilha original.

## Open Questions

> [!IMPORTANT]
> **Taxa de imposto (Simples Nacional):** A planilha original **não** tem uma célula explícita de imposto governamental. A fórmula divide por `0.95` (5% maquininha). Deseja que eu adicione uma variável de imposto configurável (`T_tax`) no sistema, ou manter exatamente como a planilha funciona hoje (sem imposto separado)?
