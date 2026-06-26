-- Sprint 9.1 — Proteção Inteligente do Dashboard Financeiro
-- Executar no Supabase SQL Editor

ALTER TABLE configuracoes
ADD COLUMN IF NOT EXISTS dashboard_protection_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS dashboard_pin VARCHAR(4) DEFAULT NULL;

-- Comentários
COMMENT ON COLUMN configuracoes.dashboard_protection_enabled IS 'Quando true, exige PIN para acessar o Dashboard e bloqueia ao perder foco';
COMMENT ON COLUMN configuracoes.dashboard_pin IS 'PIN de 4 dígitos numéricos, gerado automaticamente ao ativar a proteção';
