| Bloco | Teste | Status | Observação (só se houver bug/correção) |
|---|---|---|---|
| 0 | Vendor login | PASSOU | token acquired |
| 1 | 1.1 Criar novo salão de teste | PASSOU | salao_id=3537395e-517e-400c-a7e3-aa12f6821910 |
| 1 | 1.2 Login do proprietário | PASSOU | token acquired |
| 1 | 1.3.prof FUNCIONARIO | PASSOU | id=32a6ba33-fcca-4318-bf04-66694dc9c609 |
| 1 | 1.3.prof PROPRIETARIO | PASSOU | id=a2c61264-4454-4f59-bd17-c52abc27306b |
| 1 | 1.3.proc preco_p only | PASSOU | id=993756c8-98a4-451e-8f69-6895f162ddb3 |
| 1 | 1.3.proc full | PASSOU | id=04ec8043-6a0b-4e59-a3a1-913f07a0be25 |
| 1 | 1.3.produto | PASSOU | id=1ce6adff-d22f-4024-9670-159b4b9d8e19 |
| 1 | 1.3.configuracoes created | PASSOU | id=4d117ca3-70c7-4630-84ed-56f8f3703e62 |
| 2 | 2.1 Atendimento simples | PASSOU | id=eda4a3fd-6cd5-44f9-b039-3acb2ffd428c |
| 2 | 2.2 Atendimento com comissao | PASSOU | id=5222d560-2429-4642-a7fb-3b27eecca06b |
| 2 | 2.3 Atendimento com PROPRIETARIO | PASSOU | ok |
| 2 | 2.4 Preço por comprimento M/G | PASSOU | created M and G |
| 2 | 2.5 procedimentos_adicionais | PASSOU | OK |
| 2 | 2.6 Atualizar valor_pago e recalculo valor_pendente | PASSOU | id=eda4a3fd-6cd5-44f9-b039-3acb2ffd428c |
| 2 | 2.7 procedimento_produtos | PASSOU | assoc created id=531da2db-f307-4fc1-975a-453ed0f421a3 |
| 2 | 2.7 custo_variavel refletido | PASSOU | valor_custo_variavel=10.00 |
| 3 | 3.1 GET /fechamento/:mes | PASSOU | received |
| 3 | 3.2 comparar soma faturamento | PASSOU | ok |
| 3 | 3.3 AGENDADO não entra no fechamento | PASSOU | ok |
| 4 | 4.1 ignora salao_id no body e usa token | PASSOU | ok |
| 4 | 4.2 rota protegida sem Authorization retorna 401 | PASSOU | ok |
| 4 | 4.3 token adulterado retorna 401 | PASSOU | ok |
| 4 | 4.4 três logins falhos retornam mesma mensagem genérica | PASSOU | ok |
| 5 | 5.x CRUD clientes | PASSOU | full cycle ok |
| 5 | 5.x CRUD profissionais | PASSOU | full cycle ok |
| 5 | 5.x CRUD procedimentos | PASSOU | full cycle ok |
| 5 | 5.x CRUD produtos | PASSOU | full cycle ok |
| 5 | 5.x CRUD custos-fixos | PASSOU | full cycle ok |
| 5 | 5.x CRUD despesas | PASSOU | full cycle ok |
| 5 | 5.x CRUD homecare | PASSOU | full cycle ok |
| 5 | 5.x CRUD procedimentos-paralelos | PASSOU | full cycle ok |
| 5 | 5.x CRUD configuracoes | PASSOU | full cycle ok |
| 6 | 6.1 criar-admin | PASSOU | user_id=197038a1-cc15-452f-ae22-d7e44f1cafb3 |
| 6 | 6.1 novo vendedor consegue logar | PASSOU | ok |
| 6 | 6.2 usuarios/convidar | PASSOU | ok |
| 6 | 6.3 deletar proprio usuario bloqueado | PASSOU | ok |
| 8 | 8.1 ranking-procedimentos | PASSOU | found 2 items |
| 8 | 8.2 rendimento-professional | PASSOU | found 2 items |
| 8 | 8.3 agenda-do-dia | PASSOU | found 1 items |
| 8 | 8.4 clientes-resumo | PASSOU | found 1 items |
| 8 | 8.5 gastos-pessoais-resumo | PASSOU | found 1 items, total_gastos=25.5 |
| 8 | 8.6 custo-composto | PASSOU | custo composto=10 ok |
| 8 | 8.6b custo-composto fallback | PASSOU | custo composto fallback=0 ok |
| 8 | 8.7 atendimentos-completo | PASSOU | ok, nested fields valid |
| 6 | 6.4 deletar salao de teste | PASSOU | ok |
| 6 | 6.4 verificar sem registros or token invalidado | PASSOU | ok |
| 7 | 7.1 missing campo obrigatório retorna 400 | PASSOU | ok |
| 7 | 7.2 ids inexistentes retornam 400 | PASSOU | ok |
| 7 | 7.3 servidor responde /health | PASSOU | ok |


## BUGS ENCONTRADOS E CORRIGIDOS

(Se houveram correções de código, listar aqui com arquivo)

## PENDÊNCIAS
