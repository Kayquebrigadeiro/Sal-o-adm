-- ============================================================
-- MIGRATION CONSOLIDADA — TODAS AS ALTERAÇÕES DESTA SESSÃO
-- Execute no SQL Editor do Supabase Dashboard (uma única vez)
-- ============================================================

-- ══════════════════════════════════════════════════════════════
--  1. TABELA PROCEDIMENTOS — Novos campos de custo/lucro por tamanho
-- ══════════════════════════════════════════════════════════════

-- Custo do produto por tamanho (M e G usam mais produto que P)
ALTER TABLE procedimentos ADD COLUMN IF NOT EXISTS custo_variavel_m numeric(10,2) DEFAULT 0;
ALTER TABLE procedimentos ADD COLUMN IF NOT EXISTS custo_variavel_g numeric(10,2) DEFAULT 0;

-- Lucro desejado por tamanho (substitui a margem global)
ALTER TABLE procedimentos ADD COLUMN IF NOT EXISTS lucro_desejado_p numeric(10,2) DEFAULT 0;
ALTER TABLE procedimentos ADD COLUMN IF NOT EXISTS lucro_desejado_m numeric(10,2) DEFAULT 0;
ALTER TABLE procedimentos ADD COLUMN IF NOT EXISTS lucro_desejado_g numeric(10,2) DEFAULT 0;

-- Migrar dados antigos para os novos campos
UPDATE procedimentos 
SET custo_variavel_m = custo_variavel,
    custo_variavel_g = custo_variavel
WHERE (custo_variavel_m = 0 OR custo_variavel_m IS NULL)
  AND custo_variavel > 0;

UPDATE procedimentos 
SET lucro_desejado_p = COALESCE(ganho_liquido_desejado, 0)
WHERE (lucro_desejado_p = 0 OR lucro_desejado_p IS NULL)
  AND ganho_liquido_desejado > 0;

-- ══════════════════════════════════════════════════════════════
--  2. TABELA CUSTOS_FIXOS_ITENS — Adicionar campos tipo e valor
-- ══════════════════════════════════════════════════════════════

-- A tabela já existe no schema V5 com 'valor_mensal'.
-- Adicionamos 'valor' como alias e 'tipo' para categorização.
ALTER TABLE custos_fixos_itens ADD COLUMN IF NOT EXISTS valor numeric(10,2) DEFAULT 0;
ALTER TABLE custos_fixos_itens ADD COLUMN IF NOT EXISTS tipo text DEFAULT 'OUTRO';

-- Copiar valor_mensal existente para valor (caso tenha dados)
UPDATE custos_fixos_itens SET valor = valor_mensal WHERE valor = 0 AND valor_mensal > 0;

-- ══════════════════════════════════════════════════════════════
--  3. TABELA DESPESAS — Adicionar tipo PRODUTO ao enum
-- ══════════════════════════════════════════════════════════════

-- Adicionar 'PRODUTO' ao enum (executar separadamente se der erro)
-- Se já existir, o Supabase ignora com IF NOT EXISTS em versões recentes
ALTER TYPE tipo_despesa_enum ADD VALUE IF NOT EXISTS 'PRODUTO';

-- ══════════════════════════════════════════════════════════════
--  4. TABELA CLIENTES — Corrigir RLS (erro 403 no insert)
-- ══════════════════════════════════════════════════════════════

-- Criar tabela clientes se não existir
CREATE TABLE IF NOT EXISTS clientes (
  id        uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  salao_id  uuid NOT NULL REFERENCES saloes(id) ON DELETE CASCADE,
  nome      text NOT NULL,
  telefone  text,
  criado_em timestamptz DEFAULT now()
);

ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;

-- Remover policies antigas conflitantes
DROP POLICY IF EXISTS "Isolar clientes" ON clientes;
DROP POLICY IF EXISTS "Isolar clientes por salao" ON clientes;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON clientes;
DROP POLICY IF EXISTS "Enable all operations for users based on salao_id" ON clientes;
DROP POLICY IF EXISTS "clientes_policy" ON clientes;

-- Criar policy robusta (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "Isolar clientes por salao" ON clientes
FOR ALL TO authenticated
USING (
  salao_id IN (SELECT salao_id FROM perfis_acesso WHERE auth_user_id = auth.uid())
)
WITH CHECK (
  salao_id IN (SELECT salao_id FROM perfis_acesso WHERE auth_user_id = auth.uid())
);

-- ══════════════════════════════════════════════════════════════
--  5. LIMPEZA — Mover despesas de custos fixos para custos_fixos_itens
-- ══════════════════════════════════════════════════════════════

-- Inserir despesas que são custos fixos na tabela correta
INSERT INTO custos_fixos_itens (salao_id, descricao, valor, tipo)
SELECT salao_id, descricao, valor, 
  CASE 
    WHEN tipo::text = 'ALUGUEL' THEN 'ALUGUEL'
    WHEN tipo::text = 'ENERGIA' THEN 'ENERGIA'
    WHEN tipo::text = 'AGUA' THEN 'AGUA'
    WHEN tipo::text = 'INTERNET' THEN 'INTERNET'
    WHEN tipo::text = 'FUNCIONARIO' THEN 'FUNCIONARIO'
    ELSE 'OUTRO'
  END
FROM despesas
WHERE tipo::text IN ('ALUGUEL', 'ENERGIA', 'AGUA', 'INTERNET', 'FUNCIONARIO')
ON CONFLICT DO NOTHING;

-- Remover despesas migradas (que eram custos fixos)
DELETE FROM despesas WHERE tipo::text IN ('ALUGUEL', 'ENERGIA', 'AGUA', 'INTERNET', 'FUNCIONARIO');

-- Mover despesas tipo OUTRO que claramente são custos fixos (por nome)
INSERT INTO custos_fixos_itens (salao_id, descricao, valor, tipo)
SELECT salao_id, descricao, valor, 'OUTRO'
FROM despesas
WHERE tipo::text = 'OUTRO'
  AND UPPER(descricao) IN (
    'ALIMENTOS STUDIOS', 'SISTEMA STUDIO', 'CAPSULA DE CAFÉ', 
    'ACESSORIOS FIXO', 'PRODUTOS LIMPEZA', 'ACESSORIOS',
    'CAPSULA CAFE', 'SISTEMA', 'LIMPEZA'
  )
ON CONFLICT DO NOTHING;

DELETE FROM despesas
WHERE tipo::text = 'OUTRO'
  AND UPPER(descricao) IN (
    'ALIMENTOS STUDIOS', 'SISTEMA STUDIO', 'CAPSULA DE CAFÉ',
    'ACESSORIOS FIXO', 'PRODUTOS LIMPEZA', 'ACESSORIOS',
    'CAPSULA CAFE', 'SISTEMA', 'LIMPEZA'
  );

-- ══════════════════════════════════════════════════════════════
--  6. VERIFICAÇÃO FINAL
-- ══════════════════════════════════════════════════════════════

-- Verificar novos campos em procedimentos
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'procedimentos' 
AND column_name IN ('custo_variavel','custo_variavel_m','custo_variavel_g','lucro_desejado_p','lucro_desejado_m','lucro_desejado_g')
ORDER BY column_name;

-- Verificar custos fixos migrados
SELECT id, descricao, valor, tipo FROM custos_fixos_itens ORDER BY descricao;

-- Verificar que despesas operacionais foram removidas
SELECT tipo::text, COUNT(*) FROM despesas GROUP BY tipo::text;

-- Verificar policy de clientes
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'clientes';
