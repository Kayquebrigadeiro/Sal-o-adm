-- ============================================================
-- MIGRATION: Sistema de Login com Username
-- ============================================================
-- Execute este script no Supabase SQL Editor
-- ============================================================

-- 1. Adicionar coluna username na tabela perfis_acesso (se não existir)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'perfis_acesso' AND column_name = 'username'
  ) THEN
    ALTER TABLE perfis_acesso ADD COLUMN username text;
    CREATE INDEX idx_perfis_username ON perfis_acesso(username);
  END IF;
END $$;

-- 2. Atualizar a função handle_new_user_salao para suportar username
CREATE OR REPLACE FUNCTION public.handle_new_user_salao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_salao_id uuid;
  v_cargo cargo_enum;
  v_vendedor_id uuid;
  v_username text;
BEGIN
  v_salao_id := (new.raw_user_meta_data->>'salao_id')::uuid;
  v_cargo    := coalesce((new.raw_user_meta_data->>'cargo')::cargo_enum, 'PROPRIETARIO'::cargo_enum);
  v_vendedor_id := (new.raw_user_meta_data->>'vendedor_id')::uuid;
  v_username := new.raw_user_meta_data->>'username';

  -- Se for VENDEDOR, não precisa de salão
  IF v_cargo = 'VENDEDOR' THEN
    INSERT INTO public.perfis_acesso (auth_user_id, salao_id, cargo, username)
    VALUES (new.id, '00000000-0000-0000-0000-000000000000', v_cargo, v_username);
    RETURN new;
  END IF;

  -- Para PROPRIETARIO/FUNCIONARIO, precisa salão
  IF v_salao_id IS NULL THEN
    INSERT INTO public.saloes (nome, vendedor_id)
    VALUES ('Salão de ' || coalesce(v_username, new.email, 'Usuário'), v_vendedor_id)
    RETURNING id INTO v_salao_id;

    INSERT INTO public.configuracoes (salao_id, custo_fixo_por_atendimento, taxa_maquininha_pct)
    VALUES (v_salao_id, 29.00, 5.00);
  END IF;

  INSERT INTO public.perfis_acesso (auth_user_id, salao_id, cargo, username)
  VALUES (new.id, v_salao_id, v_cargo, v_username);

  RETURN new;
END;
$$;

-- 3. Recriar o trigger (garantir que está ativo)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_salao();

-- ============================================================
-- ✅ MIGRATION COMPLETA
-- ============================================================
-- 
-- O QUE FOI FEITO:
-- ✓ Adicionada coluna 'username' na tabela perfis_acesso
-- ✓ Atualizada função handle_new_user_salao para suportar username
-- ✓ Sistema agora aceita login por username (convertido para email@sistema.local)
-- ✓ Mantém compatibilidade com emails existentes
--
-- COMO FUNCIONA:
-- 1. Ao criar salão, gera username automaticamente (ex: maria_silva)
-- 2. Internamente cria email: maria_silva@sistema.local
-- 3. No login, se não tiver @, adiciona @sistema.local automaticamente
-- 4. Proprietária usa apenas o username para login
--
-- PRÓXIMOS PASSOS:
-- 1. Execute este script no Supabase SQL Editor
-- 2. Teste criando um novo salão
-- 3. Anote o username e senha gerados
-- 4. Faça login usando apenas o username
-- ============================================================
