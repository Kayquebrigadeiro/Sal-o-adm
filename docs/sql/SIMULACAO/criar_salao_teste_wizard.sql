-- ============================================================================
-- SCRIPT: CRIAR SALÃO DE TESTE (Fluxo Wizard)
-- Finalidade: Criar um salão com status 'não configurado' (configurado = false)
-- para testar o passo-a-passo de configuração inicial do sistema.
-- ============================================================================

-- PASSO 1: Criar o salão (configurado = false para abrir o wizard)
INSERT INTO saloes (nome, configurado)
VALUES ('Salão Teste Wizard', false)
RETURNING id, nome, configurado;

-- ⚠️ ANOTE O ID DO SALÃO QUE APARECEU ACIMA!
-- Vamos usar como exemplo: 'abc123-def456-ghi789'

-- ============================================================================

-- PASSO 2: Criar um usuário no Supabase Authentication
-- Vá em: Authentication > Users > Add User
-- E-mail: teste.wizard@exemplo.com
-- Senha: Teste@123456
-- ⚠️ ANOTE O UUID DO USUÁRIO CRIADO!

-- ============================================================================

-- PASSO 3: Criar o perfil de acesso (substitua os UUIDs)
INSERT INTO perfis_acesso (auth_user_id, salao_id, cargo)
VALUES (
  'UUID_DO_USUARIO_CRIADO',  -- UUID do usuário do Authentication
  'UUID_DO_SALAO_CRIADO',    -- UUID do salão criado no PASSO 1
  'PROPRIETARIA'
);

-- ============================================================================

-- PASSO 4: Criar o login gerado (para login com username)
INSERT INTO logins_gerados (salao_id, username, senha_hash)
VALUES (
  'UUID_DO_SALAO_CRIADO',           -- UUID do salão
  'teste.wizard@exemplo.com',        -- Username (e-mail)
  crypt('Teste@123456', gen_salt('bf'))  -- Senha criptografada
);

-- ============================================================================
-- PRONTO! Agora você pode fazer login com:
-- Username: teste.wizard@exemplo.com
-- Senha: Teste@123456
-- 
-- O wizard vai abrir automaticamente porque configurado = false
-- ============================================================================

-- ============================================================================
-- VERIFICAÇÃO: Conferir se tudo foi criado corretamente
-- ============================================================================

-- Ver o salão criado
SELECT id, nome, configurado, created_at 
FROM saloes 
WHERE nome = 'Salão Teste Wizard';

-- Ver o perfil de acesso
SELECT pa.*, s.nome as salao_nome
FROM perfis_acesso pa
JOIN saloes s ON s.id = pa.salao_id
WHERE s.nome = 'Salão Teste Wizard';

-- Ver o login gerado
SELECT lg.*, s.nome as salao_nome
FROM logins_gerados lg
JOIN saloes s ON s.id = lg.salao_id
WHERE s.nome = 'Salão Teste Wizard';

-- ============================================================================
-- LIMPEZA: Para deletar o salão de teste depois
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

-- 7. Deletar salão
DELETE FROM saloes WHERE id = 'UUID_DO_SALAO';

-- 8. Deletar usuário do Authentication (fazer manualmente no painel)
-- Vá em: Authentication > Users > Encontre o usuário > Delete
*/
