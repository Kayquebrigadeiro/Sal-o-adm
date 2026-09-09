# SIMULAÇÃO REALISTA EM PRODUÇÃO — Salão Beleza Real (2026-09-08)

**Alvo:** https://sal-o-adm-1.onrender.com — salão demo `beleza.real@teste.com`
**Scripts:** `backend-node/scripts/simulacao_producao_realista.js` (cria + audita) e
`backend-node/scripts/corrigir_e_concluir_simulacao.js` (deduplicação + conclusão idempotente)
**Relatório bruto:** `backend-node/scripts/simulacao_producao_realista.json`

## O que foi adicionado à simulação (o que faltava)

| Funcionalidade | Antes | Depois |
|---|---|---|
| **Custo fixo/atendimento (Precificação)** | `0.00` (nunca simulado) | **R$17,40** = rateio real: R$1.740 de custos fixos ÷ 100 atend./mês estimados |
| **Ganho desejado (Precificação)** | `0.00` em todos os procedimentos | Preenchido: Coloração R$60, Progressiva R$90, Corte R$30, Limpeza R$40, Manicure R$20, Botox R$50 |
| **Engenharia reversa** | nunca testada | "Escova Modeladora Express": preço = (17,40 + 22 + 45) ÷ 0,955 = **R$88,38** → lucro real do atendimento = **R$45,00 exatos** ✔ |
| **Custos Fixos** | Aluguel 1200, Energia 300, Internet 150 | + **Água e esgoto R$90** → total **R$1.740/mês** |
| **Despesas/Produto** | 4 produtos, 3 vínculos | + Tinta Fantasy 90ml (R$55/18 apl.), Esmalte Premium 15ml (R$12/30 apl.) + vínculos Coloração→Tinta e Manicure→Esmalte (custo variável dinâmico) |
| **Despesas variáveis (mês aberto)** | 1 (ago/2026 ficou sem nenhuma por tipo inválido) | +3 no mês aberto com tipos válidos do ENUM: MATERIAL 280, EQUIPAMENTO 220, OUTRO 250 |
| **Movimentações realistas (mês aberto)** | — | +10 atendimentos (comissões 20/30/40%, pagamento total/parcial/zero, 1 com procedimento adicional), +2 homecare, +1 paralelo, +1 gasto pessoal |

## Resultado da auditoria financeira independente

- **141 atendimentos EXECUTADOS conferidos linha a linha** contra uma réplica própria do
  `financialEngine.service.js` (maquininha, comissão, custo fixo, custo variável, lucro líquido,
  lucro possível, pendente): **0 divergências**.
- **Fechamentos dos 3 meses** conferidos contra somas independentes (11 campos por mês):
  **0 divergências** (após usar `criado_em` como data-base de gastos pessoais, comportamento
  documentado no roadmap — gastos pessoais não têm coluna `data`).

| Mês | Faturamento | Recebido | Pendente | Lucro atend. | Resultado do mês* | Resultado − custos fixos** |
|---|---|---|---|---|---|---|
| 2026-07 (fechado) | 7.568,00 | 6.349,82 | 1.218,18 | 3.125,91 | **−345,09** | −2.085,09 |
| 2026-08 (fechado) | 6.734,00 | 5.488,05 | 1.245,95 | 3.276,35 | **+336,35** | −1.403,65 |
| 2026-09 (aberto) | 7.233,76 | 6.120,31 | 1.113,45 | 2.818,08 | **−1.539,92** | −3.279,92 |

\* Fórmula do `POST /fechamento` e do Dashboard: lucro atendimentos + lucro homecare − despesas − gastos pessoais − salários fixos.
\** Cenário com os custos fixos mensais cadastrados (R$1.740) também descontados.

## O prejuízo do mês anterior acumula? — NÃO

Verificado no código (`fechamento.controller.js`, `Dashboard.jsx`):

1. Cada mês é calculado **de forma isolada**: as queries filtram apenas `data >= início do mês AND data < fim do mês`. Não existe query que consulte o mês anterior.
2. O snapshot em `fechamentos` guarda `resultado_final` **daquele mês**; não há coluna de "saldo anterior" nem de saldo acumulado.
3. No Dashboard, o card "Resultado" do mês usa os dados **daquele mês**; o único "acumulado" da tela é o total de faturamento somado para exibição (não entra em nenhum cálculo).

**Consequência prática para a dona do salão:** se um mês fecha no prejuízo, o sistema
**não** desconta esse prejuízo do resultado do mês seguinte. Cada mês recomeça do zero.
Cabe ao usuário (ou a uma futura funcionalidade de "saldo acumulado/caixa") fazer essa
arrastação manualmente — hoje ela não existe no sistema.

## Observações técnicas

- **Nenhum erro de cálculo foi encontrado.** Todos os 3 meses batem centavo a centavo com a réplica independente, incluindo atendimentos com custo variável dinâmico (insumos), procedimentos adicionais (custo fixo cobrado por procedimento) e comissões diferentes por profissional.
- Duplicatas criadas por execuções interrompidas foram removidas (1 custo fixo "Água e esgoto", 1 procedimento "Escova Modeladora Express"). Ficaram 2 atendimentos da Escova (ambos com lucro R$45,00 — corretos).
- Nota: `custo_fixo_por_atendimento` é **congelado no atendimento na criação** (Snapshot). Mudar a configuração só afeta atendimentos novos — por isso os meses 07/08 têm custo fixo R$0,00 por atendimento e 09 tem R$17,40 nos novos (os antigos de 09 foram recalculados via `PUT /atendimentos/:id/procedimentos`).
