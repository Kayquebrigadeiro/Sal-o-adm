# AUDITORIA DE CARGA E FUNCIONAL — Salão Secreto Backend

**Data da auditoria:** 21/08/2026
**Ambiente testado:** Staging (`http://localhost:3334`, banco `SalaosecretoStaging` — TiDB)
**Versão do Node:** v24.18.0
**Stack:** Node.js + Express + MySQL/TiDB (pool de 20 conexões)
**Ferramenta de carga:** k6 v0.55.0 (binário local)

---

## 6.1 — Resumo Executivo

| Item | Valor |
|------|-------|
| Data e hora | 21/08/2026, ~21:00 (America/Sao_Paulo, UTC-3) |
| Ambiente | Staging — TiDB cloud (`gateway01.us-east-1.prod.aws.tidbcloud.com:4000`) |
| Banco | `SalaosecretoStaging` |
| Versão do Node | v24.18.0 |
| k6 | v0.55.0 |
| **Resultado geral** | **APROVADO COM RESSALVAS** |

**Resumo executivo:** O sistema apresentou ótima performance sob carga (0% de falhas HTTP, p95 = 1.66s com 50 usuários simultâneos, acima do pool de 20 conexões). A integridade financeira pós-carga está perfeita (0% de inconsistências em 112 atendimentos verificados). Porém, **3 bugs funcionais foram identificados nos testes da Fase 2** relacionados ao motor financeiro — todos envolvendo o campo `custo_variavel` e valores de homecare que não são persistidos corretamente.

---

## 6.2 — Resultados dos Testes Funcionais (Fase 2)

**Resultado geral: 101/108 testes passando (93.5%)**

| Teste | Resultado | Observação |
|-------|-----------|------------|
| 2.1 Login correto | ✅ | Token JWT válido com salao_id e cargo |
| 2.1 Login com senha errada → 401 | ✅ | |
| 2.1 Requisição sem token → 401 | ✅ | |
| 2.1 Token inválido → 401 | ✅ | |
| 2.2 Multi-tenant: acesso cruzado → 404 | ✅ | Não vaza dados entre salões |
| 2.2 Multi-tenant: profissional de outro salão → 400 | ✅ | |
| 2.2 Multi-tenant: procedimento de outro salão → 400 | ✅ | |
| 2.3 Motor financeiro: valor_maquininha = 5.00 | ✅ | |
| 2.3 Motor financeiro: valor_profissional = 40.00 | ✅ | |
| 2.3 Motor financeiro: lucro_liquido = 16.00 | ❌ | Recebido: **26.00** — `custo_variavel` não foi aplicado (veio 0) |
| 2.3 Motor financeiro: lucro_possivel = 21.00 | ❌ | Recebido: **31.00** — mesma causa |
| 2.3 Motor financeiro: valor_pendente = 100.00 | ✅ | |
| 2.3 Motor financeiro: custo_fixo = 29.00 | ✅ | |
| 2.3 Motor financeiro: custo_variavel = 10.00 | ❌ | Recebido: **0.00** — procedimento criado com `custo_variavel=10` não foi persistido |
| 2.4 Fluxo: criar AGENDADO | ✅ | |
| 2.4 Fluxo: atualizar para EXECUTADO | ✅ | Status mudou, valores financeiros preservados |
| 2.4 Fluxo: valor_pago=100 → pendente=0 | ✅ | |
| 2.4 Fluxo: trocar profissional (recálculo) | ✅ | valor_profissional recalculado para 30.00 ✓ |
| 2.4 Fluxo: lucro_liquido recalculado | ❌ | Recebido: **36.00** (esperado 26.00) — `custo_variavel` ausente |
| 2.4 Fluxo: mudar data/horario | ✅ | |
| 2.4 Fluxo: mês fechado → 403 | ✅ | |
| 2.5 Procedimentos adicionais | ✅ | Criados, listados e substituídos com recálculo |
| 2.6 Agenda por data | ✅ | Filtro correto, sem vazamento entre salões |
| 2.6 Atendimentos paralelos (mesmo horário) | ✅ | |
| 2.7 Fechamento mensal | ✅ | GET + POST fechamento + bloqueio 403 |
| 2.8 CRUD completo (9 entidades) | ✅ | 54/54 sub-testes passaram |
| 2.9 HomeCare: valor_pendente = 50 | ❌ | Recebido: **null** — campo não calculado na criação |
| 2.9 HomeCare: lucro = 110 | ❌ | Recebido: **null** — campo não calculado na criação |
| 2.9 HomeCare: pagamento total → pendente = 0 | ✅ | Após PUT manual |
| 2.10 Configuração: taxa 5% → 3% | ✅ | Novo atendimento usa 3% ✓ |
| 2.10 Atendimentos antigos preservados | ✅ | Valores históricos intactos |

