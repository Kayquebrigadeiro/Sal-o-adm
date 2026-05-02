-- ============================================================================
--  SCHEMA V8 — PARTE 2: LÓGICA E RELATÓRIOS
--  Finalidade: Implementar a inteligência do banco (Cálculos automáticos e Relatórios).
--  ⚠️ IMPORTANTE: As views aqui devem refletir os nomes usados no Dashboard.jsx.
-- ============================================================================

-- ════════════════════════════════════════════════════════
-- FUNÇÕES AUXILIARES
-- ════════════════════════════════════════════════════════
create or replace function fn_gerar_username(p_nome text) returns text as $$
declare v_username text;
begin
  v_username := lower(p_nome);
  v_username := replace(v_username, ' ', '_');
  v_username := regexp_replace(v_username, '[^a-z0-9_]', '', 'g');
  v_username := substring(v_username, 1, 20);
  return coalesce(nullif(v_username, ''), 'user_' || to_char(now(), 'DDMMYYHH24MISS'));
end;
$$ language plpgsql immutable;

create or replace function fn_gerar_senha_aleatoria(length int default 12) returns text as $$
declare chars text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%'; result text := ''; i int;
begin
  for i in 1..length loop result := result || substr(chars, floor(random() * length(chars)) + 1, 1); end loop;
  return result;
end;
$$ language plpgsql;

create or replace function fn_deletar_salao(p_salao_id uuid) returns json as $$
declare v_id uuid;
begin
  select id into v_id from saloes where id = p_salao_id and deletado_em is null limit 1;
  if v_id is null then return json_build_object('sucesso', false); end if;
  update saloes set deletado_em = now(), ativo = false where id = p_salao_id;
  return json_build_object('sucesso', true);
end;
$$ language plpgsql security definer;

create or replace function get_email_from_username(p_username text) returns text
language plpgsql security definer set search_path = public as $$
declare v_email text;
begin
  select u.email into v_email from perfis_acesso pa join auth.users u on u.id = pa.auth_user_id where pa.username = p_username limit 1;
  return v_email;
end;
$$;

-- ════════════════════════════════════════════════════════
-- TRIGGER: ATUALIZAR TIMESTAMP
-- ════════════════════════════════════════════════════════
create or replace function public.fn_atualizar_timestamp() returns trigger as $$
begin new.atualizado_em = now(); return new; end;
$$ language plpgsql;

do $$ 
declare t text;
begin
  for t in select unnest(array[
    'saloes','perfis_acesso','configuracoes','profissionais','procedimentos',
    'homecare','procedimentos_paralelos','despesas','gastos_pessoais',
    'produtos_catalogo','custos_fixos_itens','assinaturas'
  ]) loop
    execute format('drop trigger if exists trg_%s_upd on %I', replace(t,'_',''), t);
    execute format('create trigger trg_%s_upd before update on %I for each row execute function fn_atualizar_timestamp()', replace(t,'_',''), t);
  end loop;
end $$;

-- ════════════════════════════════════════════════════════
-- TRIGGER: CATEGORIA → COMPRIMENTO
-- ════════════════════════════════════════════════════════
create or replace function fn_calcular_custo_produto_aplicado() returns trigger language plpgsql as $$
begin
  if new.categoria = 'SERVICO_ESTETICA' then new.requer_comprimento := false; end if;
  if new.categoria = 'SERVICO_CABELO' then new.requer_comprimento := true; end if;
  return new;
end;
$$;
drop trigger if exists trg_calc_produto_aplicado on procedimentos;
create trigger trg_calc_produto_aplicado before insert or update on procedimentos for each row execute function fn_calcular_custo_produto_aplicado();

-- ════════════════════════════════════════════════════════
-- TRIGGER: CÁLCULO FINANCEIRO DO ATENDIMENTO
-- ════════════════════════════════════════════════════════
create or replace function fn_calcular_atendimento() returns trigger language plpgsql as $$
declare
  v_proc procedimentos%rowtype;
  v_cfg  configuracoes%rowtype;
  v_cargo_prof cargo_enum;
  v_preco numeric(10,2);
