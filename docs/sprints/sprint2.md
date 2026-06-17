CONTEXTO DO PROJETO:
Sistema de gestão de salão de beleza. Os serviços possuem um 
preço cadastrado no sistema. Quando um agendamento é salvo, 
o valor cobrado naquele momento deve ser registrado de forma 
permanente e independente.

PROBLEMA IDENTIFICADO PELO CLIENTE:
O cliente quer garantir que, se o preço de um serviço for 
alterado no futuro (ex: progressiva que custava R$180 passa 
a custar R$200), os agendamentos e serviços já executados 
anteriormente NÃO sejam afetados. O histórico financeiro 
deve refletir o valor real que foi cobrado no dia, não o 
preço atual do cadastro.

TAREFA — implemente as seguintes mudanças:

1. Verifique se existe alguma query, join ou referência 
   dinâmica que busca o preço do serviço diretamente da 
   tabela de cadastro de serviços no momento de exibir 
   relatórios, gráficos ou histórico de agendamentos.

2. Se existir, substitua por leitura do campo `valor_cobrado` 
   salvo diretamente no registro do agendamento (implementado 
   no Sprint 1).

3. Garanta que ao salvar um agendamento, os campos 
   `valor_indicado` e `valor_cobrado` sejam copiados e 
   persistidos diretamente na tabela de agendamentos — 
   nunca como chave estrangeira que busca o preço atual 
   do serviço em tempo de execução.

4. Teste o seguinte cenário manualmente ou via código:
   - Crie um agendamento com serviço X valendo R$180
   - Altere o preço do serviço X para R$200 no cadastro
   - Verifique que o agendamento antigo ainda exibe R$180
   - Confirme que os gráficos e fechamento do mês 
     continuam usando R$180 para aquele registro

ATENÇÃO:
- Não altere a tela de cadastro de serviços.
- Não altere nenhuma outra funcionalidade além da 
  persistência dos valores nos agendamentos.
- Esta tarefa depende do Sprint 1 estar concluído, pois 
  usa os campos `valor_indicado` e `valor_cobrado`.