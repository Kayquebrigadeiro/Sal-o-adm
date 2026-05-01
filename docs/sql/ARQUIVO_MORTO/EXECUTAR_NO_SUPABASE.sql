-- ============================================================
--  🔧 CORREÇÕES PARA O BANCO DE DADOS
--  Execute este arquivo no Supabase SQL Editor
-- ============================================================

-- 1. Corrigir função fn_gerar_username (remover sintaxe pipe operator)
CREATE OR REPLACE FUNCTION fn_gerar_username(p_nome text)
RETURNS text AS $$
DECLARE
  v_username text;
BEGIN
  -- Remove acentos e caracteres especiais
  v_username := lower(p_nome);
  v_username := replace(v_username, ' ', '_');
  v_username := replace(v_username, 'ã', 'a');
  v_username := replace(v_username, 'á', 'a');
  v_username := replace(v_username, 'â', 'a');
  v_username := replace(v_username, 'à', 'a');
  v_username := replace(v_username, 'é', 'e');
  v_username := replace(v_username, 'ê', 'e');
  v_username := replace(v_username, 'í', 'i');
  v_username := replace(v_username, 'ó', 'o');
  v_username := replace(v_username, 'ô', 'o');
  v_username := replace(v_username, 'õ', 'o');
  v_username := replace(v_username, 'ú', 'u');
  v_username := replace(v_username, 'ç', 'c');
  v_username := regexp_replace(v_username, '[^a-z0-9_]', '', 'g');
  v_username := regexp_replace(v_username, '_+', '_', 'g');
  v_username := substring(v_username, 1, 20);
  
  RETURN coalesce(nullif(v_username, ''), 'user_' || to_char(now(), 'DDMMYYHH24MISS'));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 2. Verificar se tabela logins_gerados existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'logins_gerados') THEN
    CREATE TABLE logins_gerados (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      vendedor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      salao_id uuid NOT NULL REFERENCES saloes(id) ON DELETE CASCADE,
      username text NOT NULL,
      senha_temporaria text NOT NULL,
      auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
      gerado_em timestamptz DEFAULT now(),
      alterado_em timestamptz,
      ativo boolean DEFAULT true,
      UNIQUE(salao_id, username)
    );

    CREATE INDEX idx_logins_vendedor ON logins_gerados(vendedor_id);
    CREATE INDEX idx_logins_salao ON logins_gerados(salao_id);
    CREATE INDEX idx_logins_username ON logins_gerados(username);

    ALTER TABLE logins_gerados ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Vendedor vê seus logins" ON logins_gerados 
      FOR ALL TO authenticated 
      USING (vendedor_id = auth.uid());
  END IF;
END $$;

-- 3. Recriar trigger de registro de login
DROP TRIGGER IF EXISTS on_auth_user_login_registered ON auth.users;

CREATE OR REPLACE FUNCTION fn_registrar_login_gerado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_salao_id uuid;
  v_vendedor_id uuid;
  v_username text;
  v_senha text;
  v_cargo text;
BEGIN
  v_salao_id := (new.raw_user_meta_data->>'salao_id')::uuid;
  v_vendedor_id := (new.raw_user_meta_data->>'vendedor_id')::uuid;
  v_username := coalesce((new.raw_user_meta_data->>'username'), fn_gerar_username(new.email));
  v_senha := coalesce((new.raw_user_meta_data->>'senha'), fn_gerar_senha_aleatoria(12));
  v_cargo := new.raw_user_meta_data->>'cargo';

  -- Se for PROPRIETARIO, registrar o login gerado
  IF v_cargo = 'PROPRIETARIO' AND v_salao_id IS NOT NULL AND v_vendedor_id IS NOT NULL THEN
    INSERT INTO public.logins_gerados (vendedor_id, salao_id, username, senha_temporaria, auth_user_id, ativo)
    VALUES (v_vendedor_id, v_salao_id, v_username, v_senha, new.id, true)
    ON CONFLICT (salao_id, username) DO UPDATE SET
      auth_user_id = new.id,
      senha_temporaria = v_senha,
      alterado_em = now();
  END IF;

  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_login_registered
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.fn_registrar_login_gerado();

-- 4. Verificar se função fn_gerar_senha_aleatoria existe
CREATE OR REPLACE FUNCTION fn_gerar_senha_aleatoria(length int DEFAULT 12)
RETURNS text AS $$
DECLARE
  chars text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
  result text := '';
  i int;
BEGIN
  FOR i IN 1..length LOOP
    result := result || substr(chars, floor(random() * length(chars))::int + 1, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- ✅ PRONTO! Agora teste criando um salão
-- ============================================================
-- 
-- COMO TESTAR:
-- 1. Execute este SQL no Supabase
-- 2. Vá no frontend: npm run dev
-- 3. Faça login como vendedor
-- 4. Crie um novo salão
-- 5. Verifique a tabela logins_gerados no Supabase
-- 
-- SELECT * FROM logins_gerados ORDER BY gerado_em DESC;
-- ============================================================
