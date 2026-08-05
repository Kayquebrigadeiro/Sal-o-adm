Corrija dois bugs específicos e já conhecidos no `/backend-node/`. Siga as instruções de economia de tokens abaixo à risca — este é um projeto com orçamento de tokens limitado.

## REGRAS DE ECONOMIA DE TOKENS (obrigatório seguir)

1. NÃO leia o projeto inteiro. Leia APENAS os arquivos citados abaixo, e só eles.
2. NÃO rode `ls -R`, `find .`, ou qualquer varredura ampla de diretório. Se precisar confirmar algo, use `grep` pontual e específico, nunca abra pastas inteiras.
3. NÃO peça pra ver o schema completo do banco de novo — a estrutura real já está descrita abaixo, use exatamente ela como verdade absoluta, sem consultar `docs/sql/` ou qualquer arquivo do Supabase/Postgres.
4. NÃO rode testes exploratórios repetidos. Faça a correção, teste UMA vez via curl (comandos já prontos abaixo), e só repita se o erro for diferente do esperado.
5. NÃO gere relatórios longos, resumos extensos, tabelas de decisões, ou explicações de arquitetura. Ao final, responda só com: lista de arquivos alterados (1 linha cada) + resultado do teste final (sucesso ou erro). Nada além disso.
6. NÃO reformate ou "melhore" código que não está relacionado ao bug (sem refatorações espontâneas, sem trocar estilo, sem adicionar comentários extras).
7. Se after 2 tentativas o erro persistir, PARE e me diga exatamente a mensagem de erro — não fique tentando variações sozinho gastando tokens.

## Estrutura real das tabelas (não precisa consultar o banco, já está confirmada)

```sql
-- atendimentos
id CHAR(36), salao_id CHAR(36), data DATE, horario TIME,
profissional_id CHAR(36), procedimento_id CHAR(36) (procedimento PRINCIPAL),
comprimento ENUM('P','M','G'), cliente TEXT (nome livre, NÃO é FK),
valor_cobrado, valor_pago, valor_pendente, valor_maquininha,
valor_profissional, custo_fixo, custo_variavel, lucro_liquido, lucro_possivel (DECIMAL),
status ENUM('AGENDADO','EXECUTADO','CANCELADO')

-- atendimento_procedimentos (procedimentos ADICIONAIS além do principal)
id CHAR(36), atendimento_id CHAR(36) (FK), procedimento_id CHAR(36) (FK),
comprimento ENUM('P','M','G'), valor_indicado, valor_cobrado, valor_pago,
valor_pendente (DECIMAL), sequencia INT
```

## Bug 1: UUID não gerado corretamente

Arquivos a abrir (só estes): `src/controllers/salao.controller.js`, `src/controllers/admin.controller.js`, `src/controllers/usuarios.controller.js`, `src/controllers/atendimentos.controller.js`

Em todos: qualquer `INSERT INTO` cujo resultado (`result.insertId`) seja usado depois para popular uma foreign key em outro INSERT está ERRADO — `insertId` só funciona com `AUTO_INCREMENT`, e nossas tabelas usam `CHAR(36)`. Corrija assim:
- `npm install uuid` (se ainda não tiver)
- No topo do arquivo: `const { v4: uuidv4 } = require('uuid');`
- Antes de cada INSERT que precisa do ID: `const novoId = uuidv4();`
- Inclua a coluna `id` explicitamente no INSERT com esse valor, em vez de confiar no `DEFAULT (UUID())` do banco.

## Bug 2: atendimentos.controller.js usa schema errado

Reescreva o `criarAtendimento` para bater com a estrutura real acima:
- Body esperado: `{ cliente (string), data, horario, profissional_id, procedimento_id, comprimento, valor_cobrado, valor_pago, procedimentos_adicionais: [] (opcional) }`
- `cliente` é sempre string livre, nunca um `cliente_id`.
- 1 INSERT em `atendimentos` com o procedimento principal + valores calculados via `financialEngine.service.js`.
- Se `procedimentos_adicionais` vier preenchido, 1 INSERT em `atendimento_procedimentos` por item, cada um com seus valores calculados.
- Tudo em uma transação.

Verifique também `src/controllers/crud.controller.js` (factory genérico): confirme rapidamente com um `grep -n "nome_da_coluna_suspeita" src/controllers/crud.controller.js` se ele assume nomes de coluna inexistentes (tipo `cliente_id` ou `data_atendimento`) — só corrija se encontrar, não reescreva o arquivo inteiro à toa.

## Teste único ao final (rode uma vez, nessa ordem)

```bash
TOKEN=$(curl -s -X POST http://localhost:3333/auth/login -H "Content-Type: application/json" -d '{"email":"SEU_EMAIL_DE_TESTE@exemplo.com","senha":"SUA_SENHA_DE_TESTE"}' | grep -o '"token":"[^"]*' | cut -d'"' -f4)

curl -s -X POST http://localhost:3333/salao/criar-proprietaria -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"email":"salaoteste@teste.com","senha":"Teste123!","nome":"Maria Teste","nome_salao":"Salão de Teste","telefone":"11999999999","vendedor_id":"SEU_VENDEDOR_ID"}'
```

Se retornar `{"sucesso":true,...}`, pare aí e me reporte só isso: arquivos alterados + "sucesso". Não continue testando atendimento ainda — isso fica pra uma próxima tarefa separada, pra não gastar mais tokens nessa mesma sessão.