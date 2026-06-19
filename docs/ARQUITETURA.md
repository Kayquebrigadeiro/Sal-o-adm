# ARQUITETURA DO SISTEMA — V2

O Salão Secreto é uma plataforma SaaS (Software as a Service) focada em **Gestão Financeira e Agendamentos para Salões de Beleza**.
Sua arquitetura é baseada na nuvem, altamente escalável e segura.

## 1. VISÃO GERAL DO PRODUTO

O núcleo da plataforma **não é** apenas uma "agenda". O produto principal é um **Motor Financeiro Inteligente**.
A agenda atua como ferramenta operacional, mas o diferencial competitivo é o faturamento: o sistema calcula o lucro exato, descontando taxas, comissões, custos fixos e variáveis, e apresentando ao proprietário do salão o Lucro Real versus Lucro Possível, para ajudá-lo na tomada de decisão (como preferir recebimentos em dinheiro ou Pix).

## 2. STACK TECNOLÓGICA

### Frontend
- **Framework:** React 18
- **Build Tool:** Vite
- **Estilização:** Tailwind CSS, usando componentes modernos (sem CSS externo ou frameworks complexos desnecessários).
- **Ícones e Gráficos:** Lucide React e Recharts.
- **Deploy:** Vercel ou Netlify (Atualmente com arquivo `vercel.json` e `netlify.toml` prontos).

### Backend (Supabase / BaaS)
- **Banco de Dados:** PostgreSQL (Versão hospedada pelo Supabase).
- **Autenticação:** Supabase Auth (JWT, Row Level Security - RLS).
- **Regras de Negócio e Cálculos:** Tratados em nível de banco de dados via **Triggers** e **Functions (RPCs)**, garantindo a dupla validação de transações e a integridade matemática, independentemente do cliente web.

## 3. ARQUITETURA DE DADOS E ISOLAMENTO (MULTI-TENANT)

O SaaS utiliza uma arquitetura **Multi-Tenant com Esquema Compartilhado**.
- Todas as tabelas principais operam no schema `public` do PostgreSQL.
- A segregação de inquilinos é garantida pelo campo `salao_id`, presente em todas as tabelas (exceto `saloes`, cujo UUID é o tenant).
- **Isolamento RLS:** As *Row Level Security Policies* garantem em nível de kernel do banco que o usuário autenticado (`auth.uid()`) só possa consultar e modificar registros caso pertença ao `salao_id` (verificado via tabela `perfis_acesso`). Nenhuma API consegue extrair dados de outro salão.

## 4. FLUXO DE COMPUTAÇÃO FINANCEIRA

1. O **Frontend** coleta os dados do atendimento (procedimentos selecionados, cliente, comprimento do cabelo, descontos manuais via *Valor Manual*).
2. O Frontend envia a criação do Atendimento para o Banco de Dados.
3. A chamada executa, sempre que possível, transações em lote (via Functions como `inserir_atendimento_completo`) para evitar "Atendimentos Órfãos" (onde o cabeçalho é salvo mas a lista de procedimentos falha).
4. O **PostgreSQL**, através de Triggers associadas nas tabelas (`atendimentos` e `atendimento_procedimentos`), intercepta a inserção/atualização.
5. As Triggers cruzam dados com as `configuracoes` e tabelas de `profissionais` e realizam os cálculos definitivos (taxa de máquina, pro-labore, custos).
6. As Views (`fechamento_mensal`, `ranking_procedimentos`, etc.) agregam e formatam os dados semânticos em tempo real para o consumo do Frontend Dashboard.

## 5. HIERARQUIA DE ACESSO (CARGOS)

| Nível de Acesso  | Responsabilidade e Permissões |
|-----------------|-------------------------------|
| **VENDEDOR** | Acesso ao Painel Adminstrativo da plataforma. Pode gerenciar inquilinos (salões) vinculados a ele, e operar configurações de onboardings (`/admin`). Não possui `salao_id` atrelado no perfil. |
| **PROPRIETARIO** | Gestor máximo de um `salao_id`. Acesso a financeiro completo, relatórios, equipe, agenda e regras de negócio de precificação. |
| **FUNCIONARIO** | Acesso restrito apenas à sua própria agenda e aos procedimentos por ele executados. Não visualiza painel financeiro global do salão. |

## 6. DIRETRIZES TÉCNICAS E BOAS PRÁTICAS

- **Nunca processar lógica financeira exclusiva no Frontend.** Tudo deve ter espelho transacional na Trigger.
- **Evitar deletamentos físicos (Hard Deletes) de recursos financeiros.**
- **Interface e Feedback:** Todas as ações precisam oferecer estado de carregamento (`loading`, `disabled`) e uso de notificações/toastig (`showToast`). Nunca realizar operações destrutivas silenciosas.
