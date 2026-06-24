-- ============================================================================
-- MIGRATION: Sprint 9 — Reativar Cálculo de Comissão de Funcionária
-- STATUS: APLICAR NO SUPABASE SQL EDITOR
-- ============================================================================

-- 1. Criar coluna na tabela de profissionais (se não existir)
ALTER TABLE profissionais ADD COLUMN IF NOT EXISTS porcentagem_comissao numeric(5,2);

-- 2. Atualizar a trigger fn_calcular_atendimento
CREATE OR REPLACE FUNCTION fn_calcular_atendimento()
RETURNS trigger AS $$
DECLARE
  v_proc procedimentos%rowtype;
  v_cfg  configuracoes%rowtype;
  v_cargo_prof cargo_enum;
  v_porc_comissao numeric(5,2);
  v_preco numeric(10,2);
BEGIN
  SELECT * INTO v_proc FROM procedimentos WHERE id = NEW.procedimento_id;
  SELECT * INTO v_cfg  FROM configuracoes WHERE salao_id = NEW.salao_id;
  
  -- Busca o cargo e a comissão da profissional do agendamento
  SELECT cargo, porcentagem_comissao INTO v_cargo_prof, v_porc_comissao FROM profissionais WHERE id = NEW.profissional_id;

  -- (Mantém lógica de preço original)
  IF NOT v_proc.requer_comprimento OR NEW.comprimento = 'P' THEN
    v_preco := v_proc.preco_p;
  ELSIF NEW.comprimento = 'M' THEN
    v_preco := COALESCE(v_proc.preco_m, ROUND(v_proc.preco_p * 1.20, 2));
  ELSIF NEW.comprimento = 'G' THEN
    v_preco := COALESCE(v_proc.preco_g, ROUND(v_proc.preco_p * 1.30, 2));
  ELSE
    v_preco := COALESCE(v_proc.preco_p, 0);
  END IF;

  IF NEW.valor_cobrado = 0 OR NEW.valor_cobrado IS NULL THEN
    NEW.valor_cobrado := COALESCE(v_preco, 0);
  END IF;

  IF v_cfg.id IS NULL THEN
    NEW.valor_maquininha := 0; NEW.custo_fixo := 0;
  ELSE
    NEW.valor_maquininha := ROUND(COALESCE(NEW.valor_cobrado, 0) * COALESCE(v_cfg.taxa_maquininha_pct, 0) / 100, 2);
    NEW.custo_fixo := COALESCE(v_cfg.custo_fixo_por_atendimento, 0);
  END IF;

  -- ─── NOVA LÓGICA: CÁLCULO DE COMISSÃO ESPECÍFICA DA FUNCIONÁRIA ───
  IF v_cargo_prof = 'FUNCIONARIO' AND v_porc_comissao IS NOT NULL AND v_porc_comissao > 0 THEN
    -- Calcula a comissão sobre o valor total cobrado do cliente
    NEW.valor_profissional := ROUND(COALESCE(NEW.valor_cobrado, 0) * (v_porc_comissao / 100), 2);
  ELSE
    NEW.valor_profissional := 0;
  END IF;

  NEW.custo_variavel := COALESCE(v_proc.custo_variavel, 0);
  
  -- Abate a comissão calculada do Lucro do Salão
  NEW.lucro_liquido  := NEW.valor_cobrado - NEW.valor_maquininha - NEW.custo_fixo - NEW.custo_variavel - NEW.valor_profissional;
  NEW.lucro_possivel := NEW.valor_cobrado - NEW.custo_fixo - NEW.custo_variavel - NEW.valor_profissional;

  IF NEW.status = 'CANCELADO' THEN
    NEW.valor_maquininha := 0; NEW.valor_profissional := 0;
    NEW.lucro_liquido := 0; NEW.lucro_possivel := 0;
  END IF;

  NEW.atualizado_em := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Recarregar schema do PostgREST para a interface reconhecer a nova coluna imediatamente
NOTIFY pgrst, 'reload schema';
