# TRIGGERS E FUNÇÕES — Salão Secreto V8

---

## TRIGGERS

### `trg_calcular_atendimento`
- **Tabela:** `atendimentos`
- **Evento:** `BEFORE INSERT OR UPDATE`
- **Função:** `fn_calcular_atendimento()`
- **Regra:** Calcula automaticamente todos os campos financeiros do atendimento a cada inserção ou edição.

### `trg_atend_proc_totais` *(Sprint 3)*
- **Tabela:** `atendimento_procedimentos`
- **Evento:** `AFTER INSERT OR UPDATE OR DELETE`
- **Função:** `atualizar_totais_atendimento()`
- **Regra:** Sincroniza `valor_cobrado` e `valor_pago` do atendimento pai com a soma dos procedimentos filhos.
- **Nota:** Usa `COALESCE(NEW.atendimento_id, OLD.atendimento_id)` — funciona corretamente em DELETE.

### `trg_calc_produto_aplicado`
- **Tabela:** `procedimentos`
- **Evento:** `BEFORE INSERT OR UPDATE`
- **Função:** `fn_calcular_custo_produto_aplicado()`
- **Regra:** Seta `requer_comprimento` automaticamente por categoria:
  - `SERVICO_ESTETICA` → false
  - `SERVICO_CABELO` → true
  - `PRODUTO_APLICADO` → não alterado (fica como definido)

### `trg_*_upd` (família de timestamps)
- **Tabelas:** saloes, perfis_acesso, configuracoes, profissionais, procedimentos, homecare, procedimentos_paralelos, despesas, gastos_pessoais, produtos_catalogo, custos_fixos_itens, assinaturas
- **Evento:** `BEFORE UPDATE`
- **Função:** `fn_atualizar_timestamp()`
- **Regra:** Seta `atualizado_em = now()` automaticamente.

### `on_auth_user_created`
- **Tabela:** `auth.users`
- **Evento:** `AFTER INSERT`
- **Função:** `handle_new_user_salao()`
- **Regra:** Quando um usuário é criado no Auth, cria automaticamente o registro em `perfis_acesso`. Se `cargo = PROPRIETARIO` e `salao_id` não fornecido, cria um novo salão e configura as `configuracoes`.

### `on_auth_user_login_registered`
- **Tabela:** `auth.users`
- **Evento:** `AFTER INSERT`
- **Função:** `fn_registrar_login_gerado()`
- **Regra:** Registra a senha temporária em `logins_gerados` para que o vendedor possa visualizá-la depois.

---

## FUNÇÕES

### `fn_calcular_atendimento()` *(trigger)*
**A função mais crítica do sistema.**

Recebe o registro do atendimento (`NEW`) e recalcula:

```
valor_maquininha = valor_cobrado * taxa_maquininha_pct / 100
custo_fixo       = custo_fixo_por_atendimento (de configuracoes)
custo_variavel   = procedimentos.custo_variavel
valor_profissional = 0 (comissão calculada separadamente)

lucro_liquido  = valor_cobrado - valor_maquininha - custo_fixo - custo_variavel
lucro_possivel = valor_cobrado - custo_fixo - custo_variavel
```

Se `valor_cobrado = 0`, usa o preço tabela do procedimento (preco_p/m/g).
Se `status = CANCELADO`, zera maquininha, profissional e lucros.

> ⚠️ Nota: O trigger usa `procedimento_id` de `atendimentos` para calcular. Com Sprint 3, o `valor_cobrado` do atendimento é a soma dos procedimentos filhos via `trg_atend_proc_totais`. O trigger financeiro ainda roda, mas `valor_cobrado` já chega preenchido pela trigger da Sprint 3, então a linha `if valor_cobrado = 0 then usa tabela` não sobrescreve o valor real.

---

### `atualizar_totais_atendimento()` *(trigger Sprint 3)*

```sql
v_atendimento_id := COALESCE(NEW.atendimento_id, OLD.atendimento_id);

UPDATE atendimentos SET
  valor_cobrado = (SELECT SUM(valor_cobrado) FROM atendimento_procedimentos WHERE atendimento_id = v_atendimento_id),
  valor_pago    = (SELECT SUM(valor_pago)    FROM atendimento_procedimentos WHERE atendimento_id = v_atendimento_id)
WHERE id = v_atendimento_id;
```

---

### `fn_calcular_custo_produto_aplicado()` *(trigger)*
Seta `requer_comprimento` automaticamente baseado na categoria do procedimento.

---

### `fn_atualizar_timestamp()` *(trigger)*
`NEW.atualizado_em = now(); return NEW;`

---

### `fn_deletar_salao(p_salao_id uuid)` *(RPC)*
Soft delete do salão: seta `deletado_em = now()` e `ativo = false`.
Retorna `JSON { sucesso: boolean }`.

---

### `get_email_from_username(p_username text)` *(RPC)*
Busca o email do usuário pelo username no login.
`SECURITY DEFINER` — necessário para acessar `auth.users`.

---

### `handle_new_user_salao()` *(trigger auth)*
Ao criar usuário no Auth:
- Lê `raw_user_meta_data` para obter cargo, salao_id, vendedor_id, username.
- Cria perfil em `perfis_acesso`.
- Se PROPRIETARIO sem salao_id: cria salão + configurações automaticamente.

---

### `fn_registrar_login_gerado()` *(trigger auth)*
Ao criar usuário PROPRIETARIO via Edge Function:
- Registra username + senha temporária em `logins_gerados`.

---

### `fn_gerar_username(p_nome text)` *(auxiliar)*
Sanitiza nome para username: lowercase, espaços → `_`, remove caracteres especiais, limita a 20 chars.

---

### `fn_gerar_senha_aleatoria(length int)` *(auxiliar)*
Gera senha aleatória com chars alfanuméricos + símbolos.
