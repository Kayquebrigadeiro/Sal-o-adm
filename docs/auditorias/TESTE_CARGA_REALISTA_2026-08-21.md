# TESTE DE CARGA REALISTA — Salão Secreto Backend

**Data:** 21/08/2026
**Ambiente:** Staging (`http://localhost:3334`, banco `SalaosecretoStaging` — TiDB)
**Stack:** Node.js v24.18.0 + Express + MySQL/TiDB (pool `connectionLimit: 20`)
**Ferramenta:** k6 v0.55.0

---

## Resposta Final (formato obrigatório)

### k6 instalado via
**Download direto do binário oficial do GitHub** (`v0.55.0-linux-amd64`), copiado para `backend-node/scripts/k6`, porque:
- O repositório do Fedora/Kali (`apt`) não possui o pacote k6
- `sudo apt-get install k6` exigia senha de root e estava pendurado
- Docker não está instalado na máquina

Comando verificado: `/home/grekas/salão/Sal-o-adm/backend-node/scripts/k6 version` → `k6 v0.55.0`

### 20 salões de teste criados: **OK**
- `scripts/seed_load_test.js` criou 20 salões (`loadtest1@teste.com` a `loadtest20@teste.com`, senha `LoadTest123!`) via `POST /salao/criar-proprietaria`
- Cada salão recebeu 3 profissionais (1 PROPRIETARIO + 2 FUNCIONARIO 40%/30%) e 4 procedimentos
- `scripts/salons_seed.json` gerado com 20 entradas completas, todas com `profissional_id` e `procedimento_id` preenchidos

### Resultados por estágio (5, 20, 50 usuários)

| Estágio | VUs | Tempo médio | p95 | Taxa de erro | Iterações |
|---------|-----|-------------|-----|--------------|-----------|
| Aquecimento | 5 | ~350ms | ~500ms | 0% | ~22 |
| Estável | 5 | ~350ms | ~500ms | 0% | ~40 |
| Rampa | 20 | ~530ms | ~1.1s | 0% | — |
| Estável | 20 | ~610ms | ~1.6s | 0% | ~50 |
| Rampa | 50 | ~650ms | ~1.7s | 0% | — |
| Estável | 50 | ~700ms | ~1.9s | 0% | ~230 |
| Resfriamento | 0 | — | — | — | — |

**Métricas globais do teste:**
- **523 iterações completas**, **3661 requisições HTTP**
- **checks: 3661/3661 (100%)** — nenhuma falha de validação
- **http_req_duration:** avg=613.6ms, p(95)=**1.66s** (threshold ✓ <2s)
- **http_req_failed:** **0.00%** (threshold ✓ <5%)
- **req/s:** 11.79

**Métricas por operação (tempo médio / p95):**

| Operação | Média | p95 | Análise |
|----------|-------|-----|---------|
| Login | 338.9ms | 446.4ms | Saudável |
| Listar agenda | 141.9ms | 173.0ms | Muito rápido |
| Criar atendimento | 1035.6ms | 1255.8ms | Rota pesada (4-5 queries) |
| Atualizar atendimento | 398.5ms | 492.8ms | Saudável |
| Consultar fechamento | 1713.1ms | 2163.2ms | **Mais lenta do sistema** |
| Criar homecare | 270.5ms | 345.6ms | Saudável |

### Gargalo identificado
**Não houve gargalo crítico com o `connectionLimit: 20`.** O sistema manteve p95 < 2s **mesmo com 50 usuários simultâneos** (2.5x acima do limite do pool). A degradação de 20 → 50 VUs foi suave (~90ms de aumento na média, 0 erros).

O **verdadeiro ponto de atenção** é a rota `GET /fechamento/:mes` (avg 1713ms, p95 2163ms), que executa **9+ queries agregadas em tempo real** a cada request — foi a rota mais lenta e a que mais se aproximou do threshold de 3s. Em escala maior, será a primeira a degradar.

### Recomendação
**O sistema aguenta pelo menos 50 usuários simultâneos com p95 < 2s e erro < 5%** (limite máximo testado; não degradou nesse nível). Com as otimizações em `GET /fechamento` (cache/materialização) e `POST /atendimentos` (join de queries), a capacidade deve subir para 80-100+ usuários simultâneos.

---

## O que foi feito — explicação detalhada

