-- ========================================================================================
--  SCHEMA SAAS COMPLETO E DEFINITIVO V5 - BASEADO NA V4 + CATÁLOGO + CUSTOS + FECHAMENTO
-- ========================================================================================

-- ========================================================================================
--  1. LIMPEZA INICIAL (TEARDOWN SEGURO)
-- ========================================================================================
drop view if exists agenda_do_dia cascade;
drop view if exists gastos_pessoais_resumo cascade;
drop view if exists fechamento_mensal cascade;
drop view if exists ranking_procedimentos cascade;
drop view if exists rendimento_por_profissional cascade;
drop view if exists custo_composto_procedimento cascade;

drop table if exists fechamentos cascade;
drop table if exists procedimento_produtos cascade;
drop table if exists produtos_catalogo cascade;
drop table if exists custos_fixos_itens cascade;
drop table if exists logins_gerados cascade;
drop table if exists gastos_pessoais cascade;
drop table if exists despesas cascade;
drop table if exists procedimentos_paralelos cascade;
drop table if exists homecare cascade;
drop table if exists atendimentos cascade;
drop table if exists procedimentos cascade;
drop table if exists profissionais cascade;
drop table if exists configuracoes cascade;
drop table if exists perfis_acesso cascade;
drop table if exists saloes cascade;

drop type if exists cargo_enum cascade;
drop type if exists comprimento_enum cascade;
drop type if exists status_enum cascade;
drop type if exists categoria_enum cascade;
drop type if exists tipo_despesa_enum cascade;

-- ========================================================================================
--  2. EXTENSÕES E TIPOS CUSTOMIZADOS (ENUMS)
-- ========================================================================================
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto"; 

create type cargo_enum        as enum ('PROPRIETARIO', 'FUNCIONARIO', 'VENDEDOR');
create type comprimento_enum  as enum ('P', 'M', 'G');
create type status_enum       as enum ('AGENDADO', 'EXECUTADO', 'CANCELADO');
create type categoria_enum    as enum ('CABELO', 'UNHAS', 'SOBRANCELHAS', 'CILIOS', 'OUTRO');
create type tipo_despesa_enum as enum (
  'ALUGUEL', 'ENERGIA', 'AGUA', 'INTERNET', 'MATERIAL',
  'EQUIPAMENTO', 'FORNECEDOR', 'FUNCIONARIO', 'OUTRO'
);

-- ========================================================================================
--  3. NÚCLEO DO SAAS E PERFIS
-- ========================================================================================
create table saloes (
  id                uuid primary key default uuid_generate_v4(),
  nome              text not null default 'Meu Salão',
  nome_proprietaria text,                                        -- V5.1: Nome da proprietária (wizard)
  telefone          text,
  vendedor_id       uuid references auth.users(id) on delete set null,
  configurado       boolean not null default false,
  ativo             boolean not null default true,
  deletado_em       timestamptz default null,
  criado_em         timestamptz default now(),
  atualizado_em     timestamptz default now()
);
create index idx_saloes_vendedor_id on saloes(vendedor_id);

create table perfis_acesso (
  auth_user_id  uuid primary key references auth.users(id) on delete cascade,
  salao_id      uuid references saloes(id) on delete cascade, -- Nulo se for Vendedor
  cargo         cargo_enum not null default 'PROPRIETARIO',
  username      text,
  criado_em     timestamptz default now(),
  atualizado_em timestamptz default now()
);
create index idx_perfis_username on perfis_acesso(username);

create table configuracoes (
  id                          uuid primary key default uuid_generate_v4(),
  salao_id                    uuid not null unique references saloes(id) on delete cascade,
  custo_fixo_por_atendimento  numeric(10,2) not null default 29.00,
  taxa_maquininha_pct         numeric(5,2)  not null default 5.00,
  prolabore_mensal            numeric(10,2) default 0,
  qtd_atendimentos_mes        integer not null default 100,  -- V5: para rateio de custos fixos
  criado_em                   timestamptz default now(),
  atualizado_em               timestamptz default now()
);

