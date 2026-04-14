-- ========================================================================================
--  SCHEMA SAAS COMPLETO - V4 (A VERSÃO SUPREMA)
-- ========================================================================================

-- ========================================================================================
--  1. LIMPEZA INICIAL (TEARDOWN)
-- ========================================================================================
drop view if exists fechamento_mensal cascade;
drop view if exists ranking_procedimentos cascade;
drop view if exists rendimento_por_profissional cascade;

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
--  3. NÚCLEO DO SAAS (TENANTS & PERFIS)
-- ========================================================================================
create table saloes (
  id          uuid primary key default uuid_generate_v4(),
  nome        text not null default 'Meu Salão',
  telefone    text,
  vendedor_id uuid references auth.users(id) on delete set null,
  configurado boolean not null default false,
  ativo       boolean not null default true,
  deletado_em timestamptz default null,
  criado_em   timestamptz default now(),
  atualizado_em timestamptz default now()
);
create index idx_saloes_vendedor_id on saloes(vendedor_id);

create table perfis_acesso (
  auth_user_id  uuid primary key references auth.users(id) on delete cascade,
  salao_id      uuid references saloes(id) on delete cascade,
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
  criado_em                   timestamptz default now(),
  atualizado_em               timestamptz default now()
);

-- ========================================================================================
--  4. TABELAS DE DOMÍNIO
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
-- Índice Multi-Tenant Verdadeiro
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
  senha_hash        text not null,
  auth_user_id      uuid references auth.users(id) on delete set null,
  gerado_em         timestamptz default now(),
  alterado_em       timestamptz,
  ativo             boolean default true,
  unique(salao_id, username)
);

-- ========================================================================================
--  5. TRIGGERS E CÁLCULOS
-- ========================================================================================
create or replace function public.fn_atualizar_timestamp() returns trigger as $$
begin
  new.atualizado_em = now();
  return new;
end;
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

create or replace function fn_calcular_atendimento()
returns trigger language plpgsql as $$
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
--  6. INTEGRAÇÃO COM SUPABASE AUTH 
-- ========================================================================================
create or replace function public.handle_new_user_salao() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_salao_id uuid; 
  v_cargo cargo_enum; 
  v_vendedor_id uuid;
  v_username text;
begin
  v_salao_id := (new.raw_user_meta_data->>'salao_id')::uuid;
  v_cargo    := coalesce((new.raw_user_meta_data->>'cargo')::cargo_enum, 'PROPRIETARIO'::cargo_enum);
  v_vendedor_id := (new.raw_user_meta_data->>'vendedor_id')::uuid;
  v_username := new.raw_user_meta_data->>'username';

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

    insert into public.configuracoes (salao_id, custo_fixo_por_atendimento, taxa_maquininha_pct)
    values (v_salao_id, 29.00, 5.00);
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

-- ========================================================================================
--  7. VIEWS DE DASHBOARD E RELATÓRIOS
-- ========================================================================================
create or replace view fechamento_mensal with (security_invoker = true) as
select
  a.salao_id,
  date_trunc('month', a.data)::date as mes,
  count(*) filter (where a.status = 'EXECUTADO') as total_atendimentos,
  sum(a.valor_cobrado) filter (where a.status <> 'CANCELADO') as faturamento_bruto,
  sum(a.lucro_liquido) filter (where a.status <> 'CANCELADO') as lucro_real,
  sum(a.lucro_possivel) filter (where a.status <> 'CANCELADO') as lucro_possivel,
  sum(a.valor_pendente) filter (where a.status <> 'CANCELADO') as total_pendente,
  count(*) filter (where a.status = 'CANCELADO') as cancelamentos
from atendimentos a
group by a.salao_id, date_trunc('month', a.data)::date;

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
  a.salao_id,
  date_trunc('month', a.data)::date as mes,
  p.nome as profissional,
  p.cargo,
  count(*) filter (where a.status = 'EXECUTADO') as atendimentos,
  sum(a.valor_profissional) filter (where a.status = 'EXECUTADO') as rendimento_bruto,
  sum(a.valor_cobrado) filter (where a.status = 'EXECUTADO') as faturamento_gerado
from atendimentos a
join profissionais p on p.id = a.profissional_id
group by a.salao_id, date_trunc('month', a.data)::date, p.id, p.nome, p.cargo;

-- ========================================================================================
--  8. SEGURANÇA MÁXIMA (RLS)
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

-- SALÕES: Isolamento e restrição do Vendedor e Update do Proprietário
create policy "Salao: acesso por perfil" 
  on saloes for select to authenticated 
  using (id in (select salao_id from perfis_acesso where auth_user_id = auth.uid()));

create policy "Salao: membro atualiza"
  on saloes for update to authenticated
  using (id in (
    select salao_id from perfis_acesso 
    where auth_user_id = auth.uid() 
    and cargo = 'PROPRIETARIO'
  ))
  with check (id in (
    select salao_id from perfis_acesso 
    where auth_user_id = auth.uid() 
    and cargo = 'PROPRIETARIO'
  ));

create policy "Salao: vendedor ve seus clientes" 
  on saloes for select to authenticated 
  using (vendedor_id = auth.uid());

create policy "Salao: vendedor cria" 
  on saloes for insert to authenticated 
  with check (vendedor_id = auth.uid());

-- PERFIS DE ACESSO: Prevenção de Invasão
create policy "Perfil: leitura propria" 
  on perfis_acesso for select to authenticated 
  using (auth_user_id = auth.uid());

-- RESTANTE (Isolado pelo Tenant)
create policy "Isolar configuracoes" on configuracoes for all to authenticated using (salao_id in (select salao_id from perfis_acesso where auth_user_id = auth.uid()));
create policy "Isolar profs" on profissionais for all to authenticated using (salao_id in (select salao_id from perfis_acesso where auth_user_id = auth.uid()));
create policy "Isolar procs" on procedimentos for all to authenticated using (salao_id in (select salao_id from perfis_acesso where auth_user_id = auth.uid()));
create policy "Isolar atendimentos" on atendimentos for all to authenticated using (salao_id in (select salao_id from perfis_acesso where auth_user_id = auth.uid()));
create policy "Isolar homecare" on homecare for all to authenticated using (salao_id in (select salao_id from perfis_acesso where auth_user_id = auth.uid()));
create policy "Isolar paralelos" on procedimentos_paralelos for all to authenticated using (salao_id in (select salao_id from perfis_acesso where auth_user_id = auth.uid()));
create policy "Isolar despesas" on despesas for all to authenticated using (salao_id in (select salao_id from perfis_acesso where auth_user_id = auth.uid()));
create policy "Isolar gastos pessoais" on gastos_pessoais for all to authenticated using (salao_id in (select salao_id from perfis_acesso where auth_user_id = auth.uid()));
create policy "Vendedor ve seus logins" on logins_gerados for all to authenticated using (vendedor_id = auth.uid());