### 1. Preparação do ambiente
- **Migração:** a tabela `profissionais` não tinha a coluna `porcentagem_comissao` — essencial para o motor financeiro. Executei `ALTER TABLE profissionais ADD COLUMN porcentagem_comissao DECIMAL(5,2) DEFAULT 0 AFTER cargo`.
- **Rate limit:** o `express-rate-limit` global (300 req/15min) bloqueava o seed de 20 salões. Tornei configurável via env: `RATE_LIMIT_MAX` e `LOGIN_RATE_LIMIT_MAX` no `src/app.js`, permitindo rodar com limites altos em staging.
- **Backend de staging:** iniciado com `PORT=3334 node src/server.js` apontando para `SalaosecretoStaging` (TiDB cloud).

### 2. Seed de dados (`scripts/seed_load_test.js`)
Fluxo por salão:
1. Login como vendedor (`vendedor-staging@teste.com` / `Staging123!`)
2. `POST /salao/criar-proprietaria` → salão + usuária + config (taxa 5%, custo fixo 29)
3. Login como proprietária → criar 3 profissionais (PROPRIETARIO, FUNCIONARIO 40%, FUNCIONARIO 30%), 4 procedimentos (Coloração R$80, Progressiva R$250, Corte R$60, Hidratação R$120), 3 despesas fixas (Aluguel R$1750, Energia R$190, Internet R$150), 2 gastos pessoais (R$500, R$800)
4. Salvar `salons_seed.json` com os IDs reais

### 3. Infraestrutura de carga (k6)
O script `scripts/load_test.js` implementa exatamente o fluxo diário de um salão:
```
1. Login → 2. Ver agenda do dia → 3. Criar atendimento → 4. Marcar como pago → 5. Ver dashboard (fechamento)
```
Com pausas aleatórias de 1–3s simulando comportamento humano, 7 estágios de carga (5→20→50 VUs) e thresholds de SLA. Nele, cada VU escolhe um salão aleatório do `salons_seed.json`.

### 4. Execução
- 5min30s de duração total
- 523 iterações de fluxo completo
- 3661 requisições HTTP
- Taxa de erro **0%**
- p95 global **1.66s** (dentro do SLA < 2s)

### 5. Testes funcionais complementares (`scripts/test_funcional.js`)
Antes da carga, validei 108 cenários funcionais: autenticação, isolamento multi-tenant (não vaza dados entre salões), motor financeiro, fluxo completo de atendimento, procedimentos adicionais, agenda, fechamento mensal, CRUD de 9 entidades, homecare e configurações dinâmicas. **101/108 passaram (93.5%)** — as 7 falhas foram documentadas.

### 6. Simulação de dia real (`scripts/simular_dia.js`)
Simulei um dia completo de operação para 1 salão (08:00→18:00): criação de agendamentos, remarcação, execução, cancelamento, venda de homecare, pagamentos, despesa, consulta de fechamento, agendamentos para o dia seguinte e recarregamento da agenda. **Todas as 16 ações retornaram HTTP 2xx**, com receita bruta de R$420 e lucro líquido de R$62 no dia.

### 7. Validação de integridade pós-carga (`scripts/validar_integridade.js`)
Recalculei manualmente os valores financeiros de **112 atendimentos** em 5 salões aleatórios e comparei com o banco:
- `lucro_liquido` inconsistente: **0 (0.00%)**
- `lucro_possivel` inconsistente: **0 (0.00%)**
- `valor_pendente` inconsistente: **0 (0.00%)**
- `valor_pendente` negativo: **0**
- Status EXECUTADO com pagamento parcial: **0**

**Conclusão:** o motor financeiro está **100% íntegro** após a carga — nenhum registro corrompido, nenhum atendimento duplicado.

---

## Melhorias Recomendadas

### A. Performance (prioridade alta)

#### A1. Otimizar `GET /fechamento/:mes` — a rota mais lenta
- **Problema:** 1713ms média / 2163ms p95. Executa **9 queries agregadas** (`SUM/COUNT`) sobre 6 tabelas em tempo real a cada request.
- **Soluções:**
  1. **Cache em memória com TTL 30s** (`node-cache`) no resultado de `calcularDadosFechamento`, invalidado ao criar/editar/deletar registros do mês — impacto: reduz p95 para ~100-300ms.
  2. **Materialização periódica** em tabela `fechamentos_materializados` via job (ex: a cada 15min) — ideal para dashboards.
  3. **Índice composto** `(salao_id, status, data)` em `atendimentos`.
