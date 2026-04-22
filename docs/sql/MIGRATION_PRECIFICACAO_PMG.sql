-- ============================================================================
--  MIGRATION: Sistema de Precificação P/M/G
--  Data: 2026-04-22
--  Descrição: 
--    1. Adiciona coluna ganho_liquido_desejado à tabela procedimentos
--    2. Corrige o trigger fn_calcular_atendimento para aplicar multiplicadores
--       P×1.20 (M) e P×1.30 (G) quando preco_m/preco_g não estão cadastrados
-- ============================================================================

-- ─── 1. NOVA COLUNA ────────────────────────────────────────────────────────
ALTER TABLE procedimentos 
ADD COLUMN IF NOT EXISTS ganho_liquido_desejado numeric(10,2) DEFAULT 0;

COMMENT ON COLUMN procedimentos.ganho_liquido_desejado IS 
  'Ganho líquido desejado pela proprietária para este procedimento (R$). '
  'Usado pela calculadora de precificação para derivar preco_p, preco_m e preco_g.';

ALTER TABLE configuracoes
ADD COLUMN IF NOT EXISTS margem_lucro_desejada_pct numeric(5,2) NOT NULL DEFAULT 20.00;

COMMENT ON COLUMN configuracoes.margem_lucro_desejada_pct IS
  'Meta de margem de lucro desejada pela proprietária (%). Padrão: 20%.';

-- ─── 2. TRIGGER CORRIGIDO ──────────────────────────────────────────────────
-- Quando preco_m ou preco_g são NULL, o trigger agora aplica os multiplicadores
-- corretos (×1.20 e ×1.30) em vez de usar o preco_p diretamente.
-- Isso é essencial para procedimentos como Progressiva, Botox, etc. que usam
-- derivação automática. Procedimentos com preço manual (Coloração, Luzes)
-- continuam usando o valor cadastrado via COALESCE.

CREATE OR REPLACE FUNCTION fn_calcular_atendimento() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_proc       procedimentos%rowtype;
  v_cfg        configuracoes%rowtype;
  v_cargo_prof cargo_enum;
  v_preco      numeric(10,2);
BEGIN
  SELECT * INTO v_proc FROM procedimentos WHERE id = NEW.procedimento_id;
  SELECT * INTO v_cfg  FROM configuracoes   WHERE salao_id = NEW.salao_id;
  SELECT cargo INTO v_cargo_prof FROM profissionais WHERE id = NEW.profissional_id;

  -- ─── Determinar o preço correto com base no comprimento ───
  IF NOT v_proc.requer_comprimento OR NEW.comprimento = 'P' THEN
    v_preco := v_proc.preco_p;
  ELSIF NEW.comprimento = 'M' THEN
    -- Se preco_m cadastrado manualmente, usa ele; senão, deriva de P × 1.20
    v_preco := COALESCE(v_proc.preco_m, ROUND(v_proc.preco_p * 1.20, 2));
  ELSIF NEW.comprimento = 'G' THEN
    -- Se preco_g cadastrado manualmente, usa ele; senão, deriva de P × 1.30
    v_preco := COALESCE(v_proc.preco_g, ROUND(v_proc.preco_p * 1.30, 2));
  ELSE
    v_preco := COALESCE(v_proc.preco_p, 0);
  END IF;

  -- Se o valor cobrado não foi informado pelo frontend, usa o preço tabelado
  IF NEW.valor_cobrado = 0 OR NEW.valor_cobrado IS NULL THEN
    NEW.valor_cobrado := v_preco;
  END IF;

  -- ─── Calcular deduções ───
  IF v_cfg.id IS NULL THEN
     NEW.valor_maquininha := 0;
     NEW.custo_fixo       := 0;
  ELSE
     NEW.valor_maquininha := ROUND(NEW.valor_cobrado * COALESCE(v_cfg.taxa_maquininha_pct, 0) / 100, 2);
     NEW.custo_fixo       := COALESCE(v_cfg.custo_fixo_por_atendimento, 0);
  END IF;

  NEW.valor_profissional := ROUND(NEW.valor_cobrado * v_proc.porcentagem_profissional / 100, 2);
  NEW.custo_variavel     := v_proc.custo_variavel;

  -- ─── Calcular lucro ───
  IF v_cargo_prof = 'PROPRIETARIO' THEN
    NEW.lucro_liquido  := NEW.valor_cobrado - NEW.valor_maquininha - NEW.custo_fixo - NEW.custo_variavel;
    NEW.lucro_possivel := NEW.valor_cobrado - NEW.custo_fixo - NEW.custo_variavel;
  ELSE
    NEW.lucro_liquido  := NEW.valor_cobrado - NEW.valor_maquininha - NEW.valor_profissional - NEW.custo_fixo - NEW.custo_variavel;
    NEW.lucro_possivel := NEW.valor_cobrado - NEW.valor_profissional - NEW.custo_fixo - NEW.custo_variavel;
  END IF;

  -- ─── Cancelamento zera tudo ───
  IF NEW.status = 'CANCELADO' THEN
    NEW.valor_maquininha   := 0;
    NEW.valor_profissional := 0;
    NEW.lucro_liquido      := 0;
    NEW.lucro_possivel     := 0;
  END IF;

  NEW.atualizado_em := now();
  RETURN NEW;
END;
$$;