-- ========================================================================================
--  4. TABELAS DE DOMÍNIO E OPERAÇÃO
-- ========================================================================================
create table profissionais (
  id            uuid primary key default uuid_generate_v4(),
  salao_id      uuid not null references saloes(id) on delete cascade,
  nome          text not null,
  cargo         cargo_enum not null default 'FUNCIONARIO',
  salario_fixo  numeric(10,2) not null default 0,
  ativo         boolean not null default true,
  criado_em     timestamptz default now(),
  atualizado_em timestamptz default now()
);

create table procedimentos (
  id                       uuid primary key default uuid_generate_v4(),
  salao_id                 uuid not null references saloes(id) on delete cascade,
  nome                     text not null,
  categoria                categoria_enum not null default 'CABELO',
  requer_comprimento       boolean not null default true,
  preco_p                  numeric(10,2),
  preco_m                  numeric(10,2),
  preco_g                  numeric(10,2),
  custo_variavel           numeric(10,2) not null default 0,
  porcentagem_profissional numeric(5,2)  not null default 40,
  ativo                    boolean not null default true,
  criado_em                timestamptz default now(),
  atualizado_em            timestamptz default now(),
  unique(salao_id, nome)
);

create table atendimentos (
  id                 uuid primary key default uuid_generate_v4(),
  salao_id           uuid not null references saloes(id) on delete cascade,
  data               date not null,
  horario            time not null,
  profissional_id    uuid not null references profissionais(id),
  procedimento_id    uuid not null references procedimentos(id),
  comprimento        comprimento_enum,
  cliente            text not null,
  valor_cobrado      numeric(10,2) not null default 0,
  valor_pago         numeric(10,2) not null default 0,
  valor_pendente     numeric(10,2) generated always as (valor_cobrado - valor_pago) stored,
  
  -- Colunas Calculadas via Trigger
  valor_maquininha   numeric(10,2),
  valor_profissional numeric(10,2),
  custo_fixo         numeric(10,2),
  custo_variavel     numeric(10,2),
  lucro_liquido      numeric(10,2),
  lucro_possivel     numeric(10,2),
  
  status             status_enum not null default 'AGENDADO',
  obs                text,
  criado_em          timestamptz default now(),
  atualizado_em      timestamptz default now()
);
create index idx_atendimentos_salao_data on atendimentos(salao_id, data) where status <> 'CANCELADO';
create index idx_atendimentos_salao_proc on atendimentos(salao_id, procedimento_id);

create table homecare (
  id              uuid primary key default uuid_generate_v4(),
  salao_id        uuid not null references saloes(id) on delete cascade,
  data            date not null,
  cliente         text not null,
  produto         text not null,
  custo_produto   numeric(10,2) not null default 0,
  valor_venda     numeric(10,2) not null default 0,
  valor_pago      numeric(10,2) not null default 0,
  valor_pendente  numeric(10,2) generated always as (valor_venda - valor_pago) stored,
  lucro           numeric(10,2) generated always as (valor_venda - custo_produto) stored,
  obs             text,
  criado_em       timestamptz default now(),
  atualizado_em   timestamptz default now()
);

create table procedimentos_paralelos (
  id                 uuid primary key default uuid_generate_v4(),
  salao_id           uuid not null references saloes(id) on delete cascade,
  data               date not null,
  profissional_id    uuid references profissionais(id),
  descricao          text not null,
  cliente            text not null,
  valor              numeric(10,2) not null default 0,
  valor_pago         numeric(10,2) not null default 0,
  valor_pendente     numeric(10,2) generated always as (valor - valor_pago) stored,
  valor_profissional numeric(10,2) not null default 0, 
  criado_em          timestamptz default now(),
  atualizado_em      timestamptz default now()
);

