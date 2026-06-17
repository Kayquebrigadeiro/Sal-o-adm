-- ============================================================================
-- FIX: Bug crítico no trigger de DELETE
-- ============================================================================
-- PROBLEMA:
--   A função atualizar_totais_atendimento() usa NEW.atendimento_id, que é NULL
--   em operações DELETE. Isso causa erro ao deletar um procedimento.
--
-- SOLUÇÃO:
--   Usar COALESCE(NEW.atendimento_id, OLD.atendimento_id) para funcionar
--   em INSERT/UPDATE (NEW existe) e DELETE (NEW é null, usa OLD)
--
-- SEGURO PARA PRODUÇÃO:
--   - Não altera dados existentes
--   - Apenas redefine a função (sem recrear índices ou constraints)
--   - O trigger já está criado e não precisa ser recriado
-- ============================================================================

CREATE OR REPLACE FUNCTION atualizar_totais_atendimento()
RETURNS TRIGGER AS $$
DECLARE
  v_atendimento_id uuid;
BEGIN
  -- COALESCE garante que funciona em INSERT/UPDATE (NEW existe) e DELETE (NEW é null, usa OLD)
  v_atendimento_id := COALESCE(NEW.atendimento_id, OLD.atendimento_id);
  
  -- Atualizar valores totais do atendimento baseado em seus procedimentos
  UPDATE atendimentos
  SET
    valor_cobrado = COALESCE((
      SELECT SUM(valor_cobrado) 
      FROM atendimento_procedimentos 
      WHERE atendimento_id = v_atendimento_id
    ), 0),
    valor_pago = COALESCE((
      SELECT SUM(valor_pago) 
      FROM atendimento_procedimentos 
      WHERE atendimento_id = v_atendimento_id
    ), 0),
    atualizado_em = NOW()
  WHERE id = v_atendimento_id;
  
  -- Retorna NEW em INSERT/UPDATE, OLD em DELETE
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
