-- ============================================================
-- MIGRATION: Precificação Individual por Tamanho (P/M/G)
-- Execute no SQL Editor do Supabase Dashboard
-- ============================================================

-- 1. Adicionar campos de CUSTO DO PRODUTO por tamanho
-- custo_variavel já existe (será usado como custo P)
ALTER TABLE procedimentos ADD COLUMN IF NOT EXISTS custo_variavel_m numeric DEFAULT 0;
ALTER TABLE procedimentos ADD COLUMN IF NOT EXISTS custo_variavel_g numeric DEFAULT 0;

-- 2. Adicionar campos de LUCRO DESEJADO por tamanho
ALTER TABLE procedimentos ADD COLUMN IF NOT EXISTS lucro_desejado_p numeric DEFAULT 0;
ALTER TABLE procedimentos ADD COLUMN IF NOT EXISTS lucro_desejado_m numeric DEFAULT 0;
ALTER TABLE procedimentos ADD COLUMN IF NOT EXISTS lucro_desejado_g numeric DEFAULT 0;

-- 3. Copiar custo_variavel existente para M e G como valor inicial
-- (a proprietária vai ajustar depois — M e G usam mais produto)
UPDATE procedimentos 
SET custo_variavel_m = custo_variavel,
    custo_variavel_g = custo_variavel
WHERE custo_variavel_m = 0 OR custo_variavel_m IS NULL;

-- 4. Se existir ganho_liquido_desejado antigo, migrar para lucro_desejado_p
UPDATE procedimentos 
SET lucro_desejado_p = COALESCE(ganho_liquido_desejado, 0)
WHERE lucro_desejado_p = 0 OR lucro_desejado_p IS NULL;

-- 5. Verificar estrutura
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'procedimentos' 
AND column_name IN (
  'custo_variavel', 'custo_variavel_m', 'custo_variavel_g',
  'lucro_desejado_p', 'lucro_desejado_m', 'lucro_desejado_g'
)
ORDER BY column_name;