create table despesas (
  id              uuid primary key default uuid_generate_v4(),
  salao_id        uuid not null references saloes(id) on delete cascade,
  data            date not null,
  descricao       text not null,
  tipo            tipo_despesa_enum not null default 'OUTRO',
  valor           numeric(10,2) not null default 0,
  valor_pago      numeric(10,2) not null default 0,
  valor_pendente  numeric(10,2) generated always as (valor - valor_pago) stored,
  criado_em       timestamptz default now(),
  atualizado_em   timestamptz default now()
);

create table gastos_pessoais (
  id            uuid primary key default uuid_generate_v4(),
  salao_id      uuid not null references saloes(id) on delete cascade,
  descricao     text not null,
  valor         numeric(10, 2) not null check (valor >= 0),
  criado_em     timestamptz default now(),
  atualizado_em timestamptz default now()
);
create index idx_gastos_pessoais_salao_id on gastos_pessoais(salao_id);

create table logins_gerados (
  id                uuid primary key default uuid_generate_v4(),
  vendedor_id       uuid not null references auth.users(id) on delete cascade,
  salao_id          uuid not null references saloes(id) on delete cascade,
  username          text not null,
  senha_temporaria  text not null,
  auth_user_id      uuid references auth.users(id) on delete set null,
  gerado_em         timestamptz default now(),
  alterado_em       timestamptz,
  ativo             boolean default true,
  unique(salao_id, username)
);

-- ========================================================================================
--  4B. V5: CATÁLOGO DE PRODUTOS, COMPOSIÇÃO E CUSTOS FIXOS DETALHADOS
-- ========================================================================================

-- Catálogo de Produtos (replica aba VALORES B11:F27 da planilha)
create table produtos_catalogo (
  id              uuid primary key default uuid_generate_v4(),
  salao_id        uuid not null references saloes(id) on delete cascade,
  nome            text not null,
  preco_compra    numeric(10,2) not null default 0,       
  qtd_aplicacoes  integer not null default 1,              
  custo_por_uso   numeric(10,4) generated always as (
    case when qtd_aplicacoes > 0 then preco_compra / qtd_aplicacoes else 0 end
  ) stored,                                                
  ativo           boolean not null default true,
  criado_em       timestamptz default now(),
  atualizado_em   timestamptz default now()
);
create index idx_produtos_salao on produtos_catalogo(salao_id);

-- Composição de Procedimentos
create table procedimento_produtos (
  id                uuid primary key default uuid_generate_v4(),
  salao_id          uuid not null references saloes(id) on delete cascade,
  procedimento_id   uuid not null references procedimentos(id) on delete cascade,
  produto_id        uuid not null references produtos_catalogo(id) on delete cascade,
  qtd_por_uso       numeric(6,2) not null default 1,  
  criado_em         timestamptz default now(),
  unique(procedimento_id, produto_id)
);
create index idx_proc_prod_proc on procedimento_produtos(procedimento_id);

-- Custos Fixos Detalhados
create table custos_fixos_itens (
  id              uuid primary key default uuid_generate_v4(),
  salao_id        uuid not null references saloes(id) on delete cascade,
  descricao       text not null,
  valor_mensal    numeric(10,2) not null default 0,
  ativo           boolean not null default true,
  criado_em       timestamptz default now(),
  atualizado_em   timestamptz default now()
);
create index idx_custos_fixos_salao on custos_fixos_itens(salao_id);

-- Fechamentos Mensais
create table fechamentos (
  id                      uuid primary key default uuid_generate_v4(),
  salao_id                uuid not null references saloes(id) on delete cascade,
  mes                     date not null,  
  faturamento_bruto       numeric(12,2) not null default 0,
  lucro_liquido           numeric(12,2) not null default 0,
  lucro_possivel          numeric(12,2) not null default 0,
  total_atendimentos      integer not null default 0,
  total_pendente          numeric(12,2) not null default 0,
  total_despesas          numeric(12,2) not null default 0,
  total_gastos_pessoais   numeric(12,2) not null default 0,
  lucro_homecare          numeric(12,2) not null default 0,
  resultado_final         numeric(12,2) not null default 0,  
  obs                     text,
  fechado_em              timestamptz default now(),
  unique(salao_id, mes)
);