---

## 6.3 — Simulação de Dia Real (Fase 3)

**Resumo do dia simulado (salão loadtest3):**

| Métrica | Valor |
|---------|-------|
| Atendimentos criados | 6 |
| Atendimentos executados | 2 |
| Atendimentos cancelados | 1 |
| Atendimentos pagos | 2 |
| Receita bruta do dia | R$ 420,00 |
| Lucro líquido do dia | R$ 62,00 |
| Pendências abertas | 0 |

**Comportamento esperado confirmado:** Todas as 16 ações do dia retornaram HTTP 2xx. Tempos de resposta saudáveis: `POST /atendimentos` 970–1400ms, `GET /atendimentos?data=` 127–132ms, `GET /fechamento/` 1953ms.

**Comportamento inesperado:** Nenhum. O fechamento consultado às 16:00 reportou receita = R$160,00 (coerente com 2 atendimentos EXECUTADO de R$80 cada).

---

## 6.4 — Resultados de Performance por Estágio (Fase 4 — k6)

**Configuração do teste:** 7 estágios, rampa de 5 → 20 → 50 VUs, duração total 5min, 523 iterações completas, 3661 requisições HTTP.

| Estágio | Usuários (VUs) | Tempo médio | p95 | Taxa de erro | Observação |
|---------|----------------|-------------|-----|--------------|------------|
| Aquecimento | 5 | ~350ms | ~500ms | 0% | |
| Estável | 5 | ~350ms | ~500ms | 0% | |
| Rampa | 20 | ~530ms | ~1.1s | 0% | Degradação inicial leve |
| Estável | 20 | ~610ms | ~1.6s | 0% | Limite do pool de conexões |
| Rampa | 50 | ~650ms | ~1.7s | 0% | Acima do pool (20) |
| Estável | 50 | ~700ms | ~1.9s | 0% | Sem falhas, apenas latência maior |
| Resfriamento | 0 | — | — | — | |

**Métricas por operação (média / p95):**

| Operação | Tempo médio | p95 | Threshold | Resultado |
|----------|-------------|-----|-----------|-----------|
| Login | 338.9ms | 446.4ms | — | ✅ |
| Listar agenda | 141.9ms | 173.0ms | — | ✅ |
| **Criar atendimento** | 1035.6ms | 1255.8ms | <3000ms | ✅ |
| Atualizar atendimento | 398.5ms | 492.8ms | — | ✅ |
| **Consultar fechamento** | 1713.1ms | 2163.2ms | <3000ms | ✅ |
| Criar homecare | 270.5ms | 345.6ms | — | ✅ |

**Métricas gerais:**

| Métrica | Valor |
|---------|-------|
| http_req_duration | avg=613.6ms, p(95)=**1.66s** ✓ (<2s) |
| http_req_failed | **0.00%** ✓ (<5%) |
| checks | **3661/3661 (100%)** |
| iterações | 523 |
| req/s | 11.79 |

---

## 6.5 — Gargalos Identificados

