SPRINT 6.9 — VALIDAÇÃO FINAL EM BANCO REAL

Objetivo:

Confirmar em ambiente Supabase real que todas as regras auditadas estão funcionando na prática.

Não realizar refatorações.

Não criar novas funcionalidades.

Executar apenas testes de validação.

TESTE 1

Criar atendimento:

Valor Indicado = R$ 200

Valor Cobrado = R$ 150

Validar:

* atendimento_procedimentos
* atendimentos
* dashboard
* relatórios

Todos devem refletir R$ 150.

---

TESTE 2

Alterar preço do procedimento:

Antes:
R$ 200

Depois:
R$ 300

Validar:

Atendimento antigo continua R$ 150.

---

TESTE 3

Adicionar múltiplos serviços.

Exemplo:

Progressiva = R$ 150
Luzes = R$ 200

Validar:

* total atendimento
* lucro líquido
* lucro possível

---

TESTE 4

Editar serviço existente.

Validar:

* valor pago permanece correto
* atendimento é recalculado

---

TESTE 5

Excluir procedimento.

Validar:

* trigger DELETE recalcula corretamente
* atendimento pai permanece consistente

---

TESTE 6

Forçar falha durante criação de atendimento.

Validar:

* rollback completo
* nenhum atendimento órfão

---

ENTREGA

Fornecer:

* prints dos registros antes/depois
* resultado dos testes
* consultas executadas
* evidências de rollback
* evidências dos triggers funcionando
* conclusão final sobre prontidão para produção

