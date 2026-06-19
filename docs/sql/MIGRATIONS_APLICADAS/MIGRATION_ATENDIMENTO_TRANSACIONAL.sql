-- ============================================================================
-- MIGRATION: Atendimento transacional com múltiplos serviços
-- Objetivo:
-- - Criar atendimento + atendimento_procedimentos em uma única transação
-- - Substituir procedimentos de um atendimento de forma atômica
-- - Preservar valor_cobrado manual e rollback automático em qualquer erro
-- ============================================================================

create or replace function criar_atendimento_com_procedimentos(
  p_salao_id uuid,
  p_data date,
  p_horario text,
  p_profissional_id uuid,
  p_cliente text,
  p_obs text default null,
  p_status text default 'AGENDADO',
  p_procedimentos jsonb default '[]'::jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_atendimento_id uuid;
  v_item jsonb;
  v_seq integer := 0;
begin
  insert into atendimentos (
    salao_id,
    data,
    horario,
    profissional_id,
    procedimento_id,
    cliente,
    valor_cobrado,
    valor_pago,
    status,
    obs
  ) values (
    p_salao_id,
    p_data,
    p_horario,
    p_profissional_id,
    coalesce((p_procedimentos -> 0 ->> 'procedimento_id')::uuid, null),
    upper(coalesce(p_cliente, '')),
    0,
    0,
    p_status::status_enum,
    p_obs
  )
  returning id into v_atendimento_id;

  if jsonb_typeof(p_procedimentos) is distinct from 'array' then
    raise exception 'p_procedimentos deve ser um array JSON';
  end if;

  for v_item in select * from jsonb_array_elements(coalesce(p_procedimentos, '[]'::jsonb)) loop
    v_seq := v_seq + 1;
    insert into atendimento_procedimentos (
      atendimento_id,
      procedimento_id,
      comprimento,
      valor_indicado,
      valor_cobrado,
      valor_pago,
      sequencia
    ) values (
      v_atendimento_id,
      (v_item ->> 'procedimento_id')::uuid,
      nullif(v_item ->> 'comprimento', '')::comprimento_enum,
      coalesce((v_item ->> 'valor_indicado')::numeric, 0),
      coalesce((v_item ->> 'valor_cobrado')::numeric, 0),
      coalesce((v_item ->> 'valor_pago')::numeric, 0),
      coalesce((v_item ->> 'sequencia')::integer, v_seq)
    );
  end loop;

  return v_atendimento_id;
end;
$$;

create or replace function substituir_procedimentos_atendimento(
  p_atendimento_id uuid,
  p_procedimentos jsonb default '[]'::jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;
  v_seq integer := 0;
begin
  delete from atendimento_procedimentos
  where atendimento_id = p_atendimento_id;

  if jsonb_typeof(p_procedimentos) is distinct from 'array' then
    raise exception 'p_procedimentos deve ser um array JSON';
  end if;

  for v_item in select * from jsonb_array_elements(coalesce(p_procedimentos, '[]'::jsonb)) loop
    v_seq := v_seq + 1;
    insert into atendimento_procedimentos (
      atendimento_id,
      procedimento_id,
      comprimento,
      valor_indicado,
      valor_cobrado,
      valor_pago,
      sequencia
    ) values (
      p_atendimento_id,
      (v_item ->> 'procedimento_id')::uuid,
      nullif(v_item ->> 'comprimento', '')::comprimento_enum,
      coalesce((v_item ->> 'valor_indicado')::numeric, 0),
      coalesce((v_item ->> 'valor_cobrado')::numeric, 0),
      coalesce((v_item ->> 'valor_pago')::numeric, 0),
      coalesce((v_item ->> 'sequencia')::integer, v_seq)
    );
  end loop;

  update atendimentos
    set procedimento_id = coalesce((p_procedimentos -> 0 ->> 'procedimento_id')::uuid, procedimento_id)
  where id = p_atendimento_id;
end;
$$;

notify pgrst, 'reload schema';
