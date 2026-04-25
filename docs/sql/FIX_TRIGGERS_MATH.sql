-- ========================================================================================
-- SCRIPT DE FIX DE MATEMÁTICA SEGURA NOS TRIGGERS
-- Execute no SQL Editor do Supabase para adicionar guardas contra divisão por zero e nulls.
-- ========================================================================================

create or replace function public.fn_calcular_custo_produto_aplicado()
returns trigger language plpgsql as $$
begin
  if new.categoria = 'PRODUTO_APLICADO' then
    if coalesce(new.aplicacoes_por_frasco, 0) > 0 then
      new.custo_variavel := round(coalesce(new.preco_frasco, 0) / new.aplicacoes_por_frasco, 2);
    else
      new.custo_variavel := 0;
    end if;
    new.custo_variavel_m   := new.custo_variavel;
    new.custo_variavel_g   := new.custo_variavel;
    new.requer_comprimento := false;
  end if;

  if new.categoria = 'SERVICO_ESTETICA' then
    new.requer_comprimento := false;
  end if;

  if new.categoria = 'SERVICO_CABELO' then
    new.requer_comprimento := true;
  end if;

  return new;
end;
$$;

create or replace function public.fn_calcular_atendimento() returns trigger language plpgsql as $$
declare
  v_proc       public.procedimentos%rowtype;
  v_cfg        public.configuracoes%rowtype;
  v_cargo_prof public.cargo_enum;
  v_preco      numeric(10,2);
begin
  select * into v_proc from public.procedimentos where id = new.procedimento_id;
  select * into v_cfg  from public.configuracoes   where salao_id = new.salao_id;
  select cargo into v_cargo_prof from public.profissionais where id = new.profissional_id;

  if not v_proc.requer_comprimento or new.comprimento = 'P' then
    v_preco := v_proc.preco_p;
  elsif new.comprimento = 'M' then
    v_preco := coalesce(v_proc.preco_m, round(v_proc.preco_p * 1.20, 2));
  elsif new.comprimento = 'G' then
    v_preco := coalesce(v_proc.preco_g, round(v_proc.preco_p * 1.30, 2));
  else
    v_preco := coalesce(v_proc.preco_p, 0);
  end if;

  if new.valor_cobrado = 0 or new.valor_cobrado is null then
    new.valor_cobrado := coalesce(v_preco, 0);
  end if;

  if v_cfg.id is null then
     new.valor_maquininha := 0;
     new.custo_fixo       := 0;
  else
     new.valor_maquininha := round(coalesce(new.valor_cobrado, 0) * coalesce(v_cfg.taxa_maquininha_pct, 0) / 100, 2);
     new.custo_fixo       := coalesce(v_cfg.custo_fixo_por_atendimento, 0);
  end if;

  new.valor_profissional := round(coalesce(new.valor_cobrado, 0) * coalesce(v_proc.porcentagem_profissional, 0) / 100, 2);
  new.custo_variavel     := coalesce(v_proc.custo_variavel, 0);

  if v_cargo_prof = 'PROPRIETARIO' then
    new.lucro_liquido  := new.valor_cobrado - new.valor_maquininha - new.custo_fixo - new.custo_variavel;
    new.lucro_possivel := new.valor_cobrado - new.custo_fixo - new.custo_variavel;
  else
    new.lucro_liquido  := new.valor_cobrado - new.valor_maquininha - new.valor_profissional - new.custo_fixo - new.custo_variavel;
    new.lucro_possivel := new.valor_cobrado - new.valor_profissional - new.custo_fixo - new.custo_variavel;
  end if;

  if new.status = 'CANCELADO' then
    new.valor_maquininha   := 0;
    new.valor_profissional := 0;
    new.lucro_liquido      := 0;
    new.lucro_possivel     := 0;
  end if;

  new.atualizado_em := now();
  return new;
end;
$$;
