# SCHEMA DO BANCO DE DADOS — V2

Esta documentação detalha a estrutura de tabelas, relacionamentos e tipos do ambiente de produção (refletindo o Mapeamento da Versão V8 com as alterações da Sprint 3).

## 1. ENUMS GLOBAIS

- `cargo_enum`: `('PROPRIETARIO', 'FUNCIONARIO', 'VENDEDOR')`
- `comprimento_enum`: `('P', 'M', 'G')`
- `status_enum`: `('AGENDADO', 'EXECUTADO', 'CANCELADO')`
- `categoria_enum`: `('SERVICO_CABELO', 'PRODUTO_APLICADO', 'SERVICO_ESTETICA')`
- `tipo_despesa_enum`: Aluguel, energia, funcionários, outro, etc.
- `status_assinatura_enum`: `('TRIAL', 'ATIVA', 'SUSPENSA', 'CANCELADA', 'EXPIRADA')`

---

## 2. TABELAS NÚCLEO E CONFIGURAÇÕES

### `saloes`
Tabela Raiz (Tenant). Representa a empresa/unidade de negócio.
- `id` (UUID, PK)
- `nome`, `telefone`, `nome_proprietaria` (Textos)
- `vendedor_id` (UUID, FK -> `auth.users`)
- `ativo` (Boolean, default true)

### `perfis_acesso`
Relação de autenticação e autorização por usuário.
- `auth_user_id` (UUID, PK, FK -> `auth.users`)
- `salao_id` (UUID, FK -> `saloes`)
- `cargo` (`cargo_enum`)
- `username` (Text)

### `configuracoes`
Configurações financeiras globais e regras de negócio para o cálculo de despesas fixas. Relacionamento 1:1 com o salão.
- `salao_id` (UUID, Unique, FK -> `saloes`)
- `custo_fixo_por_atendimento` (Numeric, default 29.00)
- `taxa_maquininha_pct` (Numeric, default 5.00)
- `qtd_atendimentos_mes` (Integer, default 100)

---

## 3. TABELAS DE CADASTRO GERAL

### `profissionais`
Colaboradores vinculados ao Salão.
- `id` (UUID, PK)
- `salao_id` (UUID, FK)
- `nome` (Text)
- `cargo` (`cargo_enum`)
- `salario_fixo` (Numeric)

### `procedimentos`
Catálogo de serviços oferecidos pelo Salão (no Frontend frequentemente tratados nas variáveis como `servicos`).
- `id` (UUID, PK)
- `salao_id` (UUID, FK)
- `nome` (Text)
- `categoria` (`categoria_enum`, ex: `SERVICO_CABELO`)
- `requer_comprimento` (Boolean)
- `preco_p`, `preco_m`, `preco_g` (Numeric)
- `custo_variavel` (Numeric, insumos utilizados no serviço)

---

## 4. O CORAÇÃO FINANCEIRO: ATENDIMENTOS

### `atendimentos`
Registro cabecalho que centraliza a agenda e o total financeiro do agendamento.
- `id` (UUID, PK)
- `salao_id` (UUID, FK)
- `data`, `horario`
- `profissional_id` (UUID, FK)
- `cliente` (Text)
- `valor_cobrado` (Numeric)
- `valor_pago` (Numeric)
- `valor_pendente` (Calculated/Stored)
- `valor_maquininha`, `custo_fixo`, `custo_variavel` (Taxas preenchidas pelas triggers)
- `lucro_liquido`, `lucro_possivel` (Variáveis-chave de KPI)
- `status` (`status_enum`, default `AGENDADO`)

### `atendimento_procedimentos`
Tabela de junção 1:N inserida na Sprint 3. Permite que um atendimento tenha múltiplos procedimentos selecionados.
- `id` (UUID, PK)
- `atendimento_id` (UUID, FK, CASCADE)
- `procedimento_id` (UUID, FK, RESTRICT)
- `comprimento` (`comprimento_enum`)
- `valor_indicado` (Numeric)
- `valor_cobrado` (Numeric - *Aceita desconto manual*)
- `valor_pago` (Numeric)
- `sequencia` (Integer)

---

## 5. OUTRAS TABELAS DE FLUXO FINANCEIRO

- **`despesas`**: Operações de saída diversas do caixa geral (Aluguel, luz, etc).
- **`gastos_pessoais`**: Saídas atreladas ao Pró-Labore/Retiradas das proprietárias.
- **`homecare`**: Venda de produtos e cuidados que os clientes levam para casa.
- **`procedimentos_paralelos`**: Serviços realizados por terceiros dentro do salão com porcentagens ou taxas distintas.
- **`produtos_catalogo`** e **`procedimento_produtos`**: Tabelas de controle de insumos e custeio composto para determinar precisamente os valores variáveis dos procedimentos.

---

## 6. ASSINATURAS E PLANOS (V8)
Controlam a monetização da plataforma em si.
- **`planos`**: Nome e valores dos planos de assinatura da plataforma.
- **`assinaturas`**: Controle de trial e status de ativação do SaaS do cliente.
- **`pagamentos_assinatura`**: Histórico de recibos do gateway.
