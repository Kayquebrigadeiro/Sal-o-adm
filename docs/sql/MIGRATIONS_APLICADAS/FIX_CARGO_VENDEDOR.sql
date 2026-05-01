-- ════════════════════════════════════════════════════════════════════════════
-- DIAGNÓSTICO E CORREÇÃO: Problema com cargo VENDEDOR
-- ════════════════════════════════════════════════════════════════════════════

-- 1️⃣ VERIFICAR O PERFIL ATUAL
SELECT 
  auth_user_id,
  salao_id,
  cargo,
  criado_em
FROM public.perfis_acesso
WHERE auth_user_id = '70d3f8e0-54cd-4e59-8468-eb03d020fc7c';

-- 2️⃣ VERIFICAR SE O ENUM VENDEDOR EXISTE
SELECT 
  enumlabel 
FROM pg_enum 
WHERE enumtypid = 'cargo_enum'::regtype
ORDER BY enumsortorder;

-- 3️⃣ DELETAR O PERFIL ANTIGO E RECRIAR
DELETE FROM public.perfis_acesso 
WHERE auth_user_id = '70d3f8e0-54cd-4e59-8468-eb03d020fc7c';

-- 4️⃣ INSERIR NOVAMENTE COMO VENDEDOR
INSERT INTO public.perfis_acesso (auth_user_id, salao_id, cargo)
VALUES (
  '70d3f8e0-54cd-4e59-8468-eb03d020fc7c'::uuid,
  NULL,
  'VENDEDOR'::cargo_enum
);

-- 5️⃣ CONFIRMAR A MUDANÇA
SELECT 
  auth_user_id,
  salao_id,
  cargo::text as cargo_texto,
  criado_em
FROM public.perfis_acesso
WHERE auth_user_id = '70d3f8e0-54cd-4e59-8468-eb03d020fc7c';

-- ════════════════════════════════════════════════════════════════════════════
-- RESULTADO ESPERADO:
-- auth_user_id: 70d3f8e0-54cd-4e59-8468-eb03d020fc7c
-- salao_id: NULL
-- cargo_texto: VENDEDOR
-- criado_em: [timestamp atual]
-- ════════════════════════════════════════════════════════════════════════════
