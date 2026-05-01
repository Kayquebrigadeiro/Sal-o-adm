-- ============================================================================
--  SCHEMA V8 — PARTE 1: TIPOS E TABELAS
--  Salão Secreto SaaS — Produção
--  Atualizado: 2026-05-01
--  ⚠️ NÃO RODE ESTE SCRIPT EM BANCO COM DADOS — use apenas para recriar do zero
-- ============================================================================

-- 1. EXTENSÕES
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- 2. ENUMS
do $$ begin
  create type cargo_enum as enum ('PROPRIETARIO', 'FUNCIONARIO', 'VENDEDOR');
exception when duplicate_object then null;
end $$;
do $$ begin
  create type comprimento_enum as enum ('P', 'M', 'G');
exception when duplicate_object then null;
end $$;
do $$ begin
  create type status_enum as enum ('AGENDADO', 'EXECUTADO', 'CANCELADO');
exception when duplicate_object then null;
end $$;
do $$ begin
  create type categoria_enum as enum ('SERVICO_CABELO', 'PRODUTO_APLICADO', 'SERVICO_ESTETICA');
exception when duplicate_object then null;
end $$;
do $$ begin
  create type tipo_despesa_enum as enum (
    'ALUGUEL','ENERGIA','AGUA','INTERNET','MATERIAL',
    'EQUIPAMENTO','FORNECEDOR','FUNCIONARIO','OUTRO','PRODUTO'
  );
exception when duplicate_object then null;
end $$;
do $$ begin
  create type status_assinatura_enum as enum ('TRIAL','ATIVA','SUSPENSA','CANCELADA','EXPIRADA');
exception when duplicate_object then null;
end $$;

-- ============================================================================
-- 3. TABELAS NÚCLEO
-- ============================================================================
create table if not exists saloes (
  id                uuid primary key default uuid_generate_v4(),
  nome              text not null default 'Meu Salão',
  nome_proprietaria text,
  telefone          text,
  vendedor_id       uuid references auth.users(id) on delete set null,
  configurado       boolean not null default false,
  ativo             boolean not null default true,
  deletado_em       timestamptz default null,
  criado_em         timestamptz default now(),
  atualizado_em     timestamptz default now()
);
create index if not exists idx_saloes_vendedor on saloes(vendedor_id);

create table if not exists perfis_acesso (
  auth_user_id  uuid primary key references auth.users(id) on delete cascade,
  salao_id      uuid references saloes(id) on delete cascade,
  cargo         cargo_enum not null default 'PROPRIETARIO',
  username      text,
  criado_em     timestamptz default now(),
  atualizado_em timestamptz default now()
);
create index if not exists idx_perfis_username on perfis_acesso(username);

create table if not exists configuracoes (
  id                          uuid primary key default uuid_generate_v4(),
  salao_id                    uuid not null unique references saloes(id) on delete cascade,
  custo_fixo_por_atendimento  numeric(10,2) not null default 29.00,
  taxa_maquininha_pct         numeric(5,2)  not null default 5.00,
  prolabore_mensal            numeric(10,2) default 0,
  qtd_atendimentos_mes        integer not null default 100,
  margem_lucro_desejada_pct   numeric(5,2) not null default 20.00,
  criado_em                   timestamptz default now(),
  atualizado_em               timestamptz default now()
);

-- ============================================================================
-- 4. TABELAS OPERACIONAIS
-- ============================================================================
create table if not exists profissionais (
  id            uuid primary key default uuid_generate_v4(),
  salao_id      uuid not null references saloes(id) on delete cascade,
  nome          text not null,
  cargo         cargo_enum not null default 'FUNCIONARIO',
  salario_fixo  numeric(10,2) not null default 0,
  ativo         boolean not null default true,
  criado_em     timestamptz default now(),
  atualizado_em timestamptz default now(),
  constraint chk_prof_nome check (length(trim(nome)) > 0)
);

