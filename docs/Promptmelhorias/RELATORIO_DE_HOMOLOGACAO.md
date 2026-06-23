# RELATÓRIO DE HOMOLOGAÇÃO - SPRINT 8.x

Este documento resume as melhorias implementadas na plataforma Salão Secreto e descreve os cenários práticos para homologação de cada nova funcionalidade.

## 1. Drag & Drop Avançado na Agenda (SPRINT 8.1)
- **O que mudou:** Ao arrastar um agendamento, um painel flutuante ("Mover para qual dia?") aparece no topo exibindo os próximos 7 dias. Ao passar o mouse sobre um dia, a grade de horários muda automaticamente, permitindo soltar o agendamento em um novo dia e horário rapidamente.
- **Como Testar:**
  1. Crie um agendamento qualquer na Agenda de hoje.
  2. Clique e segure o card do agendamento.
  3. Mova o mouse até a barra superior que aparecerá e pare sobre o dia de "Amanhã".
  4. Aguarde a grade recarregar e solte o card em um horário livre.
  5. Confirme o modal que aparecerá e verifique se o agendamento foi movido corretamente.

## 2. Redesign do HomeCare (SPRINT 8.2)
- **O que mudou:** A tela de HomeCare foi simplificada. O antigo campo de texto "Cliente" foi substituído por um "Buscador Inteligente" (Autocomplete) integrado à base de clientes da Agenda. Adicionada a opção de cadastrar nova cliente no ato da venda.
- **Como Testar:**
  1. Acesse a tela "HomeCare" e clique em "Nova Venda".
  2. No campo "Buscar Cliente", comece a digitar o nome de uma cliente que já existe na Agenda. Selecione-a na lista.
  3. Tente digitar um nome inexistente e clique em "Cadastrar nova cliente".
  4. Preencha os valores de Custo e Venda e observe a "Nota Fiscal de Lucro" calculando as margens e pendências em tempo real.
  5. Salve a venda e verifique os "Cards de Resumo" no topo da tela.

## 3. Nomenclaturas na Precificação (SPRINT 8.3)
- **O que mudou:** Os termos técnicos foram substituídos para facilitar a compreensão das profissionais. "Preço P/M/G" agora é "Preço Curto/Médio/Longo". "Custo Mat." é "Custo dos produtos" e "Ganho Líq." é "Ganho Desejado". Adicionados ícones de ajuda (Tooltips).
- **Como Testar:**
  1. Acesse "Precificação" e inicie a edição ou criação de um Serviço de Cabelo.
  2. Observe os novos títulos na tabela: "Preço Curto", "Médio" e "Longo".
  3. Passe o mouse sobre o ícone de interrogação (?) para ver as explicações.
  4. Preencha os valores e note que o formulário utiliza a nova linguagem simplificada.

## 4. Clareza de Comissões nas Configurações (SPRINT 8.4)
- **O que mudou:** Adicionado o campo "Comissão Padrão (Opcional)" no cadastro de Profissionais. Atualizada a nota informativa para esclarecer que a comissão exata é definida por procedimento na aba de Serviços, e que o valor nas configurações serve apenas como base.
- **Como Testar:**
  1. Acesse "Configurações" e clique na aba "Equipe".
  2. Clique em "Novo Profissional" ou edite um existente.
  3. Preencha o campo "Comissão Padrão (Opcional)" (ex: 50%).
  4. Salve e observe que o card do profissional agora exibe a comissão (ex: "Comiss.: 50%").
  5. Leia o box azul informativo no final do formulário para verificar a clareza da mensagem.
