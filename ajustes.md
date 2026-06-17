Este tipo de query pega o preço ATUAL do 
          procedimento, não o valor que foi cobrado 
          na época — isso é um bug de imutabilidade ❌
          
          Se encontrar: deve ser substituído por 
          leitura de a.valor_cobrado diretamente

[ ] 2.3 — No arquivo de migração SQL da Sprint 3 
          (MIGRATION_MULTIPLOS_SERVICOS_SPRINT3.sql),
          confirme que a tabela atendimento_procedimentos 
          possui os campos valor_indicado e valor_cobrado 
          como colunas próprias — e não como foreign key 
          que busca da tabela de procedimentos

[ ] 2.4 — O trigger trg_atend_proc_totais atualiza 
          apenas o total do atendimento (soma dos 
          valor_cobrado dos procedimentos)?
          Confirme que o trigger NÃO sobrescreve os 
          valores individuais com os preços atuais 
          dos serviços cadastrados

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🟡 BLOCO 3 — REVISÃO DO SPRINT 3
     Múltiplos Serviços por Agendamento
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CONTEXTO DO QUE FOI FEITO:
Foi criada a tabela atendimento_procedimentos para 
suportar N serviços por agendamento. O frontend 
(Agenda.jsx) ganhou novos estados e funções:
adicionarServico(), editarServico(), removerServico()
e a função salvar() foi refatorada.

REVISE O CÓDIGO E VERIFIQUE:

─── ESTADOS ────────────────────────────────────────────────────────

[ ] 3.1 — Os dois estados novos existem no componente?
```javascript
          const [servicos, setServicos] = useState([]);
          const [edicaoServico, setEdicaoServico] = useState(null);
```

[ ] 3.2 — CRÍTICO: Quando o modal fecha ou é cancelado,
          esses estados são resetados?
          Procure pela função que fecha o modal e 
          confirme que contém:
          setServicos([])
          setEdicaoServico(null)
          → Se não resetar: ao abrir novo agendamento 
            os serviços do anterior ainda aparecem ❌

─── FUNÇÃO adicionarServico() ──────────────────────────────────────

[ ] 3.3 — A função existe e:
          - Adiciona o serviço ao array servicos
            quando NÃO está em modo edição?
          - ATUALIZA o serviço existente pelo índice
            quando ESTÁ em modo edição (edicaoServico 
            !== null)?
          - Limpa o formulário após adicionar?
          - Reseta edicaoServico para null após editar?

[ ] 3.4 — Há validação que impede adicionar o mesmo 
          procedimento duas vezes na mesma lista?
          Procure por verificação de duplicidade antes 
          do push/spread no array de servicos
          → Se não houver: a constraint do banco vai 
            rejeitar na hora de salvar ❌

[ ] 3.5 — O botão de adicionar só aparece quando 
          há procedimento selecionado E valor preenchido?
          Procure pela condição de renderização do botão

─── FUNÇÃO editarServico(indice) ───────────────────────────────────

[ ] 3.6 — A função preenche o formulário com os dados 
          do serviço no índice recebido:
          - procId (procedimento)?
          - valor_cobrado?
          - comprimento/tamanho (P/M/G)?
          
[ ] 3.7 — A função define setEdicaoServico(indice) 
          para ativar o modo de edição?

[ ] 3.8 — Há algum indicador visual no JSX que mostra 
          ao usuário que está em modo de edição?
          (label, borda, texto no botão, etc)

─── FUNÇÃO removerServico(indice) ──────────────────────────────────

[ ] 3.9 — A função remove o item correto do array?
          Confirme que usa filter por índice ou similar
          e NÃO remove o item errado

[ ] 3.10 — Se o serviço sendo removido é o mesmo 
           que está em edição (edicaoServico === indice),
           a função reseta o modo de edição?

[ ] 3.11 — Após remover, os índices dos itens restantes 
           continuam corretos?
           (risco: usar índices mutáveis como key no map)

─── FUNÇÃO salvar() REFATORADA ─────────────────────────────────────

[ ] 3.12 — A função salvar foi refatorada para:
           1. Primeiro criar o atendimento base
           2. Depois iterar sobre o array servicos
           3. Inserir cada item em atendimento_procedimentos
              com o campo sequencia (1, 2, 3...)

[ ] 3.13 — Há tratamento de erro (try/catch) cobrindo 
           toda a operação?
           Se falhar ao inserir o 2º procedimento, 
           o que acontece com o atendimento já criado?
           → Ideal: rollback ou exclusão do atendimento 
             se qualquer insert falhar

[ ] 3.14 — O botão de confirmar está desabilitado 
           (disabled) quando o array servicos está vazio?
           Procure no JSX do botão pela condição:
           disabled={servicos.length === 0}

[ ] 3.15 — O texto do botão exibe o contador dinâmico?
           Ex: "CONFIRMAR AGENDAMENTO (N SERVIÇOS)"
           onde N é servicos.length

[ ] 3.16 — O card de resumo de totais calcula a soma 
           corretamente?
           Procure pelo reduce ou sum do array servicos
           e confirme que usa valor_cobrado de cada item

