-- ════════════════════════════════════════════════════════════════════════════
-- MIGRATION: Corrigir suporte a VENDEDOR (permitir salao_id NULL)
-- ════════════════════════════════════════════════════════════════════════════
-- Execute este script no Supabase SQL Editor
-- ════════════════════════════════════════════════════════════════════════════

-- 1️⃣ Permitir que salao_id seja NULL (para vendedores)
ALTER TABLE public.perfis_acesso 
ALTER COLUMN salao_id DROP NOT NULL;

-- 2️⃣ Criar salão "dummy" para vendedores (se não existir)
INSERT INTO public.saloes (id, nome, ativo, vendedor_id)
VALUES (
  '00000000-0000-0000-0000-000000000000'::uuid,
  '🔧 Sistema - Vendedores',
  false,
  NULL
)
ON CONFLICT (id) DO NOTHING;

-- 3️⃣ Atualizar RLS policies para suportar vendedores

-- Remover policy antiga de perfis_acesso
DROP POLICY IF EXISTS "Read own profile" ON perfis_acesso;

-- Nova policy: usuário vê seu próprio perfil
CREATE POLICY "Read own profile" 
  ON perfis_acesso 
  FOR SELECT 
  TO authenticated 
  USING (auth_user_id = auth.uid());

-- Remover policy antiga de saloes
DROP POLICY IF EXISTS "Saloes isolation" ON saloes;

-- Nova policy: vendedor vê todos os salões que criou, outros veem apenas o seu
CREATE POLICY "Saloes isolation" 
  ON saloes 
  FOR ALL 
  TO authenticated 
  USING (
    -- Vendedor vê todos os salões que criou
    vendedor_id = auth.uid()
    OR
    -- Proprietário/Funcionário vê apenas seu salão
    id IN (
      SELECT salao_id 
      FROM perfis_acesso 
      WHERE auth_user_id = auth.uid() 
        AND salao_id IS NOT NULL
    )
  );

-- 4️⃣ Atualizar função de criação de usuário para suportar vendedor sem salão
CREATE OR REPLACE FUNCTION public.handle_new_user_salao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_salao_id uuid;
  v_cargo cargo_enum;
  v_vendedor_id uuid;
BEGIN
  v_salao_id := (new.raw_user_meta_data->>'salao_id')::uuid;
  v_cargo    := coalesce((new.raw_user_meta_data->>'cargo')::cargo_enum, 'PROPRIETARIO'::cargo_enum);
  v_vendedor_id := (new.raw_user_meta_data->>'vendedor_id')::uuid;

  -- Se for VENDEDOR, não precisa de salão (salao_id = NULL)
  IF v_cargo = 'VENDEDOR' THEN
    INSERT INTO public.perfis_acesso (auth_user_id, salao_id, cargo)
    VALUES (new.id, NULL, v_cargo);
    RETURN new;
  END IF;

  -- Para PROPRIETARIO/FUNCIONARIO, precisa salão
  IF v_salao_id IS NULL THEN
    INSERT INTO public.saloes (nome, vendedor_id)
    VALUES ('Salão de ' || coalesce(new.email, 'Usuário'), v_vendedor_id)
    RETURNING id INTO v_salao_id;

    INSERT INTO public.configuracoes (salao_id, custo_fixo_por_atendimento, taxa_maquininha_pct)
    VALUES (v_salao_id, 29.00, 5.00);
  END IF;

  INSERT INTO public.perfis_acesso (auth_user_id, salao_id, cargo)
  VALUES (new.id, v_salao_id, v_cargo);

  RETURN new;
END;
$$;

-- 5️⃣ Inserir perfil de VENDEDOR para o usuário existente
INSERT INTO public.perfis_acesso (auth_user_id, salao_id, cargo)
VALUES (
  '70d3f8e0-54cd-4e59-8468-eb03d020fc7c'::uuid,
  NULL,  -- Vendedor não tem salão específico
  'VENDEDOR'::cargo_enum
)
ON CONFLICT (auth_user_id) DO UPDATE 
SET cargo = 'VENDEDOR', salao_id = NULL;

-- 6️⃣ Verificar se o perfil foi criado corretamente
SELECT 
  auth_user_id,
  salao_id,
  cargo,
  criado_em
FROM public.perfis_acesso
WHERE auth_user_id = '70d3f8e0-54cd-4e59-8468-eb03d020fc7c';

-- ════════════════════════════════════════════════════════════════════════════
-- ✅ MIGRATION COMPLETA
-- ════════════════════════════════════════════════════════════════════════════
-- 
-- O QUE FOI FEITO:
-- ✓ salao_id agora pode ser NULL (para vendedores)
-- ✓ Criado salão "dummy" para referência do sistema
-- ✓ RLS policies atualizadas para suportar vendedores
-- ✓ Função de criação de usuário corrigida
-- ✓ Perfil de VENDEDOR criado para o usuário 70d3f8e0-54cd-4e59-8468-eb03d020fc7c
--
-- PRÓXIMOS PASSOS:
-- 1. Execute este script no Supabase SQL Editor
-- 2. Faça login no sistema com o email do vendedor
-- 3. Você será redirecionado para o painel VendedorApp
-- ════════════════════════════════════════════════════════════════════════════
