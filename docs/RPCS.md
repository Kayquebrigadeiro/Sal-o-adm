# REMOTE PROCEDURE CALLS (RPCS / FUNÇÕES) — V2

As Remote Procedure Calls permitem com que o Frontend invoque funções completas e transacionais dentro do Banco de Dados, transferindo complexidade pesada ou lógica crítica para execução atômica no backend.

## 1. TRANSAÇÕES DE ATENDIMENTO

A mais complexa e vitrine tecnológica do "Salão Secreto" na Sprint 3.

### `inserir_atendimento_completo`
A inserção tradicional sofria do problema de concorrência e instabilidade de conexão (o cabeçalho do atendimento era gravado, mas a requisição secundária para inserir os procedimentos caía, resultando em "Atendimento Órfão" com preço zerado).
- **Finalidade:** Criar de forma atômica (tudo ou nada) a árvore de relacionamento.
- **Transação:** Salva a tupla base na tabela `atendimentos`. Utilizando o `RETURNING id`, faz um `FOR EACH` no JSON Array dos múltiplos procedimentos e cria os filhos na tabela `atendimento_procedimentos`.
- Se qualquer dado estiver nulo ou errado, aciona um Rollback generalizado. O Banco não fica com "sujeira".

### `atualizar_atendimento_completo`
Mesma vertente de `inserir`, dedicada às edições.
- Ela desanexa as velhas conexões de `atendimento_procedimentos` se necessário e acopla a nova lista enviada pelo frontend na requisição de edição.

## 2. UTILITÁRIOS GERAIS

### `fn_gerar_username`
Executada via triggers nativamente ou avulsas, cuida da sanitização do nome completo do usuário para remover caracteres especiais, aplicar lowercase e transformar "Maria Cláudia" em um @username apto para Login (`maria_claudia_491`).

### `fn_gerar_senha_aleatoria`
Usada nos Onboardings pelo módulo de Vendedor. Ela acopla 12 caracteres pseudo-randômicos e seguros.

### `fn_deletar_salao`
Gerencia a suspensão amigável dos dados.
- **Motivação:** Hard deletes (`DELETE FROM saloes`) causam colapso no banco e violam histórico financeiro/contábil (as cascatas iriam varrer faturamentos de 2 anos atrás).
- Ao invés de um delete padrão, a RPC realiza um *Soft Delete* carimbando o campo `deletado_em = now()` e o bloqueio `ativo = false`, inviabilizando Login daquele tenant, mantendo a documentação intocada internamente.

### `get_email_from_username`
Permite a tradução inversa de Login (Username -> Auth Email) com Segurança de Acesso definida.