create table if not exists procedimentos (
  id                     uuid primary key default uuid_generate_v4(),
  salao_id               uuid not null references saloes(id) on delete cascade,
  nome                   text not null,
  categoria              categoria_enum not null default 'SERVICO_CABELO',
  requer_comprimento     boolean not null default true,
  preco_p                numeric(10,2),
  preco_m                numeric(10,2),
  preco_g                numeric(10,2),
  ganho_liquido_desejado numeric(10,2) default 0,
  custo_variavel         numeric(10,2) not null default 0,
  custo_variavel_m       numeric(10,2) default 0,
  custo_variavel_g       numeric(10,2) default 0,
  lucro_desejado_p       numeric(10,2) default 0,
  lucro_desejado_m       numeric(10,2) default 0,
  lucro_desejado_g       numeric(10,2) default 0,
  ativo                  boolean not null default true,
  criado_em              timestamptz default now(),
  atualizado_em          timestamptz default now(),
  unique(salao_id, nome)
);

create table if not exists atendimentos (
  id                 uuid primary key default uuid_generate_v4(),
  salao_id           uuid not null references saloes(id) on delete cascade,
  data               date not null,
  horario            time not null,
  profissional_id    uuid references profissionais(id) on delete set null,
  procedimento_id    uuid references procedimentos(id) on delete set null,
  comprimento        comprimento_enum,
  cliente            text not null,
  valor_cobrado      numeric(10,2) not null default 0,
  valor_pago         numeric(10,2) not null default 0,
  valor_pendente     numeric(10,2) generated always as (valor_cobrado - valor_pago) stored,
  valor_maquininha   numeric(10,2),
  valor_profissional numeric(10,2),
  custo_fixo         numeric(10,2),
  custo_variavel     numeric(10,2),
  lucro_liquido      numeric(10,2),
  lucro_possivel     numeric(10,2),
  status             status_enum not null default 'AGENDADO',
  obs                text,
  criado_em          timestamptz default now(),
  atualizado_em      timestamptz default now(),
  constraint chk_valores_positivos check (valor_cobrado >= 0 and valor_pago >= 0)
);
create index if not exists idx_atend_salao_data on atendimentos(salao_id, data) where status <> 'CANCELADO';
create index if not exists idx_atend_salao_proc on atendimentos(salao_id, procedimento_id);

create table if not exists homecare (
  id             uuid primary key default uuid_generate_v4(),
  salao_id       uuid not null references saloes(id) on delete cascade,
  data           date not null,
  cliente        text not null,
  produto        text not null,
  custo_produto  numeric(10,2) not null default 0,
  valor_venda    numeric(10,2) not null default 0,
  valor_pago     numeric(10,2) not null default 0,
  valor_pendente numeric(10,2) generated always as (valor_venda - valor_pago) stored,
  lucro          numeric(10,2) generated always as (valor_venda - custo_produto) stored,
  obs            text,
  criado_em      timestamptz default now(),
  atualizado_em  timestamptz default now()
);

create table if not exists procedimentos_paralelos (
  id                 uuid primary key default uuid_generate_v4(),
  salao_id           uuid not null references saloes(id) on delete cascade,
  data               date not null,
  profissional_id    uuid references profissionais(id) on delete set null,
  descricao          text not null,
  cliente            text not null,
  valor              numeric(10,2) not null default 0,
  valor_pago         numeric(10,2) not null default 0,
  valor_pendente     numeric(10,2) generated always as (valor - valor_pago) stored,
  valor_profissional numeric(10,2) not null default 0,
  criado_em          timestamptz default now(),
  atualizado_em      timestamptz default now()
);

create table if not exists despesas (
  id             uuid primary key default uuid_generate_v4(),
  salao_id       uuid not null references saloes(id) on delete cascade,
  data           date not null,
  descricao      text not null,
  tipo           tipo_despesa_enum not null default 'OUTRO',
  valor          numeric(10,2) not null default 0,
  valor_pago     numeric(10,2) not null default 0,
  valor_pendente numeric(10,2) generated always as (valor - valor_pago) stored,
  criado_em      timestamptz default now(),
  atualizado_em  timestamptz default now()
);