begin
  select * into v_proc from procedimentos where id = new.procedimento_id;
  select * into v_cfg  from configuracoes where salao_id = new.salao_id;
  select cargo into v_cargo_prof from profissionais where id = new.profissional_id;

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
    new.valor_maquininha := 0; new.custo_fixo := 0;
  else
    new.valor_maquininha := round(coalesce(new.valor_cobrado, 0) * coalesce(v_cfg.taxa_maquininha_pct, 0) / 100, 2);
    new.custo_fixo := coalesce(v_cfg.custo_fixo_por_atendimento, 0);
  end if;

  new.valor_profissional := 0;
  new.custo_variavel := coalesce(v_proc.custo_variavel, 0);
  new.lucro_liquido  := new.valor_cobrado - new.valor_maquininha - new.custo_fixo - new.custo_variavel;
  new.lucro_possivel := new.valor_cobrado - new.custo_fixo - new.custo_variavel;

  if new.status = 'CANCELADO' then
    new.valor_maquininha := 0; new.valor_profissional := 0;
    new.lucro_liquido := 0; new.lucro_possivel := 0;
  end if;

  new.atualizado_em := now();
  return new;
end;
$$;
drop trigger if exists trg_calcular_atendimento on atendimentos;
create trigger trg_calcular_atendimento before insert or update on atendimentos for each row execute function fn_calcular_atendimento();

