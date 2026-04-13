-- ============================================================================
-- SQL para suportar o novo Wizard de Primeiro Acesso
-- Execute este script no SQL Editor do Supabase antes de testar o wizard
-- ============================================================================

-- 1. Adicionar coluna nome_proprietaria na tabela saloes
ALTER TABLE saloes ADD COLUMN IF NOT EXISTS nome_proprietaria text;

-- 2. Adicionar coluna horario (JSONB) na tabela saloes
-- Formato esperado: { "seg": { "aberto": true, "abertura": "08:00", "fechamento": "18:00" }, ... }
ALTER TABLE saloes ADD COLUMN IF NOT EXISTS horario jsonb;

-- 3. Adicionar coluna categoria na tabela procedimentos
-- Valores possíveis: CABELO, UNHAS, ESTETICA, OUTROS
ALTER TABLE procedimentos ADD COLUMN IF NOT EXISTS categoria text DEFAULT 'OUTROS';

-- ============================================================================
-- Verificação das alterações
-- ============================================================================

-- Verificar se as colunas foram criadas corretamente
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'saloes' 
  AND column_name IN ('nome_proprietaria', 'horario')
ORDER BY column_name;

SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'procedimentos' 
  AND column_name = 'categoria';

-- ============================================================================
-- Exemplo de dados que o wizard vai salvar
-- ============================================================================

-- Exemplo de horario JSONB:
/*
{
  "seg": { "aberto": true, "abertura": "08:00", "fechamento": "18:00" },
  "ter": { "aberto": true, "abertura": "08:00", "fechamento": "18:00" },
  "qua": { "aberto": true, "abertura": "08:00", "fechamento": "18:00" },
  "qui": { "aberto": true, "abertura": "08:00", "fechamento": "18:00" },
  "sex": { "aberto": true, "abertura": "08:00", "fechamento": "18:00" },
  "sab": { "aberto": true, "abertura": "08:00", "fechamento": "18:00" },
  "dom": { "aberto": false, "abertura": "08:00", "fechamento": "18:00" }
}
*/

-- Exemplo de procedimento com categoria:
/*
INSERT INTO procedimentos (salao_id, nome, valor, categoria, ativo)
VALUES 
  ('uuid-do-salao', 'Corte (Curto)', 50.00, 'CABELO', true),
  ('uuid-do-salao', 'Corte (Médio)', 70.00, 'CABELO', true),
  ('uuid-do-salao', 'Corte (Longo)', 90.00, 'CABELO', true),
  ('uuid-do-salao', 'Manicure', 35.00, 'UNHAS', true),
  ('uuid-do-salao', 'Limpeza de Pele', 120.00, 'ESTETICA', true);
*/