create table if not exists clientes (
  id        uuid primary key default uuid_generate_v4(),
  salao_id  uuid not null references saloes(id) on delete cascade,
  nome      text not null,
  telefone  text,
  criado_em timestamptz default now(),
  constraint chk_cli_nome check (length(trim(nome)) > 0)
);
create index if not exists idx_clientes_salao on clientes(salao_id);

create table if not exists gastos_pessoais (
  id            uuid primary key default uuid_generate_v4(),
  salao_id      uuid not null references saloes(id) on delete cascade,
  descricao     text not null,
  valor         numeric(10,2) not null check (valor >= 0),
  criado_em     timestamptz default now(),
  atualizado_em timestamptz default now()
);

create table if not exists logins_gerados (
  id               uuid primary key default uuid_generate_v4(),
  vendedor_id      uuid not null references auth.users(id) on delete cascade,
  salao_id         uuid not null references saloes(id) on delete cascade,
  username         text not null,
  senha_temporaria text not null,
  auth_user_id     uuid references auth.users(id) on delete set null,
  gerado_em        timestamptz default now(),
  alterado_em      timestamptz,
  ativo            boolean default true,
  expira_em        timestamptz default (now() + interval '48 hours'),
  unique(salao_id, username)
);

-- ============================================================================
-- 5. CATÁLOGO, COMPOSIÇÃO E CUSTOS FIXOS
-- ============================================================================
create table if not exists produtos_catalogo (
  id             uuid primary key default uuid_generate_v4(),
  salao_id       uuid not null references saloes(id) on delete cascade,
  nome           text not null,
  preco_compra   numeric(10,2) not null default 0,
  qtd_aplicacoes integer not null default 1,
  custo_por_uso  numeric(10,4) generated always as (
    case when qtd_aplicacoes > 0 then preco_compra / qtd_aplicacoes else 0 end
  ) stored,
  ativo          boolean not null default true,
  criado_em      timestamptz default now(),
  atualizado_em  timestamptz default now()
);
create index if not exists idx_produtos_salao on produtos_catalogo(salao_id);

create table if not exists procedimento_produtos (
  id              uuid primary key default uuid_generate_v4(),
  salao_id        uuid not null references saloes(id) on delete cascade,
  procedimento_id uuid not null references procedimentos(id) on delete cascade,
  produto_id      uuid not null references produtos_catalogo(id) on delete cascade,
  qtd_por_uso     numeric(6,2) not null default 1,
  criado_em       timestamptz default now(),
  unique(procedimento_id, produto_id)
);

create table if not exists custos_fixos_itens (
  id           uuid primary key default uuid_generate_v4(),
  salao_id     uuid not null references saloes(id) on delete cascade,
  descricao    text not null,
  tipo         text default 'OUTRO',
  valor        numeric(10,2) not null default 0,
  valor_mensal numeric(10,2) not null default 0,
  ativo        boolean not null default true,
  criado_em    timestamptz default now(),
  atualizado_em timestamptz default now()
);

-- ============================================================================
-- 6. FECHAMENTOS MENSAIS
-- ============================================================================
create table if not exists fechamentos (
  id                    uuid primary key default uuid_generate_v4(),
  salao_id              uuid not null references saloes(id) on delete cascade,
  mes                   date not null,
  faturamento_bruto     numeric(12,2) not null default 0,
  lucro_liquido         numeric(12,2) not null default 0,
  lucro_possivel        numeric(12,2) not null default 0,
  total_atendimentos    integer not null default 0,
  total_pendente        numeric(12,2) not null default 0,
  total_despesas        numeric(12,2) not null default 0,
  total_gastos_pessoais numeric(12,2) not null default 0,
  lucro_homecare        numeric(12,2) not null default 0,
  resultado_final       numeric(12,2) not null default 0,
  obs                   text,
  fechado_em            timestamptz default now(),
  unique(salao_id, mes)
);

