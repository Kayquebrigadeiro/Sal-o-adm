-- ============================================================================
-- FIX SPRINT 1/2: lucro_possivel baseado em valor_indicado
-- Objetivo: lucro_possivel = soma(valor_indicado) - custo_fixo - custo_variavel
--           (sem taxa maquininha, pois valor_indicado = preço cheio/pix)
-- APLICAR NO SUPABASE SQL EDITOR
-- ============================================================================

-- 1. Atualizar a função que sincroniza totais do atendimento
--    para também recalcular lucro_possivel a partir de valor_indicado
create or replace function atualizar_totais_atendimento()
returns trigger as $$
declare
  v_atendimento_id uuid;
  v_valor_cobrado  numeric(10,2);
  v_valor_indicado numeric(10,2);
  v_valor_pago     numeric(10,2);
  v_cfg            configuracoes%rowtype;
  v_custo_variavel numeric(10,2);
  v_salao_id       uuid;
begin
  v_atendimento_id := coalesce(new.atendimento_id, old.atendimento_id);

  select
    coalesce(sum(valor_cobrado), 0),
    coalesce(sum(valor_indicado), 0),
    coalesce(sum(valor_pago), 0)
  into v_valor_cobrado, v_valor_indicado, v_valor_pago
  from atendimento_procedimentos
  where atendimento_id = v_atendimento_id;

  -- Buscar salao_id e custo_variavel do atendimento
  select a.salao_id, coalesce(a.custo_variavel, 0)
  into v_salao_id, v_custo_variavel
  from atendimentos a where a.id = v_atendimento_id;

  select * into v_cfg from configuracoes where salao_id = v_salao_id;

  update atendimentos
  set
    valor_cobrado  = v_valor_cobrado,
    valor_pago     = v_valor_pago,
    -- lucro_possivel: valor_indicado (preço cheio/pix) menos custos fixos e variáveis
    lucro_possivel = v_valor_indicado
                     - coalesce(v_cfg.custo_fixo_por_atendimento, 0)
                     - v_custo_variavel,
    -- lucro_liquido permanece calculado pelo trigger fn_calcular_atendimento (sobre valor_cobrado)
    atualizado_em  = now()
  where id = v_atendimento_id;

  return coalesce(new, old);
end;
$$ language plpgsql;

-- 2. Recalcular todos os atendimentos existentes que já têm procedimentos
update atendimentos a
set
  lucro_possivel = (
    select coalesce(sum(ap.valor_indicado), 0)
    from atendimento_procedimentos ap
    where ap.atendimento_id = a.id
  )
  - coalesce(a.custo_fixo, 0)
  - coalesce(a.custo_variavel, 0)
where exists (
  select 1 from atendimento_procedimentos ap where ap.atendimento_id = a.id
);

notify pgrst, 'reload schema';
