-- FASE 2 - LIMPEZA E PREPARAÇÃO V7 (Produção)
-- Este script reaproveita `produtos_catalogo` e `procedimento_produtos`

-- 1. Remover colunas desnecessárias da tabela `procedimentos`
ALTER TABLE procedimentos 
  DROP COLUMN IF EXISTS porcentagem_profissional,
  DROP COLUMN IF EXISTS preco_frasco,
  DROP COLUMN IF EXISTS aplicacoes_por_frasco,
  DROP COLUMN IF EXISTS unidade_medida;

-- 2. Atualizar a trigger de atendimento para remover a comissão
-- Não precisamos mais deduzir a comissão do lucro no momento do atendimento se ela não existe.
-- O valor_profissional ficará como 0 (pois não há mais comissão variável na tabela).

CREATE OR REPLACE FUNCTION fn_calcular_atendimento()
RETURNS trigger AS $$
DECLARE
  v_taxa_maquininha numeric;
  v_custo_fixo numeric;
  v_valor_maquininha numeric;
  v_valor_profissional numeric;
  v_lucro_liquido numeric;
BEGIN
  -- Buscar taxas nas configuracoes
  SELECT taxa_maquininha_pct, custo_fixo_por_atendimento 
    INTO v_taxa_maquininha, v_custo_fixo
  FROM configuracoes WHERE salao_id = NEW.salao_id;

  -- Calcular descontos (Taxa da Maquininha)
  v_valor_maquininha := NEW.valor_cobrado * (v_taxa_maquininha / 100.0);
  
  -- Profissional ganha 0 de comissão atrelada ao serviço agora
  v_valor_profissional := 0;

  -- Calcular Lucro
  v_lucro_liquido := NEW.valor_cobrado 
                     - v_valor_maquininha 
                     - v_valor_profissional 
                     - NEW.custo_produto 
                     - v_custo_fixo;

  -- Atualizar NEW
  NEW.valor_maquininha := v_valor_maquininha;
  NEW.valor_profissional := v_valor_profissional;
  NEW.lucro_liquido := v_lucro_liquido;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Certificar-se de que a view `custo_composto_procedimento` reflete corretamente a soma dos produtos
-- (Ela já deve existir e somar p.custo_por_uso * pp.quantidade_usada, 
--  sendo custo_por_uso = preco_compra / qtd_aplicacoes)

CREATE OR REPLACE VIEW custo_composto_procedimento AS
SELECT
  pp.procedimento_id,
  pp.salao_id,
  COUNT(pp.produto_id) AS qtd_produtos,
  SUM(
    (p.preco_compra / GREATEST(p.qtd_aplicacoes, 1)) * pp.quantidade_usada
  ) AS custo_total_composicao
FROM procedimento_produtos pp
JOIN produtos_catalogo p ON p.id = pp.produto_id
GROUP BY pp.procedimento_id, pp.salao_id;