-- ════════════════════════════════════════════════════════
-- TRIGGER: AUTH → PERFIL + SALÃO AUTOMÁTICO
-- ════════════════════════════════════════════════════════
create or replace function public.handle_new_user_salao() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_salao_id uuid; v_cargo cargo_enum; v_vendedor_id uuid; v_username text; v_cargo_text text;
begin
  v_cargo_text := new.raw_user_meta_data->>'cargo';
  if v_cargo_text is not null and v_cargo_text in ('PROPRIETARIO','FUNCIONARIO','VENDEDOR') then
    v_cargo := v_cargo_text::cargo_enum;
  else v_cargo := 'PROPRIETARIO'::cargo_enum; end if;

  begin v_salao_id := (new.raw_user_meta_data->>'salao_id')::uuid; exception when others then v_salao_id := null; end;
  begin v_vendedor_id := (new.raw_user_meta_data->>'vendedor_id')::uuid; exception when others then v_vendedor_id := null; end;
  v_username := coalesce(new.raw_user_meta_data->>'username', fn_gerar_username(coalesce(new.email, 'user')));

  if v_cargo = 'VENDEDOR' then
    insert into perfis_acesso (auth_user_id, salao_id, cargo, username) values (new.id, null, v_cargo, v_username) on conflict (auth_user_id) do nothing;
    return new;
  end if;

  if v_salao_id is null then
    insert into saloes (nome, vendedor_id) values ('Salão de ' || coalesce(v_username, new.email, 'Usuário'), v_vendedor_id) returning id into v_salao_id;
    insert into configuracoes (salao_id) values (v_salao_id);
  end if;

  insert into perfis_acesso (auth_user_id, salao_id, cargo, username) values (new.id, v_salao_id, v_cargo, v_username) on conflict (auth_user_id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user_salao();

create or replace function fn_registrar_login_gerado() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_salao_id uuid; v_vendedor_id uuid; v_username text; v_senha text; v_cargo_text text;
begin
  v_cargo_text := new.raw_user_meta_data->>'cargo';
  if v_cargo_text is null or v_cargo_text <> 'PROPRIETARIO' then return new; end if;
  begin v_salao_id := (new.raw_user_meta_data->>'salao_id')::uuid; exception when others then return new; end;
  begin v_vendedor_id := (new.raw_user_meta_data->>'vendedor_id')::uuid; exception when others then return new; end;
  if v_salao_id is null or v_vendedor_id is null then return new; end if;
  v_username := coalesce((new.raw_user_meta_data->>'username'), fn_gerar_username(coalesce(new.email, 'user')));
  v_senha := coalesce((new.raw_user_meta_data->>'senha'), fn_gerar_senha_aleatoria(12));
  insert into logins_gerados (vendedor_id, salao_id, username, senha_temporaria, auth_user_id, ativo)
  values (v_vendedor_id, v_salao_id, v_username, v_senha, new.id, true)
  on conflict (salao_id, username) do update set auth_user_id = new.id, alterado_em = now();
  return new;
end;
$$;
drop trigger if exists on_auth_user_login_registered on auth.users;
create trigger on_auth_user_login_registered after insert on auth.users for each row execute function fn_registrar_login_gerado();

-- ════════════════════════════════════════════════════════
-- VIEWS (aliases EXATAMENTE como Dashboard.jsx busca)
-- ════════════════════════════════════════════════════════
create or replace view agenda_do_dia with (security_invoker = true) as
select
  a.id, a.salao_id, a.data, a.horario, a.cliente, a.comprimento,
  a.valor_cobrado, a.valor_pago, a.valor_pendente,
  a.valor_profissional, a.lucro_liquido, a.lucro_possivel, a.status, a.obs,
  p.id as profissional_id, p.nome as profissional_nome, p.cargo,
  pr.id as procedimento_id, pr.nome as procedimento_nome, pr.categoria, pr.requer_comprimento
from atendimentos a
join profissionais p on p.id = a.profissional_id
join procedimentos pr on pr.id = a.procedimento_id
order by a.data, a.horario, p.nome;

create or replace view custo_composto_procedimento with (security_invoker = true) as
select
  pp.procedimento_id, pp.salao_id,
  sum(pc.custo_por_uso * pp.qtd_por_uso) as custo_total_composicao,
  count(*) as qtd_produtos
from procedimento_produtos pp
join produtos_catalogo pc on pc.id = pp.produto_id
where pc.ativo = true
group by pp.procedimento_id, pp.salao_id;

-- ⚠️ fechamento_mensal: aliases DEVEM ser faturamento_bruto, lucro_real, lucro_possivel, total_pendente
create or replace view fechamento_mensal with (security_invoker = true) as
with base as (
  select salao_id, date_trunc('month', data)::date as mes from atendimentos
  union select salao_id, date_trunc('month', data)::date from homecare
  union select salao_id, date_trunc('month', data)::date from procedimentos_paralelos
  union select salao_id, date_trunc('month', data)::date from despesas
),
atend as (
  -- ⚠️ FIX 02/05/2026: Apenas EXECUTADOS contam como receita real.
  -- Antes usava status <> 'CANCELADO', o que incluía AGENDADOS nos totais.
  select salao_id, date_trunc('month', data)::date as mes,
    sum(valor_cobrado) filter (where status = 'EXECUTADO') as faturamento_bruto,
    sum(valor_pago) filter (where status = 'EXECUTADO') as receita_recebida,
    sum(valor_cobrado - valor_pago) filter (where status = 'EXECUTADO') as total_pendente,
    sum(valor_maquininha) filter (where status = 'EXECUTADO') as total_maquininha,
    sum(valor_profissional) filter (where status = 'EXECUTADO') as total_profissionais,
    sum(custo_fixo) filter (where status = 'EXECUTADO') as total_custo_fixo,
    sum(custo_variavel) filter (where status = 'EXECUTADO') as total_custo_variavel,
    sum(lucro_liquido) filter (where status = 'EXECUTADO') as lucro_real,
    sum(lucro_possivel) filter (where status = 'EXECUTADO') as lucro_possivel,
    count(*) filter (where status = 'EXECUTADO') as total_atendimentos,
    count(*) filter (where status = 'CANCELADO') as total_cancelamentos
  from atendimentos group by 1,2
),
hc as (
  select salao_id, date_trunc('month', data)::date as mes,
    sum(valor_venda) as receita_homecare, sum(valor_pago) as recebido_homecare,
    sum(valor_pendente) as pendente_homecare, sum(lucro) as lucro_homecare
  from homecare group by 1,2
),
pp as (
  select salao_id, date_trunc('month', data)::date as mes,
    sum(valor) as receita_paralelos, sum(valor_pago) as recebido_paralelos,
    sum(valor_pendente) as pendente_paralelos
  from procedimentos_paralelos group by 1,2
),
desp as (
  select salao_id, date_trunc('month', data)::date as mes, sum(valor) as total_despesas
  from despesas group by 1,2
),
sal as (
  select salao_id, sum(salario_fixo) as total_salarios_fixos
  from profissionais where ativo = true and cargo = 'FUNCIONARIO' group by salao_id
)
select
  b.salao_id, b.mes,
  coalesce(a.faturamento_bruto, 0) as faturamento_bruto,
  coalesce(a.receita_recebida, 0) as receita_recebida,
  coalesce(a.total_pendente, 0) as total_pendente,
  coalesce(a.total_maquininha, 0) as total_maquininha,
  coalesce(a.total_profissionais, 0) as total_profissionais,
  coalesce(a.total_custo_fixo, 0) as total_custo_fixo,
  coalesce(a.total_custo_variavel, 0) as total_custo_variavel,
  coalesce(a.lucro_real, 0) as lucro_real,
  coalesce(a.lucro_possivel, 0) as lucro_possivel,
  coalesce(a.total_atendimentos, 0) as total_atendimentos,
  coalesce(a.total_cancelamentos, 0) as total_cancelamentos,
  coalesce(h.receita_homecare, 0) as receita_homecare,
  coalesce(h.lucro_homecare, 0) as lucro_homecare,
  coalesce(h.pendente_homecare, 0) as pendente_homecare,
  coalesce(p.receita_paralelos, 0) as receita_paralelos,
  coalesce(p.pendente_paralelos, 0) as pendente_paralelos,
  coalesce(d.total_despesas, 0) as total_despesas,
  coalesce(s.total_salarios_fixos, 0) as total_salarios_fixos,
  coalesce(a.faturamento_bruto, 0) + coalesce(h.receita_homecare, 0) + coalesce(p.receita_paralelos, 0) as receita_total,
  coalesce(a.lucro_real, 0) + coalesce(h.lucro_homecare, 0) - coalesce(d.total_despesas, 0) - coalesce(s.total_salarios_fixos, 0) as saude_financeira
from base b
left join atend a on a.salao_id = b.salao_id and a.mes = b.mes
left join hc h on h.salao_id = b.salao_id and h.mes = b.mes
left join pp p on p.salao_id = b.salao_id and p.mes = b.mes
left join desp d on d.salao_id = b.salao_id and d.mes = b.mes
left join sal s on s.salao_id = b.salao_id
order by b.mes desc;

create or replace view ranking_procedimentos with (security_invoker = true) as
select
  a.salao_id, date_trunc('month', a.data)::date as mes, pr.nome as procedimento, pr.categoria,
  count(*) filter (where a.status <> 'CANCELADO') as quantidade,
  sum(a.valor_cobrado) filter (where a.status <> 'CANCELADO') as receita_total,
  sum(a.lucro_liquido) filter (where a.status <> 'CANCELADO') as lucro_total,
  round(sum(a.valor_cobrado) filter (where a.status <> 'CANCELADO') / nullif(count(*) filter (where a.status <> 'CANCELADO'), 0), 2) as ticket_medio
from atendimentos a join procedimentos pr on pr.id = a.procedimento_id
group by a.salao_id, date_trunc('month', a.data)::date, pr.nome, pr.categoria;

-- ⚠️ rendimento_bruto usa valor_cobrado (comissão removida no V7)
create or replace view rendimento_por_profissional with (security_invoker = true) as
select
  a.salao_id, date_trunc('month', a.data)::date as mes, p.nome as profissional, p.cargo,
  count(*) filter (where a.status = 'EXECUTADO') as atendimentos,
  sum(a.valor_cobrado) filter (where a.status = 'EXECUTADO') as rendimento_bruto,
  sum(a.valor_cobrado) filter (where a.status = 'EXECUTADO') as faturamento_gerado
from atendimentos a join profissionais p on p.id = a.profissional_id
group by a.salao_id, date_trunc('month', a.data)::date, p.id, p.nome, p.cargo;

create or replace view gastos_pessoais_resumo with (security_invoker = true) as
select
  g.salao_id, date_trunc('month', g.criado_em)::date as mes,
  count(*) as quantidade_gastos, sum(g.valor) as total_gastos, round(avg(g.valor), 2) as gasto_medio
from gastos_pessoais g
group by g.salao_id, date_trunc('month', g.criado_em)::date order by g.salao_id, mes desc;