─── ARQUIVO SQL DA MIGRAÇÃO ────────────────────────────────────────

[ ] 3.17 — Abra o arquivo 
           /docs/sql/MIGRATION_MULTIPLOS_SERVICOS_SPRINT3.sql
           e confirme que contém:
           - CREATE TABLE atendimento_procedimentos
           - CREATE FUNCTION atualizar_totais_atendimento
           - CREATE TRIGGER trg_atend_proc_totais
           - CREATE VIEW v_atendimentos_completo
           - INSERT INTO atendimento_procedimentos 
             (migração dos dados antigos)

[ ] 3.18 — A migração de dados antigos está correta?
           Procure pelo bloco que migra atendimentos 
           existentes (com procedimento_id) para 
           a nova tabela e confirme que os campos 
           valor_indicado e valor_cobrado são 
           copiados corretamente

[ ] 3.19 — O trigger cobre os três eventos?
           AFTER INSERT, UPDATE e DELETE em 
           atendimento_procedimentos

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🟡 BLOCO 4 — REVISÃO DO SPRINT 4
     Centralização do Conteúdo da Tela de Agenda
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CONTEXTO DO QUE DEVERIA TER SIDO FEITO:
O conteúdo da tela de Agenda estava deslocado para o 
lado direito. Deveria ter sido corrigido o layout para 
centralizar horizontalmente sem quebrar outras telas.

REVISE O CÓDIGO E VERIFIQUE:

[ ] 4.1 — Localize o componente/página da Agenda
          e o container principal que envolve o conteúdo.
          Quais propriedades CSS foram alteradas?
          Anote exatamente o que foi modificado.

[ ] 4.2 — A correção usa uma das abordagens corretas?
          - margin: 0 auto com width/max-width definido
          - flexbox: justify-content: center no pai
          - grid: place-items center ou similar
          → Se usou margin-left ou position: relative 
            com valores fixos: solução frágil ⚠️

[ ] 4.3 — A correção está em um arquivo de estilo 
          específico da Agenda ou em um estilo global?
          → Se alterou estilo GLOBAL: verificar se 
            não quebrou outras telas do sistema

[ ] 4.4 — Faça uma busca pelas outras páginas do projeto.
          Alguma delas herdou a alteração de CSS e 
          ficou com o layout quebrado?
          Verifique especialmente páginas com sidebar 
          ou menu lateral.

[ ] 4.5 — O layout da Agenda está correto em 
          diferentes breakpoints?
          Verifique as media queries:
          - Desktop: conteúdo centralizado com 
            largura máxima adequada
          - Mobile: conteúdo ocupa largura total 
            sem overflow horizontal

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🟢 BLOCO 5 — REVISÃO DO SPRINT 5
     Modal de Confirmação ao Mover Agendamento
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CONTEXTO DO QUE DEVERIA TER SIDO FEITO:
O alert/confirm nativo do browser ao mover um agendamento 
("adm-salao.vercel.app diz: Mover para LARISSA às 09:00")
deveria ter sido substituído por um modal customizado 
estilizado com título, mensagem dinâmica e botões estilizados.

REVISE O CÓDIGO E VERIFIQUE:

[ ] 5.1 — Faça uma busca global no projeto por:
          window.confirm(
          confirm(
          → Se ainda existir algum confirm() nativo 
            relacionado a mover agendamento: não foi 
            implementado ❌

[ ] 5.2 — Existe um componente de modal customizado 
          para a confirmação de mover agendamento?
          Pode ser:
          - Componente próprio (ex: ModalMoverAgendamento)
          - Reutilização de um Modal já existente 
            no projeto com props específicas

[ ] 5.3 — O modal recebe e exibe dados dinâmicos?
          Procure no código se as seguintes informações 
          são passadas dinamicamente para o modal:
          - Nome do cliente do agendamento
          - Horário de destino
          → Se o texto for fixo/hardcoded: BUG ❌

[ ] 5.4 — O modal possui os dois botões funcionais?
          - Botão confirmar: chama a função que 
            de fato move o agendamento
          - Botão cancelar: fecha o modal sem mover nada
          Confirme que ambos têm seus onClick corretos

[ ] 5.5 — O modal foi implementado inline no componente 
          da Agenda ou como componente separado 
          e reutilizável?
          → Componente separado é preferível ✅
          → Inline em um componente grande dificulta 
            manutenção ⚠️

[ ] 5.6 — Se o projeto já tinha um componente Modal 
          reutilizável: ele foi reaproveitado ou foi 
          criado um novo do zero?
          → Se criou novo sem necessidade: duplicação 
            de código ⚠️

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚙️ BLOCO 6 — REVISÃO TÉCNICA GERAL DO CÓDIGO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[ ] 6.1 — CONSOLE.LOG DE DEBUG
          Faça busca global por console.log no projeto.
          Há logs de debug esquecidos no código?
          (ex: console.log("servicos:", servicos) 
               console.log("payload:", payload))
          → Devem ser removidos antes de produção

[ ] 6.2 — TRATAMENTO DE ERROS
          Nas funções que fazem chamadas ao Supabase/API,
          todas possuem try/catch?
          Quando um erro ocorre, o usuário vê algum 
          feedback (toast de erro, mensagem)?
          Ou o erro é silencioso e o usuário fica 
          sem saber o que aconteceu?

[ ] 6.3 — ESTADOS DE LOADING
          Nas operações de salvar agendamento, há um 
          estado de loading que desabilita o botão 
          enquanto a requisição está em andamento?
          → Se não houver: múltiplos cliques podem 
            criar agendamentos duplicados ❌

[ ] 6.4 — CAMPOS OBRIGATÓRIOS
          Na função salvar, há validação de todos 
          os campos obrigatórios antes de enviar 
          para o banco?
          - Cliente selecionado?
          - Pelo menos 1 serviço na lista?
          - Valor > 0 em cada serviço?
          → Liste o que está e o que está faltando

[ ] 6.5 — RESET DE ESTADO APÓS SALVAR
          Após salvar com sucesso, o estado completo 
          do formulário é resetado?
          Procure todos os useState do formulário e 
          confirme que são zerados após o sucesso

[ ] 6.6 — KEYS NO MAP
          No card de serviços adicionados, o .map() 
          usa uma key única e estável para cada item?
          → Usar o índice como key (key={index}) 
            causa bugs ao reordenar/remover ⚠️
          → Ideal: usar um id único gerado no momento 
            de adicionar o serviço à lista

[ ] 6.7 — INTEGRAÇÃO ENTRE SPRINTS
          Faça uma busca por todos os lugares que 
          fazem INSERT ou UPDATE na tabela de 
          atendimentos/agendamentos.
          Em TODOS eles os campos valor_indicado 
          e valor_cobrado são enviados corretamente?
          → Se algum INSERT não envia esses campos: 
            dados incompletos no banco ❌

[ ] 6.8 — QUERIES DOS RELATÓRIOS
          Localize todos os arquivos que calculam:
          - Lucro Possível
          - Lucro Real
          - Faturamento
          - Lucro Líquido
          - Resultado
          Em TODOS eles, confirme qual campo está 
          sendo usado para cada cálculo e se está 
          correto conforme definido na Sprint 1

[ ] 6.9 — CÓDIGO MORTO
          Após as refatorações das sprints, restou 
          algum código que não é mais usado?
          (funções antigas, imports não usados, 
          states que não são mais referenciados)
          → Liste o que encontrar para limpeza

[ ] 6.10 — CONSISTÊNCIA DE NOMENCLATURA
           Os campos valor_indicado e valor_cobrado 
           são chamados pelo mesmo nome em todo o 
           projeto (frontend e SQL)?
           → Se o frontend usa "valorIndicado" e o SQL 
             usa "valor_indicado": pode haver bug de 
             mapeamento ❌

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 BLOCO 7 — RELATÓRIO FINAL DA REVISÃO DE CÓDIGO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Após revisar todos os blocos, gere o relatório 
neste formato:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RELATÓRIO DE REVISÃO DE CÓDIGO
Projeto: Salão Secreto
Data: [data]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ APROVADO — implementado e correto:
→ [Sprint X] [descrição do item]
   Arquivo: [caminho/arquivo.jsx]
   Trecho: [linha ou função relevante]

❌ REPROVADO — bug ou implementação incorreta:
→ [Sprint X] [descrição do problema]
   Arquivo: [caminho/arquivo.jsx]
   Linha/função: [localização exata]
   Problema: [o que está errado]
   Impacto: [o que isso causa para o usuário/dados]
   Correção: [o que deve ser feito]

⚠️ ATENÇÃO — funciona mas pode causar problema:
→ [Sprint X] [descrição]
   Arquivo: [caminho]
   Risco: [descrição do risco]
   Sugestão: [melhoria recomendada]

🧹 LIMPEZA — código morto ou desnecessário:
→ Arquivo: [caminho]
   O que remover: [descrição]

📊 PONTUAÇÃO POR SPRINT:
   Sprint 1 (Valor manual):      [X/10 itens OK]
   Sprint 2 (Imutabilidade):     [X/4 itens OK]
   Sprint 3 (Multi-serviços):    [X/19 itens OK]
   Sprint 4 (Centralizar):       [X/5 itens OK]
   Sprint 5 (Modal mover):       [X/6 itens OK]
   Revisão técnica geral:        [X/10 itens OK]
   ─────────────────────────────────────────────
   TOTAL: [X/54 itens] ([%]%)

🔴 BLOQUEADORES (corrigir antes de qualquer deploy):
   1. [item crítico]
   2. [item crítico]

🟡 MELHORIAS (corrigir em breve, não bloqueia):
   1. [item]
   2. [item]

STATUS FINAL DO CÓDIGO:
   ✅ APROVADO — código está correto e consistente
   ou
   ❌ REPROVADO — há problemas que precisam de 
      correção antes de considerar as sprints 
      como concluídas
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

REGRA FINAL:
Não marque nenhum item como aprovado sem ter lido 
o código de fato. Se um arquivo não existir ou 
não for encontrado, marque como 
"❌ NÃO ENCONTRADO — possível não implementado"
e descreva o que estava buscando.