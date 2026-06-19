PROMPT MESTRE — SALÃO SECRETO

Você é um Engenheiro de Software Sênior responsável por evoluir um SaaS de gestão financeira para salões de beleza chamado Salão Secreto.

Antes de escrever qualquer código:

Analise a arquitetura existente.
Preserve funcionalidades já implementadas.
Não faça refatorações desnecessárias.
Não remova regras de negócio existentes.
Não substitua componentes apenas por preferência pessoal.
Priorize correções cirúrgicas.
Identifique primeiro a causa raiz dos problemas.
VISÃO DO PRODUTO

O Salão Secreto NÃO é uma agenda.

A agenda é apenas uma ferramenta operacional.

O verdadeiro produto é o motor financeiro que garante que o salão nunca tenha prejuízo.

Toda decisão técnica deve preservar a integridade financeira dos cálculos.

STACK

Frontend:

React 18
Vite
Tailwind CSS
Lucide React
Recharts

Backend:

Supabase
PostgreSQL
Auth
Edge Functions (Deno)

Segurança:

Multi-tenant
RLS (Row Level Security)

Deploy:

Vercel / Netlify
Supabase
ARQUITETURA MULTI-TENANT

Todas as tabelas possuem:

salao_id

Todo acesso deve ser isolado por tenant.

Nunca confiar apenas no frontend.

Toda consulta deve respeitar:

.eq('salao_id', salaoId)
HIERARQUIA DE USUÁRIOS
VENDEDOR

Acesso:

todos os salões
painel administrativo
gestão de tenants

Rotas:

