# BANCO DE DADOS — Salão Secreto V8

Schema real implantado em produção. Fonte de verdade para migrations e desenvolvimento.

---

## ENUMS

| Enum | Valores |
|------|---------|
| `cargo_enum` | `PROPRIETARIO`, `FUNCIONARIO`, `VENDEDOR` |
| `comprimento_enum` | `P`, `M`, `G` |
| `status_enum` | `AGENDADO`, `EXECUTADO`, `CANCELADO` |
| `categoria_enum` | `SERVICO_CABELO`, `PRODUTO_APLICADO`, `SERVICO_ESTETICA` |
| `tipo_despesa_enum` | `ALUGUEL`, `ENERGIA`, `AGUA`, `INTERNET`, `MATERIAL`, `EQUIPAMENTO`, `FORNECEDOR`, `FUNCIONARIO`, `OUTRO`, `PRODUTO` |
| `status_assinatura_enum` | `TRIAL`, `ATIVA`, `SUSPENSA`, `CANCELADA`, `EXPIRADA` |

---

## TABELAS NÚCLEO

### `saloes`
Tenant raiz. Cada salão é um tenant isolado.

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | uuid PK | uuid_generate_v4() |
| `nome` | text | default 'Meu Salão' |
| `nome_proprietaria` | text | nullable |
| `telefone` | text | nullable |
| `vendedor_id` | uuid FK → auth.users | on delete set null |
| `configurado` | boolean | default false |
| `ativo` | boolean | default true |
| `deletado_em` | timestamptz | null = ativo, soft delete |
| `criado_em` | timestamptz | |
| `atualizado_em` | timestamptz | trigger auto |

Índices: `idx_saloes_vendedor(vendedor_id)`

---

### `perfis_acesso`
Mapeamento entre usuário Auth e salão + cargo.

| Coluna | Tipo | Notas |
|--------|------|-------|
| `auth_user_id` | uuid PK FK → auth.users | on delete cascade |
| `salao_id` | uuid FK → saloes | on delete cascade |
| `cargo` | cargo_enum | default PROPRIETARIO |
| `username` | text | para login por username |
| `criado_em` | timestamptz | |
| `atualizado_em` | timestamptz | trigger auto |

Índices: `idx_perfis_username(username)`

---

### `configuracoes`
1:1 com salão. Parâmetros financeiros globais.

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | uuid PK | |
| `salao_id` | uuid unique FK → saloes | on delete cascade |
| `custo_fixo_por_atendimento` | numeric(10,2) | default 29.00 |
| `taxa_maquininha_pct` | numeric(5,2) | default 5.00 |
| `prolabore_mensal` | numeric(10,2) | default 0 |
| `qtd_atendimentos_mes` | integer | default 100 |
| `margem_lucro_desejada_pct` | numeric(5,2) | default 20.00 |

---

## TABELAS OPERACIONAIS

### `profissionais`
Equipe do salão.

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | uuid PK | |
| `salao_id` | uuid FK → saloes | |
| `nome` | text | check length > 0 |
| `cargo` | cargo_enum | default FUNCIONARIO |
| `salario_fixo` | numeric(10,2) | default 0 |
| `ativo` | boolean | default true |

Constraint: `unique(salao_id, nome)`

---

### `procedimentos`
Catálogo de serviços do salão.

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | uuid PK | |
| `salao_id` | uuid FK → saloes | |
| `nome` | text | |
| `categoria` | categoria_enum | `SERVICO_CABELO` \| `PRODUTO_APLICADO` \| `SERVICO_ESTETICA` |
| `requer_comprimento` | boolean | default true (auto pelo trigger) |
| `preco_p` | numeric(10,2) | preço base (cabelo curto) |
| `preco_m` | numeric(10,2) | nullable, fallback: preco_p * 1.20 |
| `preco_g` | numeric(10,2) | nullable, fallback: preco_p * 1.30 |
| `custo_variavel` | numeric(10,2) | custo do produto/dose |
| `custo_variavel_m` | numeric(10,2) | custo para tamanho M |
| `custo_variavel_g` | numeric(10,2) | custo para tamanho G |
| `ganho_liquido_desejado` | numeric(10,2) | meta de lucro |
| `lucro_desejado_p/m/g` | numeric(10,2) | metas por tamanho |
| `ativo` | boolean | default true |

Constraint: `unique(salao_id, nome)`
Trigger: `trg_calc_produto_aplicado` — seta `requer_comprimento` automaticamente por categoria.

---

### `atendimentos`
Coração do sistema. Agenda + financeiro.

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | uuid PK | |
| `salao_id` | uuid FK → saloes | |
| `data` | date | |
| `horario` | time | |
| `profissional_id` | uuid FK → profissionais | on delete set null |
| `procedimento_id` | uuid FK → procedimentos | on delete set null — backward compat |
| `comprimento` | comprimento_enum | P/M/G |
| `cliente` | text | |
| `valor_cobrado` | numeric(10,2) | calculado pelo trigger ou soma da trigger Sprint 3 |
| `valor_pago` | numeric(10,2) | default 0 |
| `valor_pendente` | numeric(10,2) | GENERATED: valor_cobrado - valor_pago |
| `valor_maquininha` | numeric(10,2) | calculado pelo trigger |
| `valor_profissional` | numeric(10,2) | calculado pelo trigger |
| `custo_fixo` | numeric(10,2) | calculado pelo trigger |
| `custo_variavel` | numeric(10,2) | calculado pelo trigger |
| `lucro_liquido` | numeric(10,2) | calculado pelo trigger |
| `lucro_possivel` | numeric(10,2) | calculado pelo trigger |
| `status` | status_enum | default AGENDADO |
| `obs` | text | nullable |