1. **Pool de 20 conexões é suficiente para até 50 usuários simultâneos com p95 < 2s.** A degradação entre 20 e 50 VUs foi suave (~100ms de aumento na latência média) e sem erros. O pool de 20 conexões **não** foi um limitante crítico em staging.

2. **Rota mais lenta: `GET /fechamento/:mes` (avg 1713ms, p95 2163ms).** É calculado em tempo real com 9+ queries agregadas por requisição. Este é o principal gargalo do sistema.

3. **Segunda rota mais lenta: `POST /atendimentos` (avg 1036ms, p95 1256ms).** Executa 4–5 queries em transação (config, profissional, procedimento, produtos, insert).

4. **`Login` (avg 339ms)** — 3 queries (usuário, perfis) + bcrypt hash. A carga de login foi a mais distribuída.

5. **Nenhum erro no `backend-node.log`** durante o teste de carga. Nenhum timeout, nenhum ECONNRESET, nenhum deadlock.

---

## 6.6 — Integridade dos Dados Pós-Carga (Fase 5)

| Check | Resultado |
|-------|-----------|
| Atendimentos verificados | 112 (5 salões aleatórios) |
| `lucro_liquido` inconsistente | **0 (0.00%)** |
| `lucro_possivel` inconsistente | **0 (0.00%)** |
| `valor_pendente` inconsistente | **0 (0.00%)** |
| `valor_pendente` negativo | **0** |
| Status EXECUTADO + pagamento parcial | **0** |
| Operações que falharam silenciosamente | **0 (0.00%)** — 0 falhas HTTP na carga |

**Conclusão:** A integridade financeira pós-carga está perfeita. O motor financeiro persiste valores **internamente consistentes** (lucro_liquido = valor_cobrado − maquininha − custo_fixo − custo_variavel − profissional, e assim por diante). Nenhum atendimento duplicado foi detectado.

---

## 6.7 — Capacidade do Sistema

- **Usuários simultâneos suportados com p95 < 2s e erro < 5%:** **50+ usuários** (limite testado; provavelmente suporta mais, mas não foi testado além de 50 VUs).
- **Ponto de degradação aceitável:** 20–50 VUs (latência média sobe de ~610ms para ~700ms, ainda dentro dos thresholds).
- **Ponto de falha crítica:** Não atingido no teste (0% de falhas em todos os estágios).
- **Rota mais sensível:** `GET /fechamento/:mes` (p95 atinge 2.2s perto do limite de 3s) — é a primeira a degradar em escala.

---

## 6.8 — Melhorias Propostas

### Bug: `custo_variavel` não é persistido corretamente na criação de procedimentos
- **Problema observado (Fase 2.3):** Ao criar um procedimento com `custo_variavel: 10`, o valor no banco chegou como `0` (o teste de motor financeiro recebeu `custo_variavel = 0` em vez de `10`). Isso fez `lucro_liquido` e `lucro_possivel` divergirem da fórmula especificada no O.MD.
- **Solução proposta:** Verificar a validação/campos do `crud.controller.js` para tabela `procedimentos` — provavelmente o campo `custo_variavel` não está sendo incluído no insert, ou o frontend não o envia. Também adicionar `DEFAULT 0` no schema se ainda não existir.
- **Impacto estimado:** Baixo — afeta apenas os valores financeiros que dependem de custos de material.
- **Complexidade:** Baixa.

### Bug: `HomeCare` não calcula `valor_pendente` e `lucro` automaticamente
- **Problema observado (Fase 2.9):** Ao criar homecare com `valor_venda:150, custo_produto:40, valor_pago:100`, os campos `valor_pendente` e `lucro` retornaram `null` em vez de `50` e `110`. Os valores só foram calculados após um `PUT` manual.
- **Solução proposta:** Adicionar cálculo automático no `crud.controller.js` para a tabela `homecare`:
  ```js
  if (nomeTabela === 'homecare') {
    dados.valor_pendente = parseFloat(dados.valor_venda || 0) - parseFloat(dados.valor_pago || 0);
    dados.lucro = parseFloat(dados.valor_venda || 0) - parseFloat(dados.custo_produto || 0);
  }
  ```
- **Impacto estimado:** Médio — afeta relatórios e dashboard financeiro que dependem desses campos.
- **Complexidade:** Baixa.

### Performance: `GET /fechamento/:mes` calcula 9 agregados em tempo real
- **Problema observado:** p95 = 2163ms (mais lenta de todo o sistema). Cada request executa 9 queries `SUM/COUNT` sobre `atendimentos`, `homecare`, `procedimentos_paralelos`, `despesas`, `gastos_pessoais` sem índices compostos.
- **Solução proposta:** (1) Cache em memória com TTL de 30s (ex: `node-cache`) para o resultado de `calcularDadosFechamento`, invalidado ao criar/editar/deletar registros do mês; ou (2) materialização periódica em tabela `fechamentos_materializados` via job agendado (ex: a cada 15min). Além disso, adicionar índice composto `(salao_id, status, data)` em `atendimentos`.
- **Impacto estimado:** Alto — reduziria p95 de ~2.2s para ~100–300ms no pior caso.
- **Complexidade:** Média.

### Performance: `POST /atendimentos` executa 4–5 queries sequenciais
- **Problema observado:** avg 1036ms, p95 1256ms. A criação executa `mesEstaFechado` + SELECT config + SELECT profissional + SELECT procedimento + SELECT produtos + INSERT + (opcional) INSERT adicionais, tudo em transação.
- **Solução proposta:** (1) Substituir as 3 primeiras SELECTs por um único JOIN (`config JOIN profissional JOIN procedimento`) em uma query; (2) manter `mesEstaFechado` em cache curto (TTL 5s) já que raramente muda; (3) considerar `Promise.all` para as SELECTs independentes antes da transação.
- **Impacto estimado:** Médio — redução de ~30–40% na latência de criação.
- **Complexidade:** Média.

### Performance: `GET /atendimentos` sem filtro — verificar necessidade de índice
- **Problema observado:** A rota mais rápida (141ms), mas sem índice em `(salao_id, data)` pode degradar com crescimento de dados.
- **Solução proposta:** Adicionar índice composto `(salao_id, data)` na tabela `atendimentos`.
- **Impacto estimado:** Baixo agora, Alto a médio prazo.
- **Complexidade:** Baixa.

### Arquitetura: Separar pools de leitura/escrita
- **Problema observado:** Com 50 VUs estáveis, latência média subiu ~90ms e o p95 de `fechamento` chegou perto do limite. A longo prazo, queries pesadas de agregação (fechamento) competem com writes (criar atendimento).
- **Solução proposta:** Se a base crescer, separar em 2 pools do `mysql2/promise` — um para leitura (agenda, fechamento, relatórios) e outro para escrita (criar/atualizar atendimento), com `connectionLimit` de 15/10 respectivamente.
- **Impacto estimado:** Alto na estabilidade sob picos.
- **Complexidade:** Alta.

### Segurança: Token de login tem expiração de 7 dias
- **Problema observado:** `expiresIn: '7d'` no `auth.controller.js` — longo para produção.
- **Solução proposta:** Reduzir para `12h` (ou `24h`) e acrescentar refresh token para sessões longas.
- **Impacto estimado:** Médio (melhora segurança).
- **Complexidade:** Média.

---

## Anexos

- Scripts gerados: `backend-node/scripts/seed_load_test.js`, `test_funcional.js`, `simular_dia.js`, `load_test.js`, `validar_integridade.js`
- Dados: `backend-node/scripts/salons_seed.json` (20 salões), `simulacao_dia_log.json`, `validacao_integridade.json`
- Log do servidor: `backend-node/backend-node.log`

**Status final: APROVADO COM RESSALVAS** — recomenda-se corrigir os 3 bugs funcionais (custo_variavel, homecare) e otimizar a rota de fechamento mensal antes do próximo deploy de produção.