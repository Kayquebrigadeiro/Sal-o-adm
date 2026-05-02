-- ============================================================================
--  SCHEMA V8 — PARTE 1: DEFINIÇÃO DE TABELAS
--  Finalidade: Criar as tabelas, enums e índices necessários para o sistema.
--  Este script é a fundação da estrutura de dados do Salão Secreto.
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
  constraint chk_prof_nome check (length(trim(nome)) > 0),
  unique(salao_id, nome)
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