Índices: `idx_atend_salao_data(salao_id, data)` onde status <> CANCELADO, `idx_atend_salao_proc(salao_id, procedimento_id)`

---

### `atendimento_procedimentos` *(Sprint 3)*
Tabela de junção: 1 atendimento → N procedimentos.

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | uuid PK | |
| `atendimento_id` | uuid FK → atendimentos | on delete cascade |
| `procedimento_id` | uuid FK → procedimentos | on delete restrict |
| `comprimento` | comprimento_enum | nullable |
| `valor_indicado` | numeric(10,2) | preço tabela no momento do agendamento |
| `valor_cobrado` | numeric(10,2) | valor real cobrado (editável) |
| `valor_pago` | numeric(10,2) | default 0 |
| `valor_pendente` | numeric(10,2) | GENERATED: valor_cobrado - valor_pago |
| `sequencia` | integer | ordem de execução, default 1 |
| `criado_em` | timestamptz | |
| `atualizado_em` | timestamptz | |

Constraint: `unique(atendimento_id, procedimento_id)`, `chk_valores_pos`
Trigger: `trg_atend_proc_totais` — sincroniza totais no atendimento pai

---

### `despesas`
Gastos operacionais do salão.

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | uuid PK | |
| `salao_id` | uuid FK → saloes | |
| `data` | date | |
| `descricao` | text | |
| `tipo` | tipo_despesa_enum | |
| `valor` | numeric(10,2) | |
| `valor_pago` | numeric(10,2) | |
| `valor_pendente` | numeric(10,2) | GENERATED |

---

### `gastos_pessoais`
Pró-labore da dona — contas pessoais mescladas com o salão.

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | uuid PK | |
| `salao_id` | uuid FK → saloes | |
| `descricao` | text | |
| `valor` | numeric(10,2) | check >= 0 |

---

### `homecare`
Venda de produtos para uso em casa.

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | uuid PK | |
| `salao_id` | uuid FK → saloes | |
| `data` | date | |
| `cliente` | text | |
| `produto` | text | |
| `custo_produto` | numeric(10,2) | |
| `valor_venda` | numeric(10,2) | |
| `valor_pago` | numeric(10,2) | |
| `valor_pendente` | numeric(10,2) | GENERATED |
| `lucro` | numeric(10,2) | GENERATED: valor_venda - custo_produto |

---

### `procedimentos_paralelos`
Serviços terceirizados (ex: manicure externa).

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | uuid PK | |
| `salao_id` | uuid FK → saloes | |
| `data` | date | |
| `profissional_id` | uuid FK → profissionais | nullable |
| `descricao` | text | |
| `cliente` | text | |
| `valor` | numeric(10,2) | |
| `valor_pago` | numeric(10,2) | |
| `valor_pendente` | numeric(10,2) | GENERATED |
| `valor_profissional` | numeric(10,2) | |

---

### `clientes`
Cadastro de clientes.

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | uuid PK | |
| `salao_id` | uuid FK → saloes | |
| `nome` | text | check length > 0 |
| `telefone` | text | nullable |

---

### `produtos_catalogo`
Estoque de produtos para composição de custo.

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | uuid PK | |
| `salao_id` | uuid FK → saloes | |
| `nome` | text | |
| `preco_compra` | numeric(10,2) | |
| `qtd_aplicacoes` | integer | |
| `custo_por_uso` | numeric(10,4) | GENERATED: preco_compra / qtd_aplicacoes |
| `ativo` | boolean | |

Constraint: `unique(salao_id, nome)`

---

### `procedimento_produtos`
Composição de custo: quais produtos um procedimento usa.

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | uuid PK | |
| `salao_id` | uuid FK → saloes | |
| `procedimento_id` | uuid FK → procedimentos | |
| `produto_id` | uuid FK → produtos_catalogo | |
| `qtd_por_uso` | numeric(6,2) | |

Constraint: `unique(procedimento_id, produto_id)`

---

### `logins_gerados`
Histórico de credenciais criadas pelo vendedor.

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | uuid PK | |
| `vendedor_id` | uuid FK → auth.users | |
| `salao_id` | uuid FK → saloes | |
| `username` | text | |
| `senha_temporaria` | text | expira em 48h |
| `auth_user_id` | uuid FK → auth.users | |
| `expira_em` | timestamptz | now() + 48h |
| `ativo` | boolean | |

---

### `fechamentos`
Snapshots mensais consolidados.

| Coluna | Tipo | |
|--------|------|-|
| `salao_id` | uuid | |
| `mes` | date | unique por salão |
| `faturamento_bruto` | numeric | |
| `lucro_liquido` | numeric | |
| `lucro_possivel` | numeric | |
| ... | ... | demais totais |

---

### `planos` / `assinaturas` / `pagamentos_assinatura`
Sistema de mensalidade — **atualmente desativado no frontend**, estrutura no banco pronta para ativação futura.