-- ============================================================================
-- 7. V8 NOVO: SISTEMA DE ASSINATURAS / MENSALIDADE
-- ============================================================================
create table if not exists planos (
  id              uuid primary key default uuid_generate_v4(),
  nome            text not null,
  descricao       text,
  valor_mensal    numeric(10,2) not null default 0,
  dias_trial      integer not null default 7,
  max_profissionais integer default null,
  max_atendimentos_mes integer default null,
  ativo           boolean not null default true,
  criado_em       timestamptz default now()
);

create table if not exists assinaturas (
  id              uuid primary key default uuid_generate_v4(),
  salao_id        uuid not null references saloes(id) on delete cascade,
  plano_id        uuid not null references planos(id),
  status          status_assinatura_enum not null default 'TRIAL',
  inicio          timestamptz not null default now(),
  trial_fim       timestamptz,
  proximo_vencimento date,
  cancelado_em    timestamptz,
  obs             text,
  criado_em       timestamptz default now(),
  atualizado_em   timestamptz default now(),
  unique(salao_id)
);

create table if not exists pagamentos_assinatura (
  id              uuid primary key default uuid_generate_v4(),
  assinatura_id   uuid not null references assinaturas(id) on delete cascade,
  salao_id        uuid not null references saloes(id) on delete cascade,
  valor           numeric(10,2) not null,
  referencia_mes  date not null,
  pago            boolean not null default false,
  pago_em         timestamptz,
  metodo          text,
  gateway_id      text,
  criado_em       timestamptz default now()
);
create index if not exists idx_pgto_assinatura on pagamentos_assinatura(assinatura_id);
create index if not exists idx_pgto_salao on pagamentos_assinatura(salao_id);
-- ============================================================================
--  SCHEMA V8 — PARTE 2: FUNÇÕES, TRIGGERS E VIEWS
--  ⚠️ Os aliases das VIEWS devem coincidir com Dashboard.jsx
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
  select salao_id, date_trunc('month', data)::date as mes,
    sum(valor_cobrado) filter (where status <> 'CANCELADO') as faturamento_bruto,
    sum(valor_pago) filter (where status <> 'CANCELADO') as receita_recebida,
    sum(valor_cobrado - valor_pago) filter (where status = 'EXECUTADO') as total_pendente,
    sum(valor_maquininha) filter (where status <> 'CANCELADO') as total_maquininha,
    sum(valor_profissional) filter (where status <> 'CANCELADO') as total_profissionais,
    sum(custo_fixo) filter (where status <> 'CANCELADO') as total_custo_fixo,
    sum(custo_variavel) filter (where status <> 'CANCELADO') as total_custo_variavel,
    sum(lucro_liquido) filter (where status <> 'CANCELADO') as lucro_real,
    sum(lucro_possivel) filter (where status <> 'CANCELADO') as lucro_possivel,
    count(*) filter (where status <> 'CANCELADO') as total_atendimentos,
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
-- ============================================================================
--  SCHEMA V8 — PARTE 3: SEGURANÇA (RLS + POLICIES)
-- ============================================================================

-- Ativar RLS em todas as tabelas
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
alter table clientes                enable row level security;
alter table fechamentos             enable row level security;
alter table planos                  enable row level security;
alter table assinaturas             enable row level security;
alter table pagamentos_assinatura   enable row level security;

-- ════════════════════════════════════════════════════════
-- POLICIES (DROP IF EXISTS + CREATE para ser idempotente)
-- ════════════════════════════════════════════════════════

-- Salões
drop policy if exists "Salao: acesso por perfil" on saloes;
create policy "Salao: acesso por perfil" on saloes for select to authenticated
  using (id in (select salao_id from perfis_acesso where auth_user_id = auth.uid()));

drop policy if exists "Salao: membro atualiza" on saloes;
create policy "Salao: membro atualiza" on saloes for update to authenticated
  using (id in (select salao_id from perfis_acesso where auth_user_id = auth.uid() and cargo = 'PROPRIETARIO'))
  with check (id in (select salao_id from perfis_acesso where auth_user_id = auth.uid() and cargo = 'PROPRIETARIO'));

