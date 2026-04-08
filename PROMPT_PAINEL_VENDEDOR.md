# Prompt: Painel Administrativo do Vendedor

## Objetivo
Implementar um painel exclusivo para o vendedor/admin onde ele possa criar salões, cadastrar proprietárias/funcionárias e configurar preços de serviços. Este painel deve contar com login dedicado e navegação clara separada do painel do salão.

---

## Funcionalidades solicitadas

### 1. Tela de Login Exclusiva do Vendedor
- campo separado para identificar se é vendedor/admin
- redirecionamento automático para o painel do vendedor após login
- interfaceidente e diferenciada do login dos proprietários/funcionários
- validação de permissão `role === 'VENDEDOR'`

### 2. Painel Dedicado do Vendedor/Admin
- dashboard com visão geral de todos os salões do vendedor
- menu de navegação próprio do vendedor que não apareça para outros papéis
- sidebar com opções:
  - Meus Salões
  - Proprietárias/Funcionárias
  - Configurações
  - Sair
- indicador visual claro de que é o painel do vendedor

### 3. Cadastro e Gestão de Salões
- formulário para criar novo salão com campos:
  - nome do salão (obrigatório)
  - telefone
  - email
  - endereço (opcional)
  - descrição (opcional)
- listar todos os salões do vendedor
- editar dados do salão
- deletar salão (com confirmação)
- status do salão (ativo/inativo)

### 4. Cadastro de Proprietárias/Funcionárias
- seleção do salão
- formulário para adicionar proprietária com:
  - email (obrigatório, único)
  - nome
  - telefone
  - cargo (PROPRIETARIO ou FUNCIONARIO)
- gerar login automático ou enviar convite por email
- listar proprietárias/funcionárias por salão
- editar cargo/dados
- ativar/desativar usuário

### 5. Cadastro e Configuração de Preços de Serviços/Procedimentos
- seleção do salão
- criar novo procedimento com campos:
  - nome (obrigatório)
  - descrição (opcional)
  - preço padrão (P)
  - preço médio (M) - opcional
  - preço grande (G) - opcional
  - requer_comprimento (sim/não)
  - ativo (sim/não)
- listar procedimentos do salão
- editar preços e dados
- deletar procedimento
- ordenação e filtros por categoria

### 6. Navegação Ampla e Clara
- diferenciar visualmente "Painel do Vendedor" de "Painel do Salão"
- menu principal deve indicar:
  - se o usuário é VENDEDOR -> acessa apenas painel do vendedor
  - se é PROPRIETARIO/FUNCIONARIO -> acessa painel do salão
- breadcrumb ou indicador de localização atual
- transição clara de contexto entre painéis

---

## Contexto de negócio

- O vendedor é o administrador superior que adiciona e configura salões
- Cada salão pode ter múltiplas proprietárias/funcionárias
- O vendedor deve configurar:
  - dados básicos do salão
  - profissionais que trabalham lá
  - procedimentos e preços
  - proprietárias com acesso ao sistema
- Uma vez configurado, o proprietário/funcionário acessa o painel específico do salão
- O fluxo é: Vendedor cria → configura → proprietário usa

---

## Stack tecnológico
- React 18
- Vite
- Tailwind CSS
- React Router DOM
- Supabase (autenticação e banco de dados)
- Lucide React (ícones)

---

## Estrutura de banco de dados esperada

### Tabelas necessárias no Supabase
- `saloes` - informações do salão
- `profissionais` - profissionais do salão
- `procedimentos` - serviços e preços
- `perfis_acesso` - relação user/salão/cargo
- `proprietarias_vendedor` - proprietárias criadas pelo vendedor para um salão

---

## Permissões e Fluxo

1. **Vendedor faz login** → identifica como VENDEDOR → redireciona para painel vendedor
2. **Vendedor cria salão** → novo salão salvo no banco com `vendedor_id`
3. **Vendedor cadastra proprietária** → cria usuário com cargo PROPRIETARIO e associa ao salão
4. **Vendedor configura procedimentos** → preços salvos para aquele salão
5. **Proprietário faz login** → identifica como PROPRIETARIO → redireciona para painel do salão
6. **Funcionário faz login** → identifica como FUNCIONARIO → redireciona para painel do salão

---

## Notas importantes

- A validação de permissão deve ocorrer no login e em cada rota
- O vendedor NÃO deve ter acesso às funcionalidades do salão (agenda, despesas, etc)
- Cada salão deve ser isolado por `salao_id`
- O vendedor deve ter visibilidade de todos os seus salões
- Dados sensíveis (preços, configurações) devem estar visíveis apenas para vendedor e proprietário