-- ========================================================================================
--  5. FUNÇÕES AUXILIARES (HELPERS)
-- ========================================================================================

create or replace function fn_gerar_username(p_nome text) returns text as $$
declare
  v_username text;
begin
  v_username := lower(p_nome);
  v_username := replace(v_username, ' ', '_');
  v_username := regexp_replace(v_username, '[^a-z0-9_]', '', 'g');
  v_username := substring(v_username, 1, 20);
  return coalesce(nullif(v_username, ''), 'user_' || to_char(now(), 'DDMMYYHH24MISS'));
end;
$$ language plpgsql immutable;

create or replace function fn_gerar_senha_aleatoria(length int default 12) returns text as $$
declare
  chars text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
  result text := '';
  i int;
begin
  for i in 1..length loop
    result := result || substr(chars, floor(random() * length(chars)) + 1, 1);
  end loop;
  return result;
end;
$$ language plpgsql;

create or replace function fn_deletar_salao(p_salao_id uuid) returns json as $$
declare
  v_salao_id uuid;
begin
  select id into v_salao_id from saloes where id = p_salao_id and deletado_em is null limit 1;
  if v_salao_id is null then return json_build_object('sucesso', false); end if;
  update saloes set deletado_em = now(), ativo = false where id = p_salao_id;
  return json_build_object('sucesso', true);
end;
$$ language plpgsql security definer;


-- ========================================================================================
--  6. TRIGGERS E CÁLCULOS
-- ========================================================================================

create or replace function public.fn_atualizar_timestamp() returns trigger as $$
begin new.atualizado_em = now(); return new; end;
$$ language plpgsql;

create trigger trg_saloes_upd before update on saloes for each row execute function fn_atualizar_timestamp();
create trigger trg_perfis_upd before update on perfis_acesso for each row execute function fn_atualizar_timestamp();
create trigger trg_config_upd before update on configuracoes for each row execute function fn_atualizar_timestamp();
create trigger trg_profs_upd before update on profissionais for each row execute function fn_atualizar_timestamp();
create trigger trg_procs_upd before update on procedimentos for each row execute function fn_atualizar_timestamp();
create trigger trg_homecare_upd before update on homecare for each row execute function fn_atualizar_timestamp();
create trigger trg_paralelos_upd before update on procedimentos_paralelos for each row execute function fn_atualizar_timestamp();
create trigger trg_despesas_upd before update on despesas for each row execute function fn_atualizar_timestamp();
create trigger trg_gastos_upd before update on gastos_pessoais for each row execute function fn_atualizar_timestamp();
create trigger trg_produtos_upd before update on produtos_catalogo for each row execute function fn_atualizar_timestamp();
create trigger trg_custos_fixos_upd before update on custos_fixos_itens for each row execute function fn_atualizar_timestamp();

create or replace function fn_calcular_atendimento() returns trigger language plpgsql as $$
declare
  v_proc       procedimentos%rowtype;
  v_cfg        configuracoes%rowtype;
  v_cargo_prof cargo_enum;
  v_preco      numeric(10,2);
