-- ============================================================================
-- SCRIPT: CRIAR SALAO DE TESTE
-- Finalidade: Criar um salao pronto para teste, sem wizard inicial.
-- ============================================================================

-- PASSO 1: Criar o salao ja configurado
INSERT INTO saloes (nome, configurado)
VALUES ('Salao Teste', true)
RETURNING id, nome, configurado;

-- ANOTE O ID DO SALAO QUE APARECEU ACIMA.
-- Vamos usar como exemplo: 'abc123-def456-ghi789'

-- ============================================================================

-- PASSO 2: Criar um usuario no Supabase Authentication
-- Va em: Authentication > Users > Add User
-- E-mail: teste.wizard@exemplo.com
-- Senha: Teste@123456
-- ANOTE O UUID DO USUARIO CRIADO.

-- ============================================================================

-- PASSO 3: Criar o perfil de acesso (substitua os UUIDs)
INSERT INTO perfis_acesso (auth_user_id, salao_id, cargo)
VALUES (
  'UUID_DO_USUARIO_CRIADO',
  'UUID_DO_SALAO_CRIADO',
  'PROPRIETARIA'
);

-- ============================================================================

-- PASSO 4: Criar o login gerado (para login com username)
INSERT INTO logins_gerados (salao_id, username, senha_hash)
VALUES (
  'UUID_DO_SALAO_CRIADO',
  'teste.wizard@exemplo.com',
  crypt('Teste@123456', gen_salt('bf'))
);

-- ============================================================================
-- PRONTO! Agora voce pode fazer login com:
-- Username: teste.wizard@exemplo.com
-- Senha: Teste@123456
--
-- O sistema vai abrir direto no painel principal.
-- ============================================================================

-- ============================================================================
-- VERIFICACAO: Conferir se tudo foi criado corretamente
-- ============================================================================

SELECT id, nome, configurado, created_at
FROM saloes
WHERE nome = 'Salao Teste';

SELECT pa.*, s.nome as salao_nome
FROM perfis_acesso pa
JOIN saloes s ON s.id = pa.salao_id
WHERE s.nome = 'Salao Teste';

SELECT lg.*, s.nome as salao_nome
FROM logins_gerados lg
JOIN saloes s ON s.id = lg.salao_id
WHERE s.nome = 'Salao Teste';

-- ============================================================================
-- LIMPEZA: Para deletar o salao de teste depois
-- ============================================================================

/*
-- Descomente para deletar tudo:

-- 1. Deletar atendimentos
DELETE FROM atendimentos WHERE salao_id = 'UUID_DO_SALAO';

-- 2. Deletar despesas
DELETE FROM despesas WHERE salao_id = 'UUID_DO_SALAO';

-- 3. Deletar procedimentos
DELETE FROM procedimentos WHERE salao_id = 'UUID_DO_SALAO';

-- 4. Deletar profissionais
DELETE FROM profissionais WHERE salao_id = 'UUID_DO_SALAO';

-- 5. Deletar login gerado
DELETE FROM logins_gerados WHERE salao_id = 'UUID_DO_SALAO';

-- 6. Deletar perfil de acesso
DELETE FROM perfis_acesso WHERE salao_id = 'UUID_DO_SALAO';

-- 7. Deletar salao
DELETE FROM saloes WHERE id = 'UUID_DO_SALAO';

-- 8. Deletar usuario do Authentication (fazer manualmente no painel)
-- Va em: Authentication > Users > Encontre o usuario > Delete
*/
