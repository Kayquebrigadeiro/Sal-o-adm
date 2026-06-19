# RELATÓRIO DE AUDITORIA — SPRINT 6.10

## 1. RESUMO EXECUTIVO

Esta auditoria foi realizada com base no schema do banco de dados atualmente implantado em Produção, validando-se as **Migrations Aplicadas** (incluindo V6 e V8) contra a documentação técnica anterior.
O diagnóstico constatou que a **funcionalidade do núcleo financeiro está validada e correta**, mas existiam divergências de nomenclatura e defasagens na documentação mestre em relação ao ambiente real.

### VEREDITO FINAL

- **O que está alinhado:** Todo o motor financeiro, cálculos de *Lucro Real* e *Lucro Possível*, estrutura Multi-Tenant, Imutabilidade Histórica, RLS, Views de fechamento mensal, e a trigger transacional (`MIGRATION_ATENDIMENTO_TRANSACIONAL.sql`).
- **O que está divergente:** A nomenclatura entre Frontend/Variáveis (`servicos`) vs Banco de Dados (`procedimentos`). A antiga tabela de `atendimentos` que contava com vínculo 1:1 `procedimento_id` na documentação, quando o banco real usa `atendimento_procedimentos` para múltiplos serviços.
- **O que precisa ser atualizado:** Toda a documentação (`/docs`) foi recriada nesta Sprint 6.10 como **V2**, para refletir o schema V8 real do banco e o uso de múltiplos procedimentos.
- **O que pode ser removido:** Os antigos arquivos de prompt (`promptmestre.md`, `ajustes.md`) e scripts V7 (`SCHEMA_V7_COMPLETO.sql`) tornaram-se obsoletos frente a este novo conjunto consolidado.
- **O que deve permanecer como está:** As regras financeiras, as triggers de cálculos matemáticos, views e RPCs (que foram corrigidos com coalesce nas migrations mais recentes e estão corretos em produção).

---

## 2. ARQUIVOS DESATUALIZADOS / OBSOLETOS

Abaixo está a lista completa de arquivos que não representam mais a verdade do sistema e que foram substituídos pela Documentação V2:

1. `promptmestre.md`
2. `promptmestre2.md`
3. `promptmestre3.md`
4. `ajustes.md`
5. `docs/sql/PRODUCAO/SCHEMA_V7_COMPLETO.sql`
6. `docs/sql/PRODUCAO/VIEWS_DASHBOARD.sql` (agora incorporadas nas migrations V8)
7. `Supabase Snippet List Columns for a Table.csv`

---

## 3. PRINCIPAIS DIVERGÊNCIAS ENCONTRADAS

### 3.1. Nomenclatura: Serviços vs Procedimentos
A documentação falava em `Catálogo de serviços`, e o Frontend utiliza frequentemente variáveis como `servicoId` e `servicos[]`. Contudo, a tabela principal do banco de dados chama-se **`procedimentos`**, a associativa **`atendimento_procedimentos`**, e as Views agrupam por `procedimento_nome`. Os enums do V6 reforçam o conflito usando nomenclaturas híbridas (`SERVICO_CABELO`, `SERVICO_ESTETICA`, `PRODUTO_APLICADO`).

### 3.2. Múltiplos Procedimentos por Atendimento (Sprint 3)
A versão do documento do "Prompt Mestre" referia-se a `atendimentos` possuindo `procedimento_id`. Na validação do banco real, este campo foi migrado. Hoje os atendimentos operam na tabela de junção `atendimento_procedimentos` (relação 1:N), e os totais na tabela pai (`atendimentos`) são mantidos atualizados através da trigger `atualizar_totais_atendimento`. A documentação e os scripts V8 legados não descreviam perfeitamente esse fluxo.

### 3.3. Transações de Atendimentos
Para resolver a questão de *Atendimentos Órfãos*, a migration mais recente (`MIGRATION_ATENDIMENTO_TRANSACIONAL.sql`) moveu as operações de criação para uma RPC segura (`rpc('inserir_atendimento_completo')`), abandonando as chamadas encadeadas não-transacionais que o Frontend costumava executar.

---

## 4. DÉBITOS TÉCNICOS MAPEADOS

### 🔴 CRÍTICOS (Podem gerar perda/inconsistência financeira)
- **Nenhum débito crítico iminente:** As correções matemáticas e a trigger de `DELETE` que causavam bugs foram resolvidas. O motor financeiro (V8) está consistente.

### 🟠 MÉDIOS (Podem gerar bugs futuros)
- **Desacoplamento de Nomenclatura Frontend/Backend:** O frontend ainda busca variáveis chamadas `servicos[]` ou manipula `servicoId`, o que confunde novos mantenedores.
  - *Recomendação:* Padronizar no Frontend as interfaces e variáveis para usarem os nomes literais do banco (`procedimento`, `procedimento_id`).

### 🟡 BAIXOS (Melhorias Arquiteturais)
- **Limpeza de Tabelas Defasadas:** O schema `atendimentos` ainda tem a coluna `procedimento_id` criada pela estrutura legada, ainda que com `delete set null`, mantida por compatibilidade no fallback do frontend.
  - *Recomendação:* Remover a coluna `procedimento_id` fisicamente na próxima grande release e atualizar as Queries (evitar redundância de dados legados).
- **Enums Híbridos:** Enumerações têm `SERVICO_CABELO`, mas as tabelas têm `procedimento`. 
  - *Recomendação:* Renomear na V9 para `PROCEDIMENTO_CABELO`.

---

## 5. RECOMENDAÇÕES PARA A SPRINT 7

1. Excluir ou arquivar fisicamente na pasta `ARQUIVO_MORTO` os arquivos marcados como defasados.
2. Iniciar qualquer novo desenvolvimento **única e exclusivamente baseando-se** nos novos arquivos `.md` criados nesta sprint (`docs/ARQUITETURA.md`, `docs/BANCO_DE_DADOS.md`, etc).
3. Realizar o refactoring do Frontend gradualmente, trocando as variáveis e nomes de estados de `servico` para `procedimento` para alcançar alinhamento universal de nomenclatura.