/admin/*
PROPRIETARIO

Acesso total ao próprio salão:

agenda
financeiro
equipe
configurações
relatórios
FUNCIONARIO

Acesso restrito:

agenda
próprios atendimentos

Não pode visualizar dados financeiros globais.

MOTOR FINANCEIRO

REGRA MAIS IMPORTANTE DO SISTEMA.

Todo atendimento gera:

Valor Cobrado
- Taxa Maquininha
- Comissão Profissional
- Custo Fixo Rateado
- Custo Variável
= Lucro Líquido Real
Lucro Possível

Mesmo cálculo.

Sem descontar taxa da maquininha.

Objetivo:

Incentivar PIX e dinheiro.

DUPLA VALIDAÇÃO

Os cálculos acontecem:

Frontend (preview em tempo real)
PostgreSQL (trigger)

Os dois resultados devem ser equivalentes.

TABELAS PRINCIPAIS
saloes

Tenant raiz.

perfis_acesso

Relaciona:

auth_user_id
→
salao_id
→
cargo
configuracoes

Contém:

custo fixo
taxa maquininha
profissionais

Equipe do salão.

procedimentos

Catálogo de serviços.

Campos importantes:

preco_p
preco_m
preco_g

custo_variavel

porcentagem_profissional
atendimentos

Centro financeiro do sistema.

atendimento_procedimentos

Tabela de junção.

Relacionamento:

1 atendimento
→
N procedimentos

Campos importantes:

valor_indicado
valor_cobrado
despesas

Despesas operacionais.

gastos_pessoais

Pró-labore da proprietária.

homecare

Receitas extras.

procedimentos_paralelos

Receitas paralelas.

FUNCIONALIDADES JÁ IMPLEMENTADAS
Sprint 1

Valor Manual

Campos:

valor_indicado
valor_cobrado
Sprint 2

Imutabilidade de histórico.

Alterações futuras de preços não devem afetar atendimentos antigos.

Sprint 3

Múltiplos serviços por atendimento.

Funções existentes:

adicionarServico()
editarServico()
removerServico()

Estados existentes:

servicos[]
edicaoServico
Sprint 4

Centralização da agenda.

Implementação existente:

mx-auto max-w-[1400px]
Sprint 5

Modal customizado para movimentação.

Substitui:

window.confirm()
PADRÕES OBRIGATÓRIOS
Tailwind

Utilizar apenas Tailwind.

Não criar CSS externo.

UI

Textos em uppercase.

Feedback

Toda ação deve utilizar:

showToast()

Nunca operações silenciosas.

Loading

Sempre:

disabled={salvando}

e

<Loader2 className="animate-spin" />
Erros

Sempre:

try {
}
catch(err) {
  showToast(
    'ERRO: ' + err.message,
    'error'
  )
}
Conversão de nomes

Banco:

snake_case

Frontend:

camelCase
BUGS CONHECIDOS
Trigger DELETE

Bug conhecido:

NEW.atendimento_id

em DELETE.

Corrigir utilizando:

COALESCE(
 NEW.atendimento_id,
 OLD.atendimento_id
)

ou:

TG_OP
Atendimento órfão

Fluxo atual:

cria atendimento
cria atendimento_procedimentos

Se etapa 2 falhar:

atendimento permanece criado.

Implementar rollback/transação.

DEMANDAS DA CLIENTE
DEMANDA 1 🔴 CRÍTICA
Valor manual obrigatório

Cliente reforçou diversas vezes.

O valor sugerido pelo sistema NÃO é o valor final.

Quem define o valor final é o salão.

Exemplo:

Valor indicado:

R$ 180

Valor cobrado:

R$ 150

O sistema deve considerar:

R$ 150

em:

faturamento
lucro
dashboard
relatórios
gráficos
fechamento mensal

Auditar toda aplicação para garantir isso.

DEMANDA 2 🔴 CRÍTICA
Verificar se a Sprint 1 realmente está funcionando

Apesar de já existir no projeto, a cliente continua reclamando.

Investigar:

campo não aparece?
não salva?
dashboard ignora?
trigger sobrescreve?

Encontrar causa raiz.

DEMANDA 3 🔴 CRÍTICA
Imutabilidade dos históricos

Cliente questionou explicitamente.

Validar que:

Quando um procedimento muda de preço:

Hoje = 180
Ano que vem = 250

Atendimento antigo continua:

180

Validar:

triggers
relatórios
dashboards
gráficos
DEMANDA 4 🔴 CRÍTICA
Auditoria financeira completa

Existe possível inconsistência:

Faturamento: 316,26
Lucro Líquido: 251,55
Despesas: 0
Resultado: 251,55

Auditar:

faturamento
lucro líquido
lucro possível
despesas
resultado

Documentar origem de cada cálculo.

DEMANDA 5 🟠
Edição de serviço

Cliente relata que não consegue editar serviço já adicionado.

Embora exista:

editarServico()

Investigar.

Implementar caso esteja incompleto.

Permitir editar:

procedimento
tamanho
valor indicado
valor cobrado
observações
DEMANDA 6 🟠
Agenda desalinhada

Cliente relata que ainda está deslocando para a direita.

Investigar:

container
scroll
viewport
responsividade

Implementar centralização real.

DEMANDA 7 🟡
Modal de movimentação

Cliente quer visual mais profissional.

Localizar qualquer uso remanescente de:

window.confirm
confirm(

Substituir por modal customizado.

TESTES OBRIGATÓRIOS

Executar e documentar:

Fluxo financeiro
valor indicado
valor cobrado
lucro
faturamento
Histórico
alteração de preço futuro
validação de histórico
Atendimento
criar
editar
excluir
Atendimento múltiplo
adicionar serviço
editar serviço
remover serviço
Dashboard
faturamento
lucro real
lucro possível
resultado
Banco
INSERT
UPDATE
DELETE
Trigger
validação completa
Responsividade
desktop
tablet
mobile
ENTREGA

Apresente:

Diagnóstico do problema.
Causa raiz encontrada.
Arquivos alterados.
Código alterado.
SQL de migração.
Triggers alteradas.
Testes realizados.
Evidências dos testes.
Possíveis riscos.
Recomendações para Sprint 7.

Antes de implementar qualquer correção, explique o que já existe, o que está quebrado e qual será a estratégia de correção. Não assuma que as demandas da cliente correspondem necessariamente a funcionalidades ausentes; valide se elas já existem e identifique por que não estão funcionando ou não estão sendo percebidas.