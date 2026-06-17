-- ============================================================================
-- FIX: v_atendimentos_completo — inclui profissional.nome e cargo diretamente
-- Motivo: PostgREST não suporta joins implícitos (tabela(col)) a partir de views
-- APLICAR NO SUPABASE SQL EDITOR
-- ============================================================================

create or replace view v_atendimentos_completo as
select
  a.id,
  a.salao_id,
  a.data,
  a.horario,
  a.profissional_id,
  a.cliente,
  a.status,
  a.obs,
  a.valor_cobrado,
  a.valor_pago,
  a.valor_pendente,
  a.valor_maquininha,
  a.valor_profissional,
  a.custo_fixo,
  a.custo_variavel,
  a.lucro_liquido,
  a.lucro_possivel,
  a.criado_em,
  a.atualizado_em,
  -- Profissional embutido como objeto JSON (substitui profissionais(nome,cargo))
  json_build_object('nome', p.nome, 'cargo', p.cargo) as profissionais,
  -- Procedimentos como array JSON
  json_agg(
    json_build_object(
      'id',                ap.id,
      'procedimento_id',   ap.procedimento_id,
      'procedimento_nome', proc.nome,
      'categoria',         proc.categoria,
      'comprimento',       ap.comprimento,
      'valor_indicado',    ap.valor_indicado,
      'valor_cobrado',     ap.valor_cobrado,
      'valor_pago',        ap.valor_pago,
      'sequencia',         ap.sequencia
    ) order by ap.sequencia
  ) as procedimentos
from atendimentos a
left join profissionais p    on p.id = a.profissional_id
left join atendimento_procedimentos ap on a.id = ap.atendimento_id
left join procedimentos proc on proc.id = ap.procedimento_id
group by a.id, p.nome, p.cargo;

notify pgrst, 'reload schema';
