-- ========================================================================================
--  MIGRATION V6 — CATEGORIAS: SERVICO_CABELO / PRODUTO_APLICADO / SERVICO_ESTETICA
-- ========================================================================================
--  EXECUTAR NO SUPABASE DASHBOARD (SQL Editor)
--  PRÉ-REQUISITO: Não há dados reais em procedimentos/atendimentos
-- ========================================================================================

-- ─── 1. LIMPAR DADOS EXISTENTES (sem dados reais) ───────────────────────────
DELETE FROM atendimentos;
DELETE FROM procedimento_produtos;
DELETE FROM procedimentos;

-- ─── 2. MIGRAR ENUM categoria_enum ──────────────────────────────────────────
ALTER TABLE procedimentos ALTER COLUMN categoria DROP DEFAULT;
ALTER TABLE procedimentos ALTER COLUMN categoria TYPE text;

DROP TYPE IF EXISTS categoria_enum CASCADE;

CREATE TYPE categoria_enum AS ENUM (
  'SERVICO_CABELO',
  'PRODUTO_APLICADO',
  'SERVICO_ESTETICA'
);

ALTER TABLE procedimentos
  ALTER COLUMN categoria TYPE categoria_enum
  USING 'SERVICO_CABELO'::categoria_enum;

ALTER TABLE procedimentos
  ALTER COLUMN categoria SET DEFAULT 'SERVICO_CABELO';

-- ─── 3. NOVAS COLUNAS PARA PRODUTO_APLICADO ─────────────────────────────────
ALTER TABLE procedimentos
  ADD COLUMN IF NOT EXISTS preco_frasco numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS aplicacoes_por_frasco integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS unidade_medida text DEFAULT 'aplicação';

-- ganho_liquido_desejado já existe no schema V5 — nada a fazer

-- ─── 4. TRIGGER: CALCULAR CUSTO POR APLICAÇÃO (PRODUTO_APLICADO) ────────────
CREATE OR REPLACE FUNCTION fn_calcular_custo_produto_aplicado()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.categoria = 'PRODUTO_APLICADO' AND NEW.aplicacoes_por_frasco > 0 THEN
    NEW.custo_variavel     := ROUND(NEW.preco_frasco / NEW.aplicacoes_por_frasco, 2);
    NEW.custo_variavel_m   := NEW.custo_variavel;
    NEW.custo_variavel_g   := NEW.custo_variavel;
    NEW.requer_comprimento := false;
  END IF;

  -- SERVICO_ESTETICA nunca tem comprimento
  IF NEW.categoria = 'SERVICO_ESTETICA' THEN
    NEW.requer_comprimento := false;
  END IF;

  -- SERVICO_CABELO sempre tem comprimento
  IF NEW.categoria = 'SERVICO_CABELO' THEN
    NEW.requer_comprimento := true;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_calc_produto_aplicado ON procedimentos;
CREATE TRIGGER trg_calc_produto_aplicado
  BEFORE INSERT OR UPDATE ON procedimentos
  FOR EACH ROW EXECUTE FUNCTION fn_calcular_custo_produto_aplicado();

-- ─── 5. ATUALIZAR VIEW: RANKING COM CATEGORIA ──────────────────────────────
CREATE OR REPLACE VIEW ranking_procedimentos WITH (security_invoker = true) AS
SELECT
  a.salao_id,
  date_trunc('month', a.data)::date AS mes,
  pr.nome AS procedimento,
  pr.categoria,
  count(*) FILTER (WHERE a.status <> 'CANCELADO') AS quantidade,
  sum(a.valor_cobrado) FILTER (WHERE a.status <> 'CANCELADO') AS receita_total,
  sum(a.lucro_liquido) FILTER (WHERE a.status <> 'CANCELADO') AS lucro_total,
  round(
    sum(a.valor_cobrado) FILTER (WHERE a.status <> 'CANCELADO') /
    nullif(count(*) FILTER (WHERE a.status <> 'CANCELADO'), 0),
    2
  ) AS ticket_medio
FROM atendimentos a
JOIN procedimentos pr ON pr.id = a.procedimento_id
GROUP BY a.salao_id, date_trunc('month', a.data)::date, pr.nome, pr.categoria;

-- ─── 6. ATUALIZAR VIEW: AGENDA DO DIA COM NOVA CATEGORIA ───────────────────
CREATE OR REPLACE VIEW agenda_do_dia WITH (security_invoker = true) AS
SELECT
  a.id, a.salao_id, a.data, a.horario, a.cliente, a.comprimento,
  a.valor_cobrado, a.valor_pago, a.valor_pendente,
  a.valor_profissional, a.lucro_liquido, a.lucro_possivel, a.status, a.obs,
  p.id AS profissional_id, p.nome AS profissional_nome, p.cargo,
  pr.id AS procedimento_id, pr.nome AS procedimento_nome,
  pr.categoria, pr.requer_comprimento
FROM atendimentos a
JOIN profissionais  p  ON p.id  = a.profissional_id
JOIN procedimentos  pr ON pr.id = a.procedimento_id
ORDER BY a.data, a.horario, p.nome;

-- ========================================================================================
--  FIM DA MIGRAÇÃO V6
--  Após executar, verifique:
--    SELECT enum_range(NULL::categoria_enum);
--    → {SERVICO_CABELO,PRODUTO_APLICADO,SERVICO_ESTETICA}
-- ========================================================================================
