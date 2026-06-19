# MAPA DE TRIGGERS — V2

As Triggers são os alicerces silenciosos que mantêm os cálculos financeiros atualizados e sincronizados.

## 1. ATUALIZAÇÕES GENÉRICAS

### `fn_atualizar_timestamp`
- **Tabelas:** A maioria das tabelas de negócio (`saloes`, `perfis_acesso`, `atendimentos`, etc).
- **Evento:** `BEFORE UPDATE`
- **Propósito:** Mantém o controle de auditoria carimbando a coluna `atualizado_em` com `now()` na modificação de qualquer linha.

## 2. TRIGGERS OPERACIONAIS

### `fn_calcular_custo_produto_aplicado`
- **Tabela:** `procedimentos`
- **Evento:** `BEFORE INSERT OR UPDATE`
- **Propósito:** Se o usuário cadastrar algo na categoria `SERVICO_ESTETICA`, desativa a flag de `requer_comprimento` automaticamente, não deixando a aplicação quebrar na seleção da agenda. Se for `SERVICO_CABELO`, liga o comprimento.

## 3. O NÚCLEO DO MOTOR FINANCEIRO

### `fn_calcular_atendimento`
- **Tabela:** `atendimentos`
- **Evento:** `BEFORE INSERT OR UPDATE`
- **Propósito:** É a função "mágica". Busca as `%` de taxa de maquininha, os valores de Custo Fixo do respectivo Salão na tabela `configuracoes` e insere definitivamente os valores na linha do Atendimento, populando de uma vez só:
  - `valor_maquininha`
  - `custo_fixo`
  - `custo_variavel`
  - `lucro_liquido`
  - `lucro_possivel`
*Condição especial:* Se o status do Atendimento se transformar para `CANCELADO`, zera imediatamente os lucros e despesas de taxa.

### `atualizar_totais_atendimento` (Adicionada na Sprint 3)
- **Tabela:** `atendimento_procedimentos`
- **Evento:** `AFTER INSERT OR UPDATE OR DELETE`
- **Propósito:** Como o serviço agora possui Múltiplos procedimentos, toda vez que um registro filho (`atendimento_procedimentos`) entra, é alterado ou morre, esta Trigger é convocada. Ela soma os valores de todos os procedimentos acoplados àquele atendimento e atira um Update no nó principal (`atendimentos`), retroalimentando a Trigger descrita acima e recodificando todos os cálculos financeiros gerais daquele momento.

## 4. EVENTOS AUTENTICADORES (AUTH)

### `handle_new_user_salao`
- **Tabela:** `auth.users`
- **Evento:** `AFTER INSERT`
- **Propósito:** Quando o Supabase Auth dispara a criação efetiva de um novo Login (seja convite de Proprietário para funcionário, ou Vendedor para salão), esta Trigger gera a estrutura fundamental para a conta não dar erro (Inserindo a entidade do `saloes`, `perfis_acesso` e as `configuracoes` base de Custo Fixo).

### `fn_registrar_login_gerado`
- **Tabela:** `auth.users`
- **Evento:** `AFTER INSERT`
- **Propósito:** Processo seguro onde os Vendedores geram logins temporários blindados no SaaS. Regista logs passíveis de auditoria.