drop policy if exists "Salao: vendedor ve seus clientes" on saloes;
create policy "Salao: vendedor ve seus clientes" on saloes for select to authenticated
  using (vendedor_id = auth.uid());

drop policy if exists "Salao: vendedor cria" on saloes;
create policy "Salao: vendedor cria" on saloes for insert to authenticated
  with check (vendedor_id = auth.uid());

-- Perfis
drop policy if exists "Perfil: leitura propria" on perfis_acesso;
create policy "Perfil: leitura propria" on perfis_acesso for select to authenticated
  using (auth_user_id = auth.uid());

-- Macro para tabelas isoladas por salao_id
do $$
declare
  tbl text;
  pol text;
begin
  for tbl, pol in select * from (values
    ('configuracoes', 'Isolar configuracoes'),
    ('profissionais', 'Isolar profs'),
    ('procedimentos', 'Isolar procs'),
    ('atendimentos', 'Isolar atendimentos'),
    ('homecare', 'Isolar homecare'),
    ('procedimentos_paralelos', 'Isolar paralelos'),
    ('despesas', 'Isolar despesas'),
    ('gastos_pessoais', 'Isolar gastos pessoais'),
    ('produtos_catalogo', 'Isolar produtos'),
    ('procedimento_produtos', 'Isolar proc_prod'),
    ('custos_fixos_itens', 'Isolar custos fixos'),
    ('fechamentos', 'Isolar fechamentos'),
    ('assinaturas', 'Isolar assinaturas'),
    ('pagamentos_assinatura', 'Isolar pagamentos')
  ) as t(a,b) loop
    execute format('drop policy if exists %I on %I', pol, tbl);
    execute format(
      'create policy %I on %I for all to authenticated using (salao_id in (select salao_id from perfis_acesso where auth_user_id = auth.uid()))',
      pol, tbl
    );
  end loop;
end $$;

-- Clientes (com WITH CHECK)
drop policy if exists "Isolar clientes por salao" on clientes;
create policy "Isolar clientes por salao" on clientes for all to authenticated
  using (salao_id in (select salao_id from perfis_acesso where auth_user_id = auth.uid()))
  with check (salao_id in (select salao_id from perfis_acesso where auth_user_id = auth.uid()));

-- Logins gerados (vendedor)
drop policy if exists "Vendedor ve seus logins" on logins_gerados;
create policy "Vendedor ve seus logins" on logins_gerados for all to authenticated
  using (vendedor_id = auth.uid());

-- Planos (leitura pública para todos autenticados)
drop policy if exists "Planos: leitura publica" on planos;
create policy "Planos: leitura publica" on planos for select to authenticated using (true);

-- ════════════════════════════════════════════════════════
-- PLANO PADRÃO (inserir apenas se não existir)
-- ════════════════════════════════════════════════════════
insert into planos (nome, descricao, valor_mensal, dias_trial, max_profissionais, max_atendimentos_mes)
select 'Básico', 'Acesso completo ao sistema de gestão', 89.90, 7, 5, 500
where not exists (select 1 from planos where nome = 'Básico');

insert into planos (nome, descricao, valor_mensal, dias_trial, max_profissionais, max_atendimentos_mes)
select 'Profissional', 'Gestão completa + relatórios avançados', 149.90, 7, 15, null
where not exists (select 1 from planos where nome = 'Profissional');

insert into planos (nome, descricao, valor_mensal, dias_trial, max_profissionais, max_atendimentos_mes)
select 'Premium', 'Sem limites + suporte prioritário', 249.90, 14, null, null
where not exists (select 1 from planos where nome = 'Premium');

-- ════════════════════════════════════════════════════════
-- RECARREGAR SCHEMA DO SUPABASE
-- ════════════════════════════════════════════════════════
notify pgrst, 'reload schema';
