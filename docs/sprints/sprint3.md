CONTEXTO DO PROJETO:
Sistema de gestão de salão de beleza. Na tela de agendamento, 
o usuário pode adicionar um ou mais serviços. Após adicionar 
um serviço, ele aparece em uma listagem dentro do agendamento.

PROBLEMA IDENTIFICADO PELO CLIENTE:
Após adicionar um serviço, não existe opção de editá-lo. 
As únicas ações disponíveis são "selecionar" ou "adicionar" 
outro serviço. O cliente tentou alterar um valor específico 
de um serviço já adicionado e não conseguiu.

TAREFA — implemente as seguintes mudanças:

1. Na listagem de serviços adicionados ao agendamento, 
   adicione um botão/ícone de EDITAR ao lado de cada item.

2. Ao clicar em editar, abra o mesmo modal de seleção/adição 
   de serviço, porém com os campos já preenchidos com os 
   dados do serviço selecionado:
   - Nome do serviço
   - `valor_indicado` (valor sugerido pelo sistema)
   - `valor_cobrado` (valor editável pelo salão)

3. Ao confirmar a edição, atualize o registro existente 
   na listagem — não crie um novo item duplicado.

4. Mantenha a opção de remover/excluir o serviço da lista, 
   caso já exista.

5. Após salvar a edição, os valores atualizados devem 
   refletir imediatamente nos cálculos do agendamento 
   (total, etc).

ATENÇÃO:
- Não altere o fluxo de adição de um novo serviço, 
  apenas reaproveite o modal existente para a edição.
- Não altere nenhuma outra tela além da listagem de 
  serviços dentro do agendamento.
- Esta tarefa depende do Sprint 1 estar concluído.