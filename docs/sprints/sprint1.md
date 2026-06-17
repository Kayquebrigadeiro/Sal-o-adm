CONTEXTO DO PROJETO:
Sistema de gestão de salão de beleza. Existe uma tela/modal de 
agendamento de serviços onde o sistema exibe automaticamente um 
valor sugerido para o serviço. 

PROBLEMA IDENTIFICADO PELO CLIENTE:
O valor exibido no agendamento é apenas uma sugestão gerada pelo 
sistema. Porém, atualmente não é possível alterá-lo. O salão 
precisa ter autonomia para definir o valor real que será cobrado 
do cliente, que pode ser diferente do valor sugerido.

O CLIENTE DEIXOU CLARO (em caixa alta na planilha de requisitos):
"O VALOR QUE SERA CONSIDERADO PARA CALCULO DE GRAFICO SERA 
TANTO O INDICADO PELO SISTEMA QUANTO O INSERIDO MANUALMENTE"

TAREFA — implemente as seguintes mudanças:

1. No modal/tela de agendamento de serviço, o campo de valor 
   deve se tornar EDITÁVEL. Ele deve vir pré-preenchido com o 
   valor sugerido pelo sistema, mas o usuário pode alterá-lo 
   livremente antes de salvar.

2. Salve DOIS valores distintos no banco de dados:
   - `valor_indicado`: valor padrão gerado pelo sistema 
     (não editável pelo usuário, apenas referência)
   - `valor_cobrado`: valor inserido/confirmado manualmente 
     pelo salão (este é o valor real da transação)

3. O campo de valor deve aceitar entrada numérica no formato 
   de moeda brasileira (R$ 0,00).

4. GRÁFICO "Lucro Possível x Lucro Real" (tela de relatórios):
   - "Lucro Possível" deve continuar sendo calculado com base 
     no `valor_indicado` (valor sugerido pelo sistema, como se 
     todos tivessem pago no pix sem taxas)
   - "Lucro Real" deve ser calculado com base no `valor_cobrado`
     (valor real inserido pelo salão)

5. CARD "Fechamento do Mês" (campos: Faturamento, Lucro Líquido, 
   Despesas, Resultado):
   - Todos os cálculos desse card devem usar `valor_cobrado` 
     como base, pois representa o que de fato foi cobrado.

6. Qualquer outro relatório, gráfico ou cálculo financeiro 
   do sistema que hoje usa o valor do serviço deve passar 
   a usar `valor_cobrado`.

ATENÇÃO:
- Não altere nenhuma outra tela além do fluxo de agendamento 
  e dos cálculos financeiros descritos acima.
- Não mude o design geral do sistema, apenas adicione/ajuste 
  o campo de valor no modal de agendamento.
- Garanta que o campo de edição de valor seja intuitivo — 
  deixe um placeholder ou label como "Valor cobrado (editável)".