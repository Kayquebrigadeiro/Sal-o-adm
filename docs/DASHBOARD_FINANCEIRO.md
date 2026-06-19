# DASHBOARD FINANCEIRO E FECHAMENTOS — V2

O Dashboard Financeiro é a ferramenta de consolidação mensal. Ele agrega dados do fluxo de caixa e os exibe no painel web, consumindo Views nativas do PostgreSQL.
A responsabilidade primária das Views no Dashboard é centralizar métricas sem onerar as requisições API via frontend.

## 1. VIEWS DE SUPORTE

O sistema se suporta nas seguintes abstrações contábeis:

### `fechamento_mensal`
A View suprema do sistema. Agrupa informações por `salao_id` e `mes` (formato AAAA-MM-01). Consome múltiplas tabelas simultaneamente através de *Common Table Expressions (CTEs)*.
- **Campos retornados:**
  - `faturamento_bruto`: Total gerado pelos atendimentos que constam como EXECUTADOS.
  - `total_despesas`: Todas as inserções em `despesas` e totais retidos para a folha salarial (`total_salarios_fixos`).
  - `lucro_real`: O KPI máximo, descontando todas as intempéries sistêmicas.
  - `lucro_possivel`: Exposição do KPI sem as taxas parasitas de meios de pagamento.
  - `saude_financeira`: A equação global final contendo `(lucro real + lucro homecare) - (despesas + salários fixos)`.

### `ranking_procedimentos`
Uma visualização analítica para o dashboard gráfico. Identifica os produtos mais vendidos ("*O que sustenta o Salão?*").
- Conta a frequência (`quantidade`) de procedimentos EXECUTADOS.
- Resume o `ticket_medio` por mês de um determinado procedimento.

### `rendimento_por_profissional`
Agrega a produtividade humana da base de colaboradores. Retorna atendimentos feitos e o faturamento bruto que o Profissional alavancou.

---

## 2. COMPOSIÇÕES DE CAIXA SECUNDÁRIAS

O Dashboard não computa apenas procedimentos e serviços de prateleira; existem vias marginais integradas ao `fechamento_mensal`:

1. **Homecare**: Vendas de bens de consumo físicos (shampoos, cremes). O lucro é direto: `Valor de Venda - Custo do Produto`.
2. **Procedimentos Paralelos**: Quando o salão cede espaço a um profissional terceirizado. Apenas a margem de retenção incide sobre o fluxo de caixa, ou o bruto inteiro é lançado mediante sub-contrato.
3. **Gastos Pessoais**: Despesas de proprietários. Importante na interface para mostrar "Para onde foi o dinheiro", mas *não deve* entrar na balança estrita operacional do salão (são lançamentos em um poço próprio, descontados visualmente, mas não do cálculo de margem do negócio base).

## 3. O PAPEL DA DUPLA VALIDAÇÃO E RECÁLCULO

Apesar do Banco de Dados consolidar tudo no Fechamento Mensal, o Frontend possui a autonomia arquitetônica (baseada em Recharts e hooks como `useFinancialEngine`) para cruzar os dados pontualmente.
Esta documentação atesta que a inteligência de processamento de Views foi delegada majoritariamente ao DB, garantindo velocidade de agregação e diminuição da complexidade dos seletores de estado na aplicação React.