begin
  select * into v_proc from procedimentos where id = new.procedimento_id;
  select * into v_cfg  from configuracoes   where salao_id = new.salao_id;
  select cargo into v_cargo_prof from profissionais where id = new.profissional_id;

  if not v_proc.requer_comprimento or new.comprimento = 'P' then
    v_preco := v_proc.preco_p;
  elsif new.comprimento = 'M' then
    v_preco := coalesce(v_proc.preco_m, v_proc.preco_p);
  elsif new.comprimento = 'G' then
    v_preco := coalesce(v_proc.preco_g, v_proc.preco_p);
  else
    v_preco := coalesce(v_proc.preco_p, 0);
  end if;

  if new.valor_cobrado = 0 or new.valor_cobrado is null then
    new.valor_cobrado := v_preco;
  end if;

  if v_cfg.id is null then
     new.valor_maquininha := 0;
     new.custo_fixo       := 0;
  else
     new.valor_maquininha := round(new.valor_cobrado * coalesce(v_cfg.taxa_maquininha_pct, 0) / 100, 2);
     new.custo_fixo       := coalesce(v_cfg.custo_fixo_por_atendimento, 0);
  end if;

  new.valor_profissional := round(new.valor_cobrado * v_proc.porcentagem_profissional / 100, 2);
  new.custo_variavel     := v_proc.custo_variavel;

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

create trigger trg_calcular_atendimento
  before insert or update on atendimentos
  for each row execute function fn_calcular_atendimento();

-- ========================================================================================
--  7. INTEGRAÇÃO COM SUPABASE AUTH (PERFIS E LOGINS GERADOS)
-- ========================================================================================

create or replace function public.handle_new_user_salao() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_salao_id uuid; 
  v_cargo cargo_enum; 
  v_vendedor_id uuid;
  v_username text;
  v_cargo_text text;
