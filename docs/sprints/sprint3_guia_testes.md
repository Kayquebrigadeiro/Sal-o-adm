# GUIA DE TESTES - SPRINT 3

## 🎯 Objetivo
Validar se a implementação de múltiplos serviços funciona corretamente.

---

## ✅ TESTE 1: Aplicar Migração SQL

### Passos:
1. Abra seu Supabase (https://supabase.com)
2. Vá para: **SQL Editor** → **New Query**
3. Abra o arquivo: `/docs/sql/MIGRATION_MULTIPLOS_SERVICOS_SPRINT3.sql`
4. **Copie todo o conteúdo** e cole na query do Supabase
5. Clique **Run** (ou Ctrl+Enter)

### O que validar:
- ✅ Sem erros SQL
- ✅ Tabela `atendimento_procedimentos` criada
- ✅ Trigger `trg_atend_proc_totais` criada
- ✅ View `v_atendimentos_completo` criada

### Query de validação:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_name = 'atendimento_procedimentos';
```
Deve retornar uma linha com `atendimento_procedimentos`.

---

## ✅ TESTE 2: Interface - Adicionar Serviço

### Passos:
1. Abra a aplicação (agendador)
2. Clique em um **horário vago** na grade
3. Modal abre
4. Preencha:
   - Cliente: Digite um nome
   - Procedimento: Selecione um procedimento
   - Tamanho: Selecione P/M/G (se aplicável)
   - Valor: Digite um valor (ex: 150,00)
5. **Clique "➕ ADICIONAR SERVIÇO À LISTA"**

### O que observar:
- ✅ Toast verde: "➕ SERVIÇO ADICIONADO À LISTA"
- ✅ Card **"SERVIÇOS ADICIONADOS (1)"** aparece
- ✅ Serviço está listado no card
- ✅ Mostra nome, valor, tamanho
- ✅ Botões ✏️ e 🗑️ visíveis
- ✅ Formulário limpou (procId = vazio)
- ✅ Resumo: "TOTAL A COBRAR: R$ 150,00"

---

## ✅ TESTE 3: Adicionar Segundo Serviço

### Passos:
1. Formulário está vazio após primeira adição
2. Selecione **outro procedimento**
3. Digite novo valor (ex: 100,00)
4. Clique "Adicionar Serviço" (dentro do card)

### O que observar:
- ✅ Toast verde: "➕ SERVIÇO ADICIONADO À LISTA"
- ✅ Card agora mostra "SERVIÇOS ADICIONADOS (2)"
- ✅ Ambos serviços aparecem na lista
- ✅ Resumo: "TOTAL A COBRAR: R$ 250,00" (150 + 100)

---

## ✅ TESTE 4: Editar um Serviço

### Passos:
1. No card de serviços, clique no botão **✏️** de qualquer serviço
2. Formulário preencheu com dados do serviço
3. **Mude o valor** (ex: era 100, coloca 120)
4. Clique "Adicionar Serviço" (agora deve estar em modo edição)

### O que observar:
- ✅ Toast: "📝 EDITANDO SERVIÇO DA LISTA"
- ✅ Formulário preencheu com dados do serviço
- ✅ Após editar, toast: "✏️ SERVIÇO ATUALIZADO NA LISTA"
- ✅ Valor na lista mudou
- ✅ Resumo atualizado: "TOTAL A COBRAR: R$ 270,00" (150 + 120)
- ✅ Modo edição saiu (edicaoServico = null)

---

## ✅ TESTE 5: Remover um Serviço

### Passos:
1. No card de serviços, clique no botão **🗑️** de qualquer serviço
2. Serviço será removido

### O que observar:
- ✅ Toast: "🗑️ SERVIÇO REMOVIDO DA LISTA"
- ✅ Serviço sumiu da lista
- ✅ Card atualiza para "SERVIÇOS ADICIONADOS (N-1)"
- ✅ Resumo atualiza: "TOTAL A COBRAR: R$ 150,00"

---

## ✅ TESTE 6: Validação - Confirmar com Serviços

### Passos:
1. Tenha pelo menos **1 serviço** na lista
2. Clique botão **"✅ CONFIRMAR AGENDAMENTO (N SERVIÇOS)"**

### O que observar:
- ✅ Button está **HABILITADO** (não está cinza)
- ✅ Clique trabalha
- ✅ Toast: "✅ CLIENTE ÀS HORÁRIO | N SERVIÇOS | TOTAL: R$ XXXX"
- ✅ Modal fecha
- ✅ Agendamento aparece na grade
- ✅ Página recarrega

---

## ✅ TESTE 7: Validação - Sem Serviços

### Passos:
1. Abra modal (sem nenhum serviço adicionado)
2. Olhe para o botão final

### O que observar:
- ✅ Botão está **DESABILITADO** (cinza)
- ✅ Texto: "ADICIONE UM SERVIÇO PARA CONTINUAR"
- ✅ Não consegue clicar

---

## ✅ TESTE 8: Banco de Dados - Verificar Registros

### Passos:
1. Após salvar um agendamento com 2 serviços
2. Abra Supabase → SQL Editor
3. Execute:
```sql
SELECT * FROM atendimento_procedimentos 
WHERE atendimento_id = 'PUT_THE_ID_HERE'
ORDER BY sequencia;
```
4. Substitua `PUT_THE_ID_HERE` pelo ID do agendamento que criou

### O que observar:
- ✅ Retorna **2 registros** (um por procedimento)
- ✅ Cada registro tem:
  - `atendimento_id` = ID do agendamento
  - `procedimento_id` = ID do procedimento
  - `valor_cobrado` = Valor digitado
  - `sequencia` = 1, 2, etc.

---

## ✅ TESTE 9: Banco de Dados - Sincronização de Totais

### Passos:
1. Após salvar um agendamento com 2 serviços (valor 150 + valor 100)
2. Abra Supabase → SQL Editor
3. Execute:
```sql
SELECT valor_cobrado FROM atendimentos 
WHERE id = 'PUT_THE_ID_HERE';
```

### O que observar:
- ✅ Retorna **250.00** (soma dos dois serviços)
- ✅ Prova que a trigger sincronizou corretamente

---

## ✅ TESTE 10: Compatibilidade - Dados Antigos

### Passos:
1. Verifique se há agendamentos criados ANTES desta implementação
2. Execute:
```sql
SELECT COUNT(*) FROM atendimento_procedimentos;
```

### O que observar:
- ✅ Se havia agendamentos antigos, devem estar migrados
- ✅ Cada um terá um registro em `atendimento_procedimentos`
- ✅ Não teve nenhum erro de migrate

---

## 📊 CHECKLIST DE TESTES

| Teste | Descrição | Status | 
|-------|-----------|--------|
| 1 | Migração SQL aplicada | ☐ |
| 2 | Adicionar primeiro serviço | ☐ |
| 3 | Adicionar segundo serviço | ☐ |
| 4 | Editar um serviço | ☐ |
| 5 | Remover um serviço | ☐ |
| 6 | Confirmar agendamento | ☐ |
| 7 | Validação (sem serviços desabilitado) | ☐ |
| 8 | Registros criados no banco | ☐ |
| 9 | Totais sincronizados | ☐ |
| 10 | Compatibilidade com dados antigos | ☐ |

---

## 🐛 Troubleshooting

### Problema: Migração SQL falha
**Solução:** 
- Verifique se a tabela `atendimento_procedimentos` já não existe
- Se existe, delete-a primeiro e execute novamente

### Problema: Botão "ADICIONAR SERVIÇO" não aparece
**Solução:**
- Verifique se você selecionou um procedimento
- Verifique se você preencheu um valor

### Problema: Serviço não aparece no card
**Solução:**
- Abra o console (F12 → Console)
- Procure por erros JavaScript
- Verifique se nenhuma exceção foi lançada

### Problema: Total está incorreto
**Solução:**
- Verifique a query: `SELECT SUM(valor_cobrado) FROM atendimento_procedimentos WHERE atendimento_id = 'xxx'`
- Compare com `SELECT valor_cobrado FROM atendimentos WHERE id = 'xxx'`
- Devem ser iguais

### Problema: Edição não funciona
**Solução:**
- Verifique se o formulário está preenchido corretamente
- Clique no botão ✏️ de novo
- Mude o valor e clique "Adicionar Serviço"

---

## 📝 Notas

- **Sem dados**, o button "Adicionar Serviço" não aparece até você preencher procedimento + valor
- **Toast messages** confirmam cada ação
- **Resumo de totais** atualiza em tempo real
- **Edição** só funciona se selecionar um procedimento + valor + clicar ✏️

---

## ✨ Sucesso!

Se todos os testes passarem:
1. Parabéns! Sprint 3 está funcionando
2. Você pode prosseguir para as próximas sprints
3. Documente quaisquer bugs encontrados
