# REGRAS DE NEGÓCIO E MECÂNICAS — V2

Esta documentação consolida todas as lógicas essenciais de cálculo que tornam a plataforma robusta e íntegra.

## 1. O MOTOR FINANCEIRO

O cálculo do motor financeiro baseia-se na separação das receitas brutas e nos abatimentos contínuos das despesas envolvidas naquele atendimento específico. O sistema deve expor sempre dois panoramas:
A rentabilidade se o serviço fosse cobrado de maneira ótima, e a rentabilidade real com base na forma de pagamento e custos do dia.

### O Cálculo Principal do Atendimento:
```text
  Valor Cobrado (Determinável pelo usuário)
- Valor da Maquininha (Baseado em % configurado)
- Custo Fixo (Rateio / Quantidade de atendimentos)
- Custo Variável (Gasto com insumos, shampoos, etc.)
-----------------------------------------------
= LUCRO LÍQUIDO (Lucro Real)
```

### Lucro Possível:
O *Lucro Possível* desconsidera o peso de taxas de transação financeiras de terceiros (maquininhas/cartões de crédito). Seu propósito é conscientizar o dono do salão sobre quanto ele perde para os bancos.
```text
  Valor Cobrado
- Custo Fixo
- Custo Variável
-----------------------------------------------
= LUCRO POSSÍVEL
```
*Ação Prática: O dashboard destaca a discrepância entre Lucro Líquido e Lucro Possível para incentivar que os salões façam campanhas de recebimento via Pix e Dinheiro em Espécie.*

## 2. VALOR MANUAL E FLEXIBILIDADE DE PRECIFICAÇÃO

O sistema entende que a precificação de serviços de beleza é subjetiva. Promoções, amizades ou combos alteram o preço padronizado.
- O **`valor_indicado`** é o preço cru retirado do catálogo de Procedimentos (Ex: Unha R$ 50).
- O **`valor_cobrado`** é o preço de fato final acordado.
A cliente tem **total autonomia** sobre o `valor_cobrado`. Todas as métricas de faturamento e lucro são regidas *unicamente* pelo `valor_cobrado`.

## 3. IMUTABILIDADE HISTÓRICA

Os registros de Atendimentos antigos não podem sofrer mutação devido a atualizações na tabela de Cadastros (Procedimentos ou Configurações de Taxas).
- Quando o proprietário altera o preço do "Corte" de R$ 80 para R$ 100 hoje, todos os históricos de balanço de meses anteriores **permanecem em R$ 80**.
- Isto é viabilizado pelo salvamento atômico estático dos preços transacionais nas tabelas `atendimentos` e `atendimento_procedimentos` na hora da criação do agendamento, protegendo os relatórios do Dashboard.

## 4. PRECIFICAÇÃO POR COMPRIMENTO (P, M, G)

Serviços da categoria `SERVICO_CABELO` exigem tamanho.
- Caso o proprietário não defina os preços das variações `M` e `G` no cadastro:
  - O tamanho `M` terá um aumento automático de **20%** em relação ao `P` (`preco_p * 1.20`).
  - O tamanho `G` terá um aumento automático de **30%** em relação ao `P` (`preco_p * 1.30`).
Serviços da categoria `SERVICO_ESTETICA` não demandam variação de tamanho, assumindo comportamento de custo plano.

## 5. REGRAS DE ESTADOS DO ATENDIMENTO

- **AGENDADO**: Ocorre na criação do slot de agenda. O dinheiro conta como "A receber", mas pode não afetar o fechamento de caixa diário positivamente dependendo do view.
- **EXECUTADO**: O serviço ocorreu com sucesso. Suas despesas contábeis começam a valer para o painel consolidado.
- **CANCELADO**: Em caso de No-show ou Desistência, as Triggers disparam o zeramento contábil.
  - Taxa Maquininha = 0
  - Lucro Liquido = 0
  - Lucro Possível = 0
  - Custos não são somados contra o salão (são expurgados da balança).