begin
  v_cargo_text := new.raw_user_meta_data->>'cargo';
  
  if v_cargo_text is not null and v_cargo_text in ('PROPRIETARIO', 'FUNCIONARIO', 'VENDEDOR') then
    v_cargo := v_cargo_text::cargo_enum;
  else
    v_cargo := 'PROPRIETARIO'::cargo_enum;
  end if;

  begin
    v_salao_id := (new.raw_user_meta_data->>'salao_id')::uuid;
  exception when others then
    v_salao_id := null;
  end;

  begin
    v_vendedor_id := (new.raw_user_meta_data->>'vendedor_id')::uuid;
  exception when others then
    v_vendedor_id := null;
  end;

  v_username := coalesce(new.raw_user_meta_data->>'username', fn_gerar_username(coalesce(new.email, 'user')));

  if v_cargo = 'VENDEDOR' then
    insert into public.perfis_acesso (auth_user_id, salao_id, cargo, username)
    values (new.id, NULL, v_cargo, v_username)
    on conflict (auth_user_id) do nothing;
    return new;
  end if;

  if v_salao_id is null then
    insert into public.saloes (nome, vendedor_id)
    values ('Salão de ' || coalesce(v_username, new.email, 'Usuário'), v_vendedor_id)
    returning id into v_salao_id;

    insert into public.configuracoes (salao_id, custo_fixo_por_atendimento, taxa_maquininha_pct, qtd_atendimentos_mes)
    values (v_salao_id, 29.00, 5.00, 100);
  end if;

  insert into public.perfis_acesso (auth_user_id, salao_id, cargo, username)
  values (new.id, v_salao_id, v_cargo, v_username)
  on conflict (auth_user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user_salao();

create or replace function fn_registrar_login_gerado() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_salao_id uuid;
  v_vendedor_id uuid;
  v_username text;
  v_senha text;
  v_cargo_text text;
begin
  v_cargo_text := new.raw_user_meta_data->>'cargo';
  
  if v_cargo_text is null or v_cargo_text <> 'PROPRIETARIO' then
    return new;
  end if;

  begin
    v_salao_id := (new.raw_user_meta_data->>'salao_id')::uuid;
  exception when others then
    return new;
  end;

  begin
    v_vendedor_id := (new.raw_user_meta_data->>'vendedor_id')::uuid;
  exception when others then
    return new;
  end;

  if v_salao_id is null or v_vendedor_id is null then
    return new;
  end if;

  v_username := coalesce((new.raw_user_meta_data->>'username'), fn_gerar_username(coalesce(new.email, 'user')));
  v_senha := coalesce((new.raw_user_meta_data->>'senha'), fn_gerar_senha_aleatoria(12));

  insert into public.logins_gerados (vendedor_id, salao_id, username, senha_temporaria, auth_user_id, ativo)
  values (v_vendedor_id, v_salao_id, v_username, v_senha, new.id, true)
  on conflict (salao_id, username) do update set
    auth_user_id = new.id,
    alterado_em = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_login_registered on auth.users;
create trigger on_auth_user_login_registered
  after insert on auth.users for each row execute function public.fn_registrar_login_gerado();


-- ========================================================================================
--  8. VIEWS DE DASHBOARD E RELATÓRIOS
-- ========================================================================================

create or replace view agenda_do_dia with (security_invoker = true) as
select
  a.id, a.salao_id, a.data, a.horario, a.cliente, a.comprimento, a.valor_cobrado, a.valor_pago, a.valor_pendente,
  a.valor_profissional, a.lucro_liquido, a.lucro_possivel, a.status, a.obs,
  p.id as profissional_id, p.nome as profissional_nome, p.cargo,
  pr.id as procedimento_id, pr.nome as procedimento_nome, pr.categoria, pr.requer_comprimento
from atendimentos a
join profissionais  p  on p.id  = a.profissional_id
join procedimentos  pr on pr.id = a.procedimento_id
order by a.data, a.horario, p.nome;

create or replace view custo_composto_procedimento with (security_invoker = true) as
select
  pp.procedimento_id,
  pp.salao_id,
  sum(pc.custo_por_uso * pp.qtd_por_uso) as custo_total_composicao,
  count(*) as qtd_produtos
from procedimento_produtos pp
join produtos_catalogo pc on pc.id = pp.produto_id
where pc.ativo = true
group by pp.procedimento_id, pp.salao_id;

create or replace view fechamento_mensal with (security_invoker = true) as
with base as (
  select salao_id, date_trunc('month', data)::date as mes from atendimentos
  union select salao_id, date_trunc('month', data)::date from homecare
  union select salao_id, date_trunc('month', data)::date from procedimentos_paralelos
  union select salao_id, date_trunc('month', data)::date from despesas
),
atend as (
  select
    salao_id, date_trunc('month', data)::date as mes,
    sum(valor_cobrado) filter (where status <> 'CANCELADO') as receita_bruta,
    sum(valor_pago) filter (where status <> 'CANCELADO') as receita_recebida,
    sum(valor_pendente) filter (where status = 'EXECUTADO') as pendencias,
    sum(valor_maquininha) filter (where status <> 'CANCELADO') as total_maquininha,
    sum(valor_profissional) filter (where status <> 'CANCELADO') as total_profissionais,
    sum(custo_fixo) filter (where status <> 'CANCELADO') as total_custo_fixo,
    sum(custo_variavel) filter (where status <> 'CANCELADO') as total_custo_variavel,
    sum(lucro_liquido) filter (where status <> 'CANCELADO') as lucro_liquido,
    sum(lucro_possivel) filter (where status <> 'CANCELADO') as lucro_possivel,
    count(*) filter (where status <> 'CANCELADO') as total_atendimentos,
    count(*) filter (where status = 'CANCELADO') as total_cancelamentos
  from atendimentos group by 1,2
),
hc as (
  select salao_id, date_trunc('month', data)::date as mes, sum(valor_venda) as receita_homecare,
  sum(valor_pago) as recebido_homecare, sum(valor_pendente) as pendente_homecare, sum(lucro) as lucro_homecare
  from homecare group by 1,2
),
pp as (
  select salao_id, date_trunc('month', data)::date as mes, sum(valor) as receita_paralelos,
  sum(valor_pago) as recebido_paralelos, sum(valor_pendente) as pendente_paralelos
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
  coalesce(a.receita_bruta, 0)            as receita_bruta,
  coalesce(a.receita_recebida, 0)         as receita_recebida,
  coalesce(a.pendencias, 0)               as pendencias,
  coalesce(a.total_maquininha, 0)         as total_maquininha,
  coalesce(a.total_profissionais, 0)      as total_profissionais,
  coalesce(a.total_custo_fixo, 0)         as total_custo_fixo,
  coalesce(a.total_custo_variavel, 0)     as total_custo_variavel,
  coalesce(a.lucro_liquido, 0)            as lucro_liquido_atendimentos,
  coalesce(a.lucro_possivel, 0)           as lucro_possivel_atendimentos,
  coalesce(a.total_atendimentos, 0)       as total_atendimentos,
  coalesce(a.total_cancelamentos, 0)      as total_cancelamentos,
  coalesce(h.receita_homecare, 0)         as receita_homecare,
  coalesce(h.lucro_homecare, 0)           as lucro_homecare,
  coalesce(h.pendente_homecare, 0)        as pendente_homecare,
  coalesce(p.receita_paralelos, 0)        as receita_paralelos,
  coalesce(p.pendente_paralelos, 0)       as pendente_paralelos,
  coalesce(d.total_despesas, 0)           as total_despesas,
  coalesce(s.total_salarios_fixos, 0)     as total_salarios_fixos,
  coalesce(a.receita_bruta, 0) + coalesce(h.receita_homecare, 0) + coalesce(p.receita_paralelos, 0) as receita_total,
  coalesce(a.lucro_liquido, 0) + coalesce(h.lucro_homecare, 0) - coalesce(d.total_despesas, 0) - coalesce(s.total_salarios_fixos, 0) as saude_financeira
from base b
left join atend a on a.salao_id = b.salao_id and a.mes = b.mes
left join hc    h on h.salao_id = b.salao_id and h.mes = b.mes
left join pp    p on p.salao_id = b.salao_id and p.mes = b.mes
left join desp  d on d.salao_id = b.salao_id and d.mes = b.mes
left join sal   s on s.salao_id = b.salao_id
order by b.mes desc;

create or replace view ranking_procedimentos with (security_invoker = true) as
select
  a.salao_id, date_trunc('month', a.data)::date as mes, pr.nome as procedimento,
  count(*) filter (where a.status <> 'CANCELADO') as quantidade,
  sum(a.valor_cobrado) filter (where a.status <> 'CANCELADO') as receita_total,
  sum(a.lucro_liquido) filter (where a.status <> 'CANCELADO') as lucro_total,
  round(sum(a.valor_cobrado) filter (where a.status <> 'CANCELADO') / nullif(count(*) filter (where a.status <> 'CANCELADO'), 0), 2) as ticket_medio
from atendimentos a join procedimentos pr on pr.id = a.procedimento_id
group by a.salao_id, date_trunc('month', a.data)::date, pr.nome;

create or replace view rendimento_por_profissional with (security_invoker = true) as
select
  a.salao_id, date_trunc('month', a.data)::date as mes, p.nome as profissional, p.cargo,
  count(*) filter (where a.status = 'EXECUTADO') as atendimentos,
  sum(a.valor_profissional) filter (where a.status = 'EXECUTADO') as rendimento_bruto,
  sum(a.valor_cobrado) filter (where a.status = 'EXECUTADO') as faturamento_gerado
from atendimentos a join profissionais p on p.id = a.profissional_id
group by a.salao_id, date_trunc('month', a.data)::date, p.id, p.nome, p.cargo;

create or replace view gastos_pessoais_resumo with (security_invoker = true) as
select
  g.salao_id, date_trunc('month', g.criado_em)::date as mes, count(*) as quantidade_gastos,
  sum(g.valor) as total_gastos, round(avg(g.valor), 2) as gasto_medio
from gastos_pessoais g
group by g.salao_id, date_trunc('month', g.criado_em)::date order by g.salao_id, mes desc;

-- ========================================================================================
--  9. SEGURANÇA MÁXIMA (RLS)
-- ========================================================================================
alter table saloes                  enable row level security;
alter table perfis_acesso           enable row level security;
alter table configuracoes           enable row level security;
alter table profissionais           enable row level security;
alter table procedimentos           enable row level security;
alter table atendimentos            enable row level security;
alter table homecare                enable row level security;
alter table procedimentos_paralelos enable row level security;
alter table despesas                enable row level security;
alter table gastos_pessoais         enable row level security;
alter table logins_gerados          enable row level security;
alter table produtos_catalogo       enable row level security;
alter table procedimento_produtos   enable row level security;
alter table custos_fixos_itens      enable row level security;
alter table fechamentos             enable row level security;

create policy "Salao: acesso por perfil" on saloes for select to authenticated using (id in (select salao_id from perfis_acesso where auth_user_id = auth.uid()));
create policy "Salao: membro atualiza" on saloes for update to authenticated using (id in (select salao_id from perfis_acesso where auth_user_id = auth.uid() and cargo = 'PROPRIETARIO')) with check (id in (select salao_id from perfis_acesso where auth_user_id = auth.uid() and cargo = 'PROPRIETARIO'));
create policy "Salao: vendedor ve seus clientes" on saloes for select to authenticated using (vendedor_id = auth.uid());
create policy "Salao: vendedor cria" on saloes for insert to authenticated with check (vendedor_id = auth.uid());

create policy "Perfil: leitura propria" on perfis_acesso for select to authenticated using (auth_user_id = auth.uid());

create policy "Isolar configuracoes" on configuracoes for all to authenticated using (salao_id in (select salao_id from perfis_acesso where auth_user_id = auth.uid()));
create policy "Isolar profs" on profissionais for all to authenticated using (salao_id in (select salao_id from perfis_acesso where auth_user_id = auth.uid()));
create policy "Isolar procs" on procedimentos for all to authenticated using (salao_id in (select salao_id from perfis_acesso where auth_user_id = auth.uid()));
create policy "Isolar atendimentos" on atendimentos for all to authenticated using (salao_id in (select salao_id from perfis_acesso where auth_user_id = auth.uid()));
create policy "Isolar homecare" on homecare for all to authenticated using (salao_id in (select salao_id from perfis_acesso where auth_user_id = auth.uid()));
create policy "Isolar paralelos" on procedimentos_paralelos for all to authenticated using (salao_id in (select salao_id from perfis_acesso where auth_user_id = auth.uid()));
create policy "Isolar despesas" on despesas for all to authenticated using (salao_id in (select salao_id from perfis_acesso where auth_user_id = auth.uid()));
create policy "Isolar gastos pessoais" on gastos_pessoais for all to authenticated using (salao_id in (select salao_id from perfis_acesso where auth_user_id = auth.uid()));
create policy "Vendedor ve seus logins" on logins_gerados for all to authenticated using (vendedor_id = auth.uid());
create policy "Isolar produtos" on produtos_catalogo for all to authenticated using (salao_id in (select salao_id from perfis_acesso where auth_user_id = auth.uid()));
create policy "Isolar proc_prod" on procedimento_produtos for all to authenticated using (salao_id in (select salao_id from perfis_acesso where auth_user_id = auth.uid()));
create policy "Isolar custos fixos" on custos_fixos_itens for all to authenticated using (salao_id in (select salao_id from perfis_acesso where auth_user_id = auth.uid()));
create policy "Isolar fechamentos" on fechamentos for all to authenticated using (salao_id in (select salao_id from perfis_acesso where auth_user_id = auth.uid()));

-- ========================================================================================
--  10. RPC: Buscar email do username
-- ========================================================================================
create or replace function get_email_from_username(p_username text)
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_email text;
begin
  select u.email into v_email
  from perfis_acesso pa
  join auth.users u on u.id = pa.auth_user_id
  where pa.username = p_username
  limit 1;
  return v_email;
end;
$$;
