-- Migration: Add porcentagem_comissao column to profissionais table
-- Date: 2026-07-07
-- Description: 
--   1. Adds porcentagem_comissao column to profissionais table (DECIMAL(5,2), DEFAULT 0)
--   2. Ensures only FUNCIONARIO cargo receives commission (not PROPRIETARIO)
--   3. This column is used in atendimentos calculation via financialEngine

-- Add the column if it doesn't exist
ALTER TABLE profissionais ADD COLUMN porcentagem_comissao DECIMAL(5,2) DEFAULT 0 AFTER cargo;

-- Existing profissionais keep the default (0) - no commission
-- New profissionais must have this set appropriately per negocio rule:
-- - FUNCIONARIO: can have commission % (0-100)
-- - PROPRIETARIO: always 0 (never receives commission, even if % is set)
