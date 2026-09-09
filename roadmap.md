# Roadmap de Futuras Alterações — Salão Secreto

Este arquivo lista o que fica para depois — nada aqui é urgente hoje, mas vale revisitar conforme o negócio crescer. Guarde este arquivo no repositório (ex: `docs/ROADMAP.md`) como referência futura, para você ou qualquer IA que continue o projeto.

---

## Técnico — Performance (fazer quando o volume de dados/usuários crescer)

- [ ] **Índice composto `(salao_id, data)` na tabela `atendimentos`** — melhora consultas de agenda/relatórios conforme o volume de registros cresce. Baixa complexidade, fazer quando notar lentidão na Agenda com muitos atendimentos acumulados.
- [ ] **Unificar as queries do `POST /atendimentos`** — hoje faz 3+ SELECTs sequenciais (config, profissional, procedimento) antes de inserir. Trocar por um JOIN único ou `Promise.all` reduziria ~30-40% do tempo de criação. Vale fazer se `POST /atendimentos` continuar sendo a rota mais lenta no uso real.
- [ ] **Separar pools de leitura/escrita no `mysql2`** — só relevante em escala bem maior (centenas de usuários simultâneos). Não fazer agora.
- [ ] **Cache mais agressivo em relatórios pesados** (ranking de procedimentos, rendimento por profissional) — mesmo princípio do cache já aplicado no `/fechamento`.

## Técnico — Segurança (revisar periodicamente)

- [ ] **Refresh token** — hoje o JWT expira em 24h sem renovação automática (usuário precisa logar de novo). Implementar refresh token melhora a experiência sem comprometer segurança.
- [ ] **Reescrever histórico do git** (BFG Repo-Cleaner ou `git filter-repo`) para remover de vez as credenciais antigas que ficaram em commits passados — hoje mitigado por rotação de credenciais, mas o histórico ainda "lembra" delas. Fazer com cuidado (é uma operação destrutiva, exige coordenar com qualquer outra pessoa que tenha clone do repo).
- [ ] **2FA para login de vendedor/admin** — camada extra de proteção para as contas com mais poder no sistema.
- [ ] **Auditoria de dependências recorrente** — rodar `npm audit` periodicamente (ex: mensal), não só uma vez.

## Técnico — Funcionalidades incompletas conhecidas

- [ ] **Gasto pessoal retroativo (campo `data` em `gastos_pessoais`)** — hoje o mês do gasto é derivado de `DATE(criado_em)`: pela UI, o gasto sempre cai no mês corrente do cadastro, não numa data retroativa. **Decisão em 04/09/2026 (véspera da apresentação do dia 10): NÃO corrigir pré-lançamento.** Motivo: não há erro de cálculo (fechamento 100% consistente — validado na simulação "Salão Beleza Real" com 0 divergências), é limitação de UX; e a correção exige `ALTER TABLE` + mudança na query do fechamento + guard do CRUD (`TABELAS_FECHAMENTO`) + frontend — ou seja, mexe no núcleo financeiro recém-validado. Reavaliar com feedback real das primeiras usuárias; se implementar, re-executar `backend-node/scripts/simular_validacao_final.js` para revalidar os fechamentos de ponta a ponta.
- [ ] **Tela de Assinaturas (`Assinaturas.jsx`)** — ainda usa Supabase diretamente (decisão consciente de deixar para depois). Migrar quando a cobrança automatizada for implementada (ver item de negócio abaixo).
- [ ] **`VendedorDashboard.jsx`** — existe no código mas não está conectado a nenhuma rota/menu. Decidir se vale ativar ou remover.
- [ ] **Bloqueio de acesso por assinatura vencida** — hoje desativado de propósito. Reativar quando o modelo de cobrança estiver definido.
- [ ] **Limpeza de código morto restante** — `supabaseClient.js` só é usado pela tela de Assinaturas; remover quando essa tela for migrada.

## Negócio — Antes de vender ativamente

- [ ] **Arraste de prejuízo / saldo acumulado entre meses (funcionalidade nova em avaliação)** — hoje cada mês é calculado 100% isolado: o fechamento soma lucro de atendimentos + homecare − despesas − gastos pessoais − salários fixos daquele mês, e o snapshot em `fechamentos` não guarda nem consulta "saldo anterior" (verificado no código: `fechamento.controller.js` e `Dashboard.jsx`; nenhum cálculo olha o mês anterior). Ou seja: **se um mês fecha no prejuízo, o sistema NÃO desconta esse prejuízo do resultado do mês seguinte** — cada mês recomeça do zero. Isso foi confirmado na auditoria de 08/09/2026 (`docs/auditorias/SIMULACAO_REALISTA_PRODUCAO_2026-09-08.md`) e é um comportamento correto/consistente, mas pode não refletir a expectativa da dona do salão, que pensa em "quanto sobrou no caixa de verdade desde que comecei". **Avaliar com as primeiras usuárias / no projeto de fusão** se vale implementar, por exemplo: (a) campo "saldo acumulado" no Dashboard (soma dos `resultado_final` dos meses, simples e não invasivo — só leitura), e/ou (b) "resultado ajustado" que arrasta o fechamento anterior (exige decidir se o arraste entra no snapshot do `POST /fechamento`, o que mexe no núcleo financeiro validado — aí re-executar `backend-node/scripts/simulacao_producao_realista.js --somente-auditoria` para revalidar). Recomendação: começar pela opção (a), que não altera nenhum cálculo existente.
- [ ] **Gateway de pagamento real** (Stripe, Mercado Pago ou Pagar.me) — hoje a renovação é manual via WhatsApp. Isso é o maior gargalo de crescimento: não escala além de um punhado de clientes gerenciados manualmente.
- [ ] **Política de Privacidade e Termos de Uso** (LGPD) — obrigatório ao armazenar dados de clientes (nomes, telefones) de terceiros. Considere consultoria jurídica mínima nessa parte.
- [ ] **Processo de suporte ao cliente** — definir como um salão reporta um problema (WhatsApp? Email? Formulário?).
- [ ] **Backup e plano de recuperação** — confirmar se o TiDB Cloud Starter inclui backup automático; se não, definir uma rotina própria (ex: dump semanal).

## Operacional

- [ ] **Alertas do Sentry configurados** — depois de criar a conta, configure para receber notificação (email/Slack) quando um erro novo aparecer, não só olhar o painel manualmente.
- [ ] **Upgrade de plano (Render/TiDB)** conforme o uso real crescer além dos limites gratuitos/starter — monitore os paineis de uso de ambos periodicamente.
- [ ] **Documentação para você mesmo** — este projeto tem muita lógica de negócio específica (comissões, custo fixo por atendimento, etc). Vale manter a `DOCUMENTACAO_COMPLETA.md` atualizada conforme o sistema evolui, para facilitar retomar o contexto no futuro (com IA ou sozinho).

---

## Como usar este arquivo

Quando for revisitar qualquer um desses itens, a forma mais eficiente é: leia o item, escreva um prompt objetivo pedindo pra investigar o estado atual daquele ponto específico antes de implementar qualquer mudança (mesmo padrão usado a migração inteira) — não peça pra implementar direto sem confirmar o estado real primeiro.

---

# 📋 RELATÓRIO DE VALIDAÇÃO E TESTES (setembro/2026) — GUIA PARA PÓS-FUSÃO

> Contexto: antes de o projeto ser juntado a outro projeto (ainda sem detalhes conhecidos),
> o sistema passou por uma validação completa de ponta a ponta. Este relatório documenta
> **o que foi testado, o que foi corrigido, como re-executar cada teste** e **como decidir
> prioridades quando o outro projeto for revelado**.

## 1. Cronologia do que foi feito (04-05/09/2026)

1. **Simulação completa de operação real** — salão fictício "Salão Beleza Real"
   (`beleza.real@teste.com` / `BelezaReal123!`) com 3 meses de dados (145+ atendimentos
   com todos os status, homecare, procedimentos paralelos, despesas, gastos pessoais,
   custos fixos, 4 profissionais com comissões diferentes, 6 procedimentos P/M/G,
   4 produtos com vínculos de custo variável dinâmico). Contagem INDEPENDENTE
   (réplica própria do financial engine, fora do código do servidor) comparada com
   `GET /fechamento/:mes`: **0 divergências em 33 campos × 3 meses**.
   - Script: `backend-node/scripts/simular_validacao_final.js`
   - Evidências: `scripts/validacao_final_beleza_real.json` e `.csv`
2. **4 bugs encontrados e corrigidos** (todos com teste real, não só code review):
   | # | Bug | Gravidade | Arquivo corrigido |
   |---|-----|-----------|-------------------|
   | 1 | `POST /fechamento/:mes` sempre dava 500 (mysql2 retorna DECIMAL como string; soma com `+` concatenava e gerava `NaN`) — **funcionalidade inteira quebrada** | 🔴 CRÍTICO | `src/controllers/fechamento.controller.js` |
   | 2 | `procedimentos_adicionais` não entravam nos totais do atendimento no `POST` (só no `PUT /:id/procedimentos`) | 🟠 ALTO | `src/controllers/atendimentos.controller.js` |
   | 3 | `POST /despesas` com `tipo` fora do ENUM dava 500 genérico em vez de 400 com mensagem | 🟡 MÉDIO | `src/controllers/crud.controller.js` |
   | 4 | Fallback de preço M/G (1.2x/1.3x) não era aplicado ao criar procedimento sem esses campos | 🟡 MÉDIO | `src/controllers/crud.controller.js` |
   - Testes dos fixes: `backend-node/scripts/testar_correcoes.js` → **30/30 passando**
     (inclui: fechar jul+ago de verdade, re-fechamento bloqueado 400, guarda de mês
     fechado 403, agregação 100+50=150, tipos válidos/inválidos, fallback 120/130,
     preços manuais respeitados).
3. **Bateria funcional completa**: `bash tests/run-full-tests.sh` → **57/57 passando**.
4. **Teste de carga em degraus 5→10→20→35→50 usuários simultâneos** (fluxo realista:
   login, agenda, criar atendimento, executar/pagar, homecare, fechamento).
   - Script: `backend-node/scripts/testar_carga_degraus.js` (Node puro — o k6 não está
     instalado na máquina; espelha as stages do `scripts/k6`)
   - **RESULTADO FINAL (execução definitiva, 50 salões no pool, banco já volumoso
     pós-stress): 0 erros em TODAS as fases.** Throughput: ~5 req/s (5 usuários) →
     ~27,5 req/s (50 usuários). p95 de `POST /atendimentos`: 1,2s→2,2s (sempre ok).
     p95 de `GET /fechamento`: 2,0s / 2,5s / 1,9s / **3,0s / 4,8s** — dentro do
     threshold (3s) até 20 usuários; **acima do threshold a partir de ~35 usuários
     com banco volumoso** (degradação graciosa, sem erro nem perda de dados).
   - Causa conhecida: `GET /fechamento` agrega 9 queries em tempo real e o cache de
     30s é invalidado a cada escrita — sob escrita pesada ele quase nunca acerta.
     Mitigações no roadmap de performance (cache TTL maior / materialização).
   - Evidência: `scripts/resultado_carga_degraus.json`
5. **Stress de escrita em degraus + verificação de integridade** — 50 salões
   (`loadtest1..50@teste.com` / `LoadTest123!`) simulando 3 meses SIMULTANEAMENTE,
   em fases cumulativas 5→10→20→35→50, com baseline pré-capturado por salão e
   comparação final `baseline + criado × GET /fechamento` (**1350 comparações**) +
   fechamento em massa de jul+ago dos 50 salões.
   - Script: `backend-node/scripts/testar_stress_escrita.js`
   - Evidência: `scripts/resultado_stress_escrita.json`
   - **RESULTADO: sistema íntegro sob carga.** Duração por fase: 5→68s, 10→69s,
     20→68s, 35→117s, 50→166s. Fechamento em massa: **100/100 com sucesso, 0 erros**
     (prova do fix do bug 1 em escala).
   - **120 falhas de `POST /atendimentos`** nas fases 35/50 (timeouts do cliente de
     60s sob saturação do pool de 20 conexões do TiDB) — **sem nenhuma corrupção de
     dados**: nenhuma divergência em faturamento/lucro/contagens. Ou seja, o sistema
     rejeita/estoura timeout limpo, sem gravar valores inconsistentes.
   - **20 "divergências" investigadas e descartadas** — eram artefato de DADOS
     LEGADOS: 24+ linhas de homecare criadas pela auditoria de 21/08 (versão antiga
     do controller, antes do "Reforço de robustez") tinham `lucro = NULL` gravado;
     a API calcula `SUM(valor_venda − custo_produto)` ao vivo (correta e imune), o
     baseline do teste lia a coluna gravada. Banco reparado (525 homecare + 790
     despesas + 726 paralelos com pendente/lucro recalculados; 0 NULLs restantes).
   - Correções adicionais descobertas durante o stress: `tests/test-financial-engine.js`
     tinha `require` quebrado (nunca rodou) e expectativa de arredondamento half-even
     enquanto a engine usa half-up (comportamento validado em 1350+ comparações) —
     teste corrigido, agora **27/27**.
6. **Suíte única de regressão**: `bash backend-node/scripts/rodar_suite.sh`
   (unitários da engine + bateria 57 + testes de correção + carga em degraus).

## 2. Como rodar os testes (guia prático)

| Teste | Comando (a partir de `backend-node/`) | O que prova | Duração | Pré-requisito |
|---|---|---|---|---|
| Unitários da engine | `node tests/test-financial-engine.js` | Cálculos puros (comissão, maquininha, fallback P/M/G, saúde financeira) | ~1s | nada |
| Bateria funcional | `bash tests/run-full-tests.sh` | Todas as rotas CRUD + relatórios + auth (sobe o próprio servidor na 3333) | ~2min | `.env` do backend |
| Correções pós-validação | `node scripts/testar_correcoes.js` | Os 4 fixes seguem de pé + fechamento real com dados da simulação | ~1min | servidor staging na 3334 |
| Carga em degraus | `node scripts/testar_carga_degraus.js` | Latência/erros com 5→50 usuários simultâneos (fluxo realista) | ~4min | servidor staging na 3334 + `salons_seed.json` |
| Stress de escrita + integridade | `node scripts/testar_stress_escrita.js` (--max-fase 20 p/ versão rápida) | Integridade financeira sob escrita concorrente em massa (50 salões × 3 meses) | ~30min (completo) | idem; cria/reaproveita `loadtest1..50` |
| Simulação completa (salão novo) | `node scripts/simular_validacao_final.js` | Núcleo financeiro de ponta a ponta com conferência independente | ~5min | servidor staging na 3334 |
| **SUITE COMPLETA** | **`bash scripts/rodar_suite.sh`** | **Tudo acima que não precisar de dados específicos (itens 1, 2, 3, 4)** | ~10min | servidor staging na 3334 para os itens 3/4 |

**Subir o servidor de staging:** `cd backend-node && PORT=3334 node src/server.js`
(para os testes de carga/stress, suba com `RATE_LIMIT_MAX=20000 LOGIN_RATE_LIMIT_MAX=500`)

**Thresholds usados** (mesmos do k6 original): taxa de erro < 5%, p95 de
`POST /atendimentos` e `GET /fechamento` < 3000ms por fase. **NOTA:** com o banco
de staging já volumoso (dados de stress), a fase 35/50 do teste de carga pode
reprovar no p95 do `fechamento` (limitação conhecida e documentada na seção 1,
item 4) — isso é esperado e NÃO indica regressão; o que nunca pode falhar é a
taxa de erro (deve ser sempre 0).

## 3. O que cada tipo de teste garante (e o que NÃO garante)

- **Simulação com contagem independente** → garante que o *núcleo financeiro* calcula
  certo (lucro, pendências, fechamento). É o teste mais importante do sistema. NÃO
  testa performance nem concorrência.
- **Bateria funcional (57)** → garante que os *contratos da API* (rotas, status codes,
  isolamento por salão, permissões vendedor/admin) continuam de pé. É o teste de
  regressão mais barato. NÃO valida valores financeiros complexos.
- **Carga em degraus** → garante *latência e estabilidade* sob uso simultâneo realista.
  NÃO garante integridade dos dados.
- **Stress de escrita** → garante *integridade financeira sob concorrência* (o cenário
  mais traiçoeiro: escritas paralelas corrompendo agregados) e comportamento do
  fechamento em massa. É o teste mais lento; rode antes de releases grandes.
- **Nenhum deles substitui** o login manual da dona do salão no frontend — faça pelo
  menos um walkthrough completo na UI antes de cada apresentação/release.

## 4. Árvore de decisão — quando souber o que é o outro projeto

**Pergunta 1: o outro projeto toca o MESMO banco de dados (TiDB)?**
- **SIM** → prioridades imediatas: (a) migrations versionadas para schema (hoje não
  existem — schema vive só no banco); (b) backup/rotina de dump (item do roadmap);
  (c) conferir que nada escreve sem `salao_id` (isolamento multi-tenant); (d) rodar
  `simular_validacao_final.js` em salão novo após QUALQUER mudança de schema;
  (e) revisar índices compostos (item de performance do roadmap) porque outro
  serviço escrevendo muda o perfil de carga.
- **NÃO** (bancos separados) → foco em contratos de API (item abaixo).

**Pergunta 2: o outro projeto consome a API deste backend?**
- **SIM** → (a) `bash scripts/rodar_suite.sh` vira *gate obrigatório* de qualquer PR;
  (b) revisar `ALLOWED_ORIGINS` (CORS em `src/app.js`) para incluir a origem do outro
  projeto; (c) revisar rate limits (300 req/15min geral, 100/15min login) — integração
  server-to-server pode estourar; (d) documentar os payloads principais
  (`POST /atendimentos`, `/fechamento/:mes`, `/cadastros/*`).

**Pergunta 3: o outro projeto tem usuários/auth próprios?**
- **SIM** → item de roadmap "Refresh token" sobe de prioridade; decidir se os JWTs
  serão unificados ou se haverá bridge de autenticação; revisar `perfis_acesso`
  (VENDEDOR/PROPRIETARIO/ADMIN) contra os cargos do outro sistema.

**Pergunta 4: é uma fusão de CODEBASES (frontend junto, por exemplo)?**
- **SIM** → (a) limpar histórico do git com credenciais antigas (item de roadmap,
  destrutivo — planejar); (b) conferir variáveis de ambiente duplicadas/conflitantes
  (`.env` vs `.env.staging` vs Vercel); (c) `supabaseClient.js` e a tela de Assinaturas
  são resquícios do stack antigo — decidir remoção (itens do roadmap).

## 5. Estado do staging e dados de teste (referência rápida)

- **Servidor staging**: `cd backend-node && PORT=3334 node src/server.js` → banco
  TiDB `SalaosecretoStaging` (credenciais em `backend-node/.env`)
- **Salão de demo/validação**: `beleza.real@teste.com` / `BelezaReal123!` — jul/2026 e
  ago/2026 FECHADOS (snapshots íntegros em `fechamentos`), set/2026 aberto
- **Vendedor**: `vendedor-staging@teste.com` / `Staging123!`
- **Massa de carga**: `loadtest1..50@teste.com` / `LoadTest123!` — 50 salões com base
  de cadastros + meses 2026-07/08/09 com dados de stress; jul/ago fechados após o
  teste (ver `resultado_stress_escrita.json`)
- **Arquivos de evidência** (em `backend-node/scripts/`):
  `validacao_final_beleza_real.{json,csv}`, `resultado_carga_degraus.json`,
  `resultado_stress_escrita.json`
- **Limitações conhecidas e deliberadas** (não são bugs, estão no roadmap acima):
  gasto pessoal não aceita data retroativa; rota `GET /fechamento` passa de 3s p95 a
  partir de ~35 usuários simultâneos com banco volumoso; rate limits padrão (300
  req/15min, 100 logins/15min).

## 6. Como me guiar nos testes a partir de agora (resumo em 5 linhas)

1. **Antes de qualquer mudança**: `bash scripts/rodar_suite.sh` — precisa estar 100% verde.
2. **Mudou o núcleo financeiro?** Rode também `node scripts/simular_validacao_final.js`
   e exija **0 divergências** (a contagem independente não mente).
3. **Antes de release/fusão grande**: rode o stress completo
   (`node scripts/testar_stress_escrita.js`) e exija **0 divergências + 0 erros de API**.
4. **Qualquer divergência encontrada**: NÃO corrija sem entender — reporte
   `esperado × api` exatos, ache a causa raiz, corrija, e re-valique tudo.
5. **Novo bug de cálculo?** Escreva o teste ANTES do fix (padrão usado nesta
   validação: `testar_correcoes.js` nasceu do relatório de bugs) e o inclua na suíte.