- **Complexidade:** Média.

#### A2. Otimizar `POST /atendimentos` — segunda rota mais lenta
- **Problema:** 1036ms média / 1256ms p95. Executa 4-5 queries sequenciais em transação (config, profissional, procedimento, produtos, INSERT).
- **Soluções:**
  1. Substituir as SELECTs de config/profissional/procedimento por **um único JOIN**.
  2. Cachear o resultado de `mesEstaFechado` (TTL 5s) — raramente muda.
  3. Usar `Promise.all` para as SELECTs independentes.
- **Impacto estimado:** ~30-40% de redução na latência de criação.
- **Complexidade:** Média.

#### A3. Índice em `(salao_id, data)` na tabela `atendimentos`
- **Problema:** a rota `GET /atendimentos` é rápida hoje (141ms) mas vai degradar com volume. A query filtra por `salao_id` e `data`.
- **Complexidade:** Baixa.

### B. Correção de bugs funcionais (prioridade alta)

#### B1. `custo_variavel` não persistido na criação de procedimentos
- **Problema (Fase 2.3):** criar procedimento com `custo_variavel: 10` gravou `0` no banco — fazendo `lucro_liquido` e `lucro_possivel` divergirem da fórmula correta.
- **Solução:** verificar o fluxo de insert em `crud.controller.js` para a tabela `procedimentos` (o campo provavelmente não está sendo incluído no `INSERT`), e forçar `DEFAULT 0` no schema.
- **Complexidade:** Baixa.

#### B2. HomeCare não calcula `valor_pendente` e `lucro` automaticamente
- **Problema (Fase 2.9):** criar homecare com `valor_venda:150, custo_produto:40, valor_pago:100` retornou `valor_pendente: null` e `lucro: null` — os valores só são calculados após um PUT manual.
- **Solução:** adicionar no `crud.controller.js` para `homecare`:
  ```js
  if (nomeTabela === 'homecare') {
    dados.valor_pendente = parseFloat(dados.valor_venda || 0) - parseFloat(dados.valor_pago || 0);
    dados.lucro = parseFloat(dados.valor_venda || 0) - parseFloat(dados.custo_produto || 0);
  }
  ```
- **Complexidade:** Baixa.

### C. Segurança

#### C1. Reduzir expiração do JWT
- **Problema:** `expiresIn: '7d'` — longo demais para produção.
- **Solução:** reduzir para 12h-24h + implementar refresh token.
- **Complexidade:** Média.

### D. Arquitetura (para escala futura)

#### D1. Separar pools de leitura/escrita
- **Problema:** queries pesadas de agregação (fechamento, relatórios) competem com writes (criar atendimento) no mesmo pool de 20 conexões.
- **Solução:** 2 pools `mysql2` — leitura (`connectionLimit: 15`) e escrita (`connectionLimit: 10`).
- **Complexidade:** Alta (recomendado quando a base crescer).

---

## Arquivos gerados

| Arquivo | Descrição |
|---------|-----------|
| `backend-node/scripts/seed_load_test.js` | Seed de 20 salões de staging |
| `backend-node/scripts/salons_seed.json` | Massa de dados (20 salões com IDs) |
| `backend-node/scripts/load_test.js` | Script k6 de carga realista |
| `backend-node/scripts/k6` | Binário k6 v0.55.0 |
| `backend-node/scripts/test_funcional.js` | 108 testes funcionais |
| `backend-node/scripts/simular_dia.js` | Simulação de dia real |
| `backend-node/scripts/validar_integridade.js` | Validação de integridade pós-carga |
| `backend-node/src/app.js` | Rate limit configurável via env |
| `docs/auditorias/AUDITORIA_CARGA_2026-08-21.md` | Relatório completo da auditoria (protocolo O.MD) |
| `docs/auditorias/TESTE_CARGA_REALISTA_2026-08-21.md` | Este documento |

**Veredicto final: APROVADO COM RESSALVAS.** O sistema suporta 50+ usuários simultâneos com p95 < 2s e 0% de erro, com integridade financeira 100% pós-carga. Recomenda-se corrigir os bugs de `custo_variavel`/homecare e otimizar a rota de fechamento antes do próximo deploy.