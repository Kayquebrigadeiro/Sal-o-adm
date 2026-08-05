Execute uma bateria COMPLETA de testes no `/backend-node/` para validar tudo que já foi construído até agora, ANTES de começarmos a próxima fase (novas funcionalidades). Você tem tokens disponíveis para isso — pode ser minucioso, testar, corrigir bugs que encontrar, testar de novo, até tudo passar de verdade. Ao final, quero um relatório único com o status de cada teste (PASSOU / FALHOU + o que foi corrigido).

Sempre que encontrar um bug, corrija sozinho e teste de novo (você já tem autonomia pra isso). Só me chame se travar no mesmo erro depois de 3 tentativas diferentes, ou se for uma decisão de regra de negócio (não técnica).

Guarde o token de vendedor logado (já usado antes: login `SEU_EMAIL_DE_TESTE@exemplo.com` / `SUA_SENHA_DE_TESTE`) para reutilizar em vários testes.

---

## BLOCO 1 — Massa de dados de teste

1.1. Criar um novo salão de teste (use um email novo, tipo `teste2@teste.com`, pra não bater com o duplicado de antes) via `/salao/criar-proprietaria`.

1.2. Fazer login com o email/senha desse salão recém-criado, pra pegar o token do PROPRIETARIO (não confundir com o token do vendedor).

1.3. Usando o token do proprietário, cadastrar via rotas de `/cadastros`:
   - 1 profissional com `cargo: FUNCIONARIO`
   - 1 profissional com `cargo: PROPRIETARIO`
   - 1 procedimento com `preco_p: 100`, `preco_m` e `preco_g` deixados em branco (pra testar o fallback automático 1.20x/1.30x)
   - 1 procedimento com os três preços definidos manualmente (`preco_p: 80`, `preco_m: 95`, `preco_g: 110`)
   - 1 produto no catálogo (`preco_compra: 50`, `qtd_aplicacoes: 10`)
   - 1 registro de configurações do salão (`taxa_maquininha_pct: 5`, `custo_fixo_por_atendimento: 15`) — se a criação do salão já criar isso automaticamente com defaults, apenas confirme os valores via GET, não crie duplicado.

Reporte os IDs gerados de cada um (vamos precisar deles nos próximos blocos).

---

## BLOCO 2 — Engine financeira via API real (o teste mais importante)

Para cada caso abaixo, calcule você mesmo o valor esperado ANTES de chamar a API (mostre a conta), depois chame `/atendimentos` (POST) e confira se os valores retornados/salvos batem exatamente com o esperado.

2.1. Atendimento simples — profissional FUNCIONARIO, sem comissão configurada (ou comissão 0), `valor_cobrado: 100`, taxa maquininha 5%, custo fixo 15, custo variável do procedimento 0.
   - Esperado: valor_maquininha=5, custo_fixo=15, valor_profissional=0, lucro_liquido=80, lucro_possivel=85.

2.2. Atendimento com comissão — mesmo cenário, mas agora com uma % de comissão configurada (ex: 20%) para o profissional FUNCIONARIO.
   - Esperado: valor_profissional = 20, lucro_liquido = 100 - 5 - 15 - 0 - 20 = 60, lucro_possivel = 100 - 15 - 0 - 20 = 65.

2.3. Atendimento com profissional PROPRIETARIO — confirme que valor_profissional = 0 mesmo que exista uma % de comissão configurada (regra: só FUNCIONARIO recebe comissão).

2.4. Atendimento com procedimento de comprimento M e G — usando o procedimento que tem só `preco_p` definido, confirme que o preço sugerido para M e G aplicado é `preco_p * 1.20` e `preco_p * 1.30` respectivamente (se a API expõe/usa esse cálculo na criação).

2.5. Atendimento com `procedimentos_adicionais` — crie 1 atendimento com o procedimento principal + 1 procedimento adicional no array. Confirme que:
   - O procedimento principal foi salvo em `atendimentos`.
   - O procedimento adicional foi salvo em `atendimento_procedimentos`, com seus próprios valores calculados corretamente.
   - Não houve duplicação do procedimento principal em `atendimento_procedimentos`.

2.6. Atualizar um atendimento (PUT) mudando `valor_pago` para um valor menor que `valor_cobrado` — confirme que `valor_pendente` é recalculado corretamente (valor_cobrado - valor_pago).

2.7. Custo variável por insumos — associe o produto cadastrado no Bloco 1 a um procedimento (via `procedimento_produtos`, se existir rota para isso; se não existir ainda, apenas anote como "rota não implementada ainda" e pule). Confirme que o `custo_variavel` do atendimento reflete `(preco_compra / qtd_aplicacoes) * qtd_por_uso`.

---

## BLOCO 3 — Fechamento mensal

3.1. Com pelo menos 2-3 atendimentos criados no bloco anterior (todos com `status: EXECUTADO`), chame `GET /fechamento/:mes` para o mês atual.

3.2. Calcule manualmente o esperado (some os `valor_cobrado`, `valor_pago`, `lucro_liquido` dos atendimentos criados) e compare com o retorno da API para: `faturamento_bruto`, `total_pendente`, `lucro_atendimentos_real`, `saude_financeira`.

3.3. Crie 1 atendimento com `status: AGENDADO` (não executado) e confirme que ELE NÃO entra nas somas do fechamento (só `EXECUTADO` deve contar).

---

## BLOCO 4 — Segurança e isolamento multi-tenant (crítico)

4.1. Com o token do salão de teste criado no Bloco 1, tente fazer uma requisição passando um `salao_id` diferente (de outro salão, tipo o que criamos em conversas anteriores) no BODY da requisição de qualquer rota de cadastro. Confirme que a API IGNORA esse valor e usa o `salao_id` do token JWT mesmo assim (ou seja, é impossível um salão ler/escrever dados de outro só manipulando o body).

4.2. Tente acessar uma rota protegida (qualquer uma de `/atendimentos`, `/cadastros/*`, `/fechamento/*`) SEM enviar o header `Authorization`. Confirme que retorna 401.

4.3. Tente acessar com um token JWT inválido/adulterado (mude um caractere do token válido). Confirme que retorna 401, não 500.

4.4. Tente fazer login com senha errada 3 vezes seguidas. Confirme que a resposta é sempre a mesma mensagem genérica de erro (não deve revelar se o email existe ou não, por segurança).

---

## BLOCO 5 — CRUD completo dos cadastros simples

Para CADA uma destas 9 tabelas via `/cadastros/*`, teste o ciclo completo (criar → listar → buscar por id → atualizar → deletar → confirmar que sumiu):
clientes, profissionais, procedimentos, produtos, custos-fixos, despesas, homecare, procedimentos-paralelos, configuracoes.

Não precisa narrar cada um em detalhe no relatório final — só reporte quais passaram no ciclo completo e quais tiveram algum problema.

---

## BLOCO 6 — Rotas administrativas

6.1. `/admin/criar-admin` — criar um novo vendedor usando o token do vendedor original. Confirme que o novo vendedor consegue logar depois.

6.2. `/usuarios/convidar` — convidar um usuário pro salão de teste (cargo funcionário). Confirme que aparece um log no console (mesmo que o email real não seja enviado, é só stub).

6.3. `/admin/:user_id` (DELETE) — tente deletar o PRÓPRIO usuário logado (deve ser bloqueado, conforme a regra que definimos). Depois tente deletar outro usuário (deve funcionar).

6.4. `/salao/:salao_id` (DELETE) — delete o salão de teste criado no Bloco 1 por completo. Confirme que todas as tabelas relacionadas (atendimentos, atendimento_procedimentos, profissionais, procedimentos, configuracoes, perfis_acesso, etc) ficaram sem nenhum registro órfão desse salao_id depois. Rode uma query de conferência tipo `SELECT COUNT(*) FROM atendimentos WHERE salao_id = 'ID_DELETADO'` (deve dar 0) para 3-4 tabelas diferentes.

---

## BLOCO 7 — Tratamento de erros e robustez

7.1. Envie um POST `/atendimentos` faltando um campo obrigatório (ex: sem `valor_cobrado`). Confirme que retorna erro 400 com mensagem clara, não um erro 500 genérico.

7.2. Envie um `profissional_id` ou `procedimento_id` que não existe no banco. Confirme que retorna erro 400 tratado (não quebra o servidor, não deixa a transação pela metade).

7.3. Confirme (via `ps` ou verificando se o servidor ainda responde depois de todos esses testes) que NENHUM dos testes acima derrubou o processo Node — o servidor deve estar de pé o tempo todo.

---

## FORMATO DO RELATÓRIO FINAL

Uma tabela markdown simples:

| Bloco | Teste | Status | Observação (só se houver bug/correção) |
|---|---|---|---|

E ao final, uma seção curta "BUGS ENCONTRADOS E CORRIGIDOS" listando só os que precisaram de correção de código (com o nome do arquivo), e uma seção "PENDÊNCIAS" para qualquer rota que ainda não existe (ex: `procedimento_produtos` se não estiver implementada).

Não precisa me mostrar o código alterado linha por linha no relatório final — só o resumo. Se eu quiser ver o código de alguma correção específica depois, eu peço separadamente.