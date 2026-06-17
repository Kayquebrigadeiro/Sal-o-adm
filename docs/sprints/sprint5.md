CONTEXTO DO PROJETO:
Sistema de gestão de salão de beleza com tela de Agenda. 
É possível mover um agendamento para outro horário. 
Ao fazer isso, aparece uma confirmação para o usuário.

PROBLEMA IDENTIFICADO PELO CLIENTE:
A mensagem de confirmação atual é muito simples e pouco 
apresentável. Visualmente ela aparece como um alert/popup 
básico do browser com o texto:
"adm-salao.vercel.app diz: Mover para LARISSA às 09:00"
com botões "OK" e "Cancelar" sem nenhum estilo.

O cliente quer uma mensagem mais bonita e moderna, 
condizente com o visual do sistema.

TAREFA — implemente as seguintes mudanças:

1. Substitua o alert/confirm nativo do browser por um 
   modal customizado estilizado com:
   - Ícone visual relacionado a agenda/calendário 
     (pode usar o mesmo padrão de ícones já usado 
     no projeto)
   - Título: "Mover Agendamento"
   - Mensagem descritiva:
     "Deseja mover o agendamento de [NOME DO CLIENTE] 
     para [HORÁRIO]?"
   - Dois botões estilizados:
     → "Confirmar" (botão primário, cor de destaque 
        do sistema)
     → "Cancelar" (botão secundário/outline)

2. O modal deve seguir o padrão visual já existente 
   no sistema (dark mode ou light mode conforme 
   o tema atual do projeto).

3. A funcionalidade de mover o agendamento deve 
   continuar funcionando exatamente como antes — 
   apenas o visual da confirmação muda.

4. O modal deve ser responsivo e funcionar bem 
   em mobile também.

ATENÇÃO:
- Não altere a lógica de mover agendamentos, 
  apenas substitua o modal de confirmação.
- Não altere nenhuma outra tela ou funcionalidade.
- Se o projeto já tiver um componente de Modal 
  reutilizável, use-o. Não crie um do zero se 
  já existir um padrão no projeto.