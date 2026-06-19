FASE 2 — AUDITORIA FINANCEIRA E VALIDAÇÃO DAS REGRAS DE NEGÓCIO

A implementação anterior focou em UX, modais e preparação transacional.

Agora execute exclusivamente a validação das regras financeiras, que são o núcleo do sistema.

NÃO implemente melhorias visuais nesta etapa.

OBJETIVO:

Comprovar matematicamente que os indicadores financeiros estão corretos.

---

1. AUDITAR DASHBOARD

Mapear exatamente de onde vêm:

* faturamento
* lucro líquido
* lucro possível
* despesas
* resultado

Para cada indicador informar:

* consulta SQL utilizada
* tabelas envolvidas
* campos utilizados
* fórmula aplicada

---

2. VALIDAR VALOR MANUAL

Verificar se valor_cobrado está sendo utilizado em:

* dashboard
* relatórios
* gráficos
* fechamento mensal
* indicadores financeiros

Caso qualquer cálculo utilize:

* preco_p
* preco_m
* preco_g
* valor_indicado

onde deveria utilizar valor_cobrado,

corrigir.

---

3. VALIDAR IMUTABILIDADE

Executar teste:

* criar atendimento
* salvar valor
* alterar preço do procedimento
* recalcular dashboard

Comprovar que o histórico permanece inalterado.

Documentar resultado.

---

4. VALIDAR TRIGGERS

Auditar:

* fn_calcular_atendimento
* triggers de atendimento_procedimentos

Testar:

* INSERT
* UPDATE
* DELETE

Verificar especialmente o bug conhecido envolvendo:

NEW.atendimento_id

durante DELETE.

---

5. VALIDAR TRANSAÇÃO

Forçar erro proposital na inserção de atendimento_procedimentos.

Confirmar que:

* atendimento pai não permanece órfão
* rollback acontece corretamente

Documentar evidências.

---

ENTREGA

Fornecer:

* relatório da auditoria
* consultas encontradas
* problemas encontrados
* correções realizadas
* evidências dos testes
* riscos remanescentes

Não afirmar que algo está correto sem apresentar a consulta, trigger ou código responsável.
