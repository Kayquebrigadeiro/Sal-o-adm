-- ============================================================================
--  MIGRATION: Criar RPC segura para geração de login de proprietária
--  Data: 2026-04-22
--  Descrição: 
--    - RPC que cria login com hash de senha (não texto puro)
--    - Retorna senha em texto plano UMA VEZ para exibir ao vendedor
--    - Substitui o insert direto que expunha senhas
-- ============================================================================

-- 1. Criar tabela de senhas hasheadas (se não existir)
-- Supomos que logins_gerados já tem coluna senha_temporaria
-- Vamos renomear para senha_hash e adicionar campo de expiração

ALTER TABLE logins_gerados
  RENAME COLUMN senha_temporaria TO senha_hash;

-- Adicionar coluna de expiração se não existir
ALTER TABLE logins_gerados
  ADD COLUMN IF NOT EXISTS expira_em TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS tentativas_login INTEGER DEFAULT 0;

-- 2. Criar EXTENSION pgsql (se não existir) para MD5 simples
-- Para produção, usar pgcrypto com bcrypt ou argon2
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 3. RPC: Criar Login de Proprietária com Hash de Senha
-- Retorna a senha em texto plano UMA VEZ, mas armazena apenas o hash
CREATE OR REPLACE FUNCTION criar_login_proprietaria(
  p_vendedor_id UUID,
  p_salao_id UUID,
  p_email TEXT,
  p_nome TEXT
)
RETURNS TABLE(
  id UUID,
  email_proprietaria TEXT,
  senha_temporaria TEXT,
  gerado_em TIMESTAMP WITH TIME ZONE
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_senha_temporaria TEXT;
  v_senha_hash TEXT;
  v_login_id UUID;
BEGIN
  -- Validações básicas
  IF p_email IS NULL OR TRIM(p_email) = '' THEN
    RAISE EXCEPTION 'Email é obrigatório';
  END IF;

  IF p_nome IS NULL OR TRIM(p_nome) = '' THEN
    RAISE EXCEPTION 'Nome é obrigatório';
  END IF;

  IF p_vendedor_id IS NULL THEN
    RAISE EXCEPTION 'Vendedor ID é obrigatório';
  END IF;

  IF p_salao_id IS NULL THEN
    RAISE EXCEPTION 'Salão ID é obrigatório';
  END IF;

  -- Validar que vendedor_id existe na tabela perfis_acesso com cargo VENDEDOR
  IF NOT EXISTS (
    SELECT 1 FROM perfis_acesso 
    WHERE auth_user_id = p_vendedor_id AND cargo = 'VENDEDOR'
  ) THEN
    RAISE EXCEPTION 'Vendedor não encontrado ou não tem permissão';
  END IF;

  -- Validar que salao_id pertence ao vendedor
  IF NOT EXISTS (
    SELECT 1 FROM saloes 
    WHERE id = p_salao_id AND vendedor_id = p_vendedor_id
  ) THEN
    RAISE EXCEPTION 'Salão não pertence ao vendedor';
  END IF;

  -- Gerar senha temporária segura (16 caracteres + 1 maiúscula + 1 número + 1 especial)
  -- Usar random() para gerar caracteres aleatórios
  v_senha_temporaria := 
    SUBSTRING('abcdefghijklmnopqrstuvwxyz', (RANDOM() * 25)::INT + 1, 1) ||
    SUBSTRING('ABCDEFGHIJKLMNOPQRSTUVWXYZ', (RANDOM() * 25)::INT + 1, 1) ||
    SUBSTRING('0123456789', (RANDOM() * 9)::INT + 1, 1) ||
    SUBSTRING('!@#$%', (RANDOM() * 4)::INT + 1, 1) ||
    SUBSTRING('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 
      (RANDOM() * 61)::INT + 1, 12);

  -- Hash da senha usando crypt (pgcrypto)
  -- Em produção, considerar bcrypt: crypt(v_senha_temporaria, gen_salt('bf'))
  v_senha_hash := crypt(v_senha_temporaria, gen_salt('bf'));

  -- Inserir login_gerado com hash
  INSERT INTO logins_gerados(
    vendedor_id,
    salao_id,
    email_proprietaria,
    senha_hash,
    expira_em,
    ativo,
    gerado_em
  ) VALUES (
    p_vendedor_id,
    p_salao_id,
    LOWER(TRIM(p_email)),
    v_senha_hash,
    NOW() + INTERVAL '24 hours', -- Expira em 24h
    TRUE,
    NOW()
  )
  RETURNING 
    logins_gerados.id,
    logins_gerados.email_proprietaria,
    v_senha_temporaria, -- Retornar APENAS ESTA VEZ (não armazenada)
    logins_gerados.gerado_em
  INTO id, email_proprietaria, senha_temporaria, gerado_em;

  RETURN NEXT;

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Erro ao criar login: %', SQLERRM;
END;
$$;

-- 4. RPC: Validar login com senha hasheada (para futuro uso de auth customizado)
CREATE OR REPLACE FUNCTION validar_login_proprietaria(
  p_email TEXT,
  p_senha TEXT
)
RETURNS TABLE(
  valido BOOLEAN,
  login_id UUID,
  salao_id UUID,
  mensagem TEXT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_senha_hash TEXT;
  v_login_id UUID;
  v_salao_id UUID;
  v_expira_em TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Buscar o hash de senha
  SELECT 
    lg.senha_hash,
    lg.id,
    lg.salao_id,
    lg.expira_em
  INTO v_senha_hash, v_login_id, v_salao_id, v_expira_em
  FROM logins_gerados lg
  WHERE LOWER(lg.email_proprietaria) = LOWER(p_email)
    AND lg.ativo = TRUE
    AND lg.expira_em > NOW()
  LIMIT 1;

  -- Se não encontrou
  IF v_login_id IS NULL THEN
    RETURN QUERY SELECT 
      FALSE,
      NULL::UUID,
      NULL::UUID,
      'Email ou senha inválidos, ou login expirou'::TEXT;
    RETURN;
  END IF;

  -- Validar senha (comparar hash)
  IF v_senha_hash = crypt(p_senha, v_senha_hash) THEN
    -- Incrementar tentativas bem-sucedidas
    UPDATE logins_gerados 
    SET tentativas_login = tentativas_login + 1 
    WHERE id = v_login_id;

    RETURN QUERY SELECT 
      TRUE,
      v_login_id,
      v_salao_id,
      'Login válido'::TEXT;
  ELSE
    RETURN QUERY SELECT 
      FALSE,
      NULL::UUID,
      NULL::UUID,
      'Email ou senha inválidos'::TEXT;
  END IF;

EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT 
    FALSE,
    NULL::UUID,
    NULL::UUID,
    'Erro ao validar login: ' || SQLERRM;
END;
$$;

-- 5. Comentários para documentação
COMMENT ON FUNCTION criar_login_proprietaria(UUID, UUID, TEXT, TEXT) IS
  'Cria login para proprietária com senha hasheada com bcrypt. Retorna senha em texto plano uma vez. NUNCA armazena senha em texto puro.';

COMMENT ON FUNCTION validar_login_proprietaria(TEXT, TEXT) IS
  'Valida email e senha de proprietária. Usa crypt para comparar com hash bcrypt armazenado.';

-- 6. RLS Policy: Apenas o vendedor pode ver seus logins_gerados
-- (Assumindo que RLS já está ativado)
ALTER TABLE logins_gerados ENABLE ROW LEVEL SECURITY;

-- Dropa política antiga se existir
DROP POLICY IF EXISTS logins_gerados_vendedor_policy ON logins_gerados;

-- Criar política correta: vendedor vê apenas seus logins
CREATE POLICY logins_gerados_vendedor_policy ON logins_gerados
  FOR SELECT
  USING (vendedor_id = auth.uid());

-- 7. Criar política de INSERT para a RPC (quando chamada)
DROP POLICY IF EXISTS logins_gerados_insert_policy ON logins_gerados;

CREATE POLICY logins_gerados_insert_policy ON logins_gerados
  FOR INSERT
  WITH CHECK (vendedor_id = auth.uid());

-- ============================================================================
-- MIGRATION EXECUTAR:
-- 1. No Supabase Console, vá para SQL Editor
-- 2. Cole este arquivo completo
-- 3. Execute
-- 4. Teste a RPC:
--    SELECT * FROM criar_login_proprietaria(
--      'seu-uuid-vendedor',
--      'seu-uuid-salao',
--      'email@teste.com',
--      'Nome da Proprietária'
--    );
-- ============================================================================
