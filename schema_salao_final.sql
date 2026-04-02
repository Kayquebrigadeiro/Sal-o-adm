-- ============================================================
--  SCHEMA FINAL — SISTEMA DE SALÃO
--  Colar no SQL Editor do Supabase e executar tudo de uma vez
--  Versão: 2.0 — definitiva
-- ============================================================


-- ────────────────────────────────────────────────────────────
--  EXTENSÕES
-- ────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";


-- ────────────────────────────────────────────────────────────
--  ENUMS
-- ────────────────────────────────────────────────────────────
create type cargo_enum        as enum ('PROPRIETARIO', 'FUNCIONARIO');
create type comprimento_enum  as enum ('P', 'M', 'G');
create type status_enum       as enum ('AGENDADO', 'EXECUTADO', 'CANCELADO');
create type categoria_enum    as enum ('CABELO', 'UNHAS', 'SOBRANCELHAS', 'CILIOS', 'OUTRO');
create type tipo_despesa_enum as enum (
  'ALUGUEL', 'ENERGIA', 'AGUA', 'INTERNET', 'MATERIAL',
  'EQUIPAMENTO', 'FORNECEDOR', 'FUNCIONARIO', 'OUTRO'
);


-- ════════════════════════════════════════════════════════════
--  1. CONFIGURAÇÕES DO SALÃO
--  Tabela com uma única linha. Guarda os parâmetros globais
--  usados em todos os cálculos automáticos.
-- ════════════════════════════════════════════════════════════
create table configuracoes (
  id                        int primary key default 1,  -- sempre 1 registro
  nome_salao                text    not null default 'Meu Salão',
  custo_fixo_por_atendimento numeric(10,2) not null default 29.00,
  -- R$29 fixo por atendimento (rateio de aluguel, energia, etc.)
  taxa_maquininha_pct       numeric(5,2)  not null default 5.00,
  -- 5% descontado do valor cobrado (aparece como /95% nas fórmulas)
  prolabore_mensal          numeric(10,2) default 0,
  -- quanto a proprietária precisa retirar por mês
  constraint configuracoes_unica check (id = 1)
);

-- Inserir a única linha de configuração
insert into configuracoes (custo_fixo_por_atendimento, taxa_maquininha_pct)
values (29.00, 5.00);


-- ════════════════════════════════════════════════════════════
--  2. PROFISSIONAIS
-- ════════════════════════════════════════════════════════════
create table profissionais (
  id            uuid primary key default uuid_generate_v4(),
  nome          text not null,
  cargo         cargo_enum not null default 'FUNCIONARIO',
  salario_fixo  numeric(10,2) not null default 0,
  -- salário fixo mensal, independente de atendimentos
  ativo         boolean not null default true,
  criado_em     timestamptz default now()
);

insert into profissionais (nome, cargo, salario_fixo) values
  ('Teta',    'PROPRIETARIO', 0),     -- proprietária, recebe via pró-labore
  ('Yara',    'FUNCIONARIO',  900),
  ('Geovana', 'FUNCIONARIO',  560),
  ('Quinha',  'FUNCIONARIO',  230),
  ('Mirelly', 'FUNCIONARIO',  800);


-- ════════════════════════════════════════════════════════════
--  3. PROCEDIMENTOS — tabela de serviços e preços
--
--  custo_variavel  = custo do produto usado naquele serviço
--  preco_p/m/g     = preço por comprimento de cabelo
--  requer_comprimento = false para unhas, cílios, sobrancelhas
--  porcentagem_profissional = % do valor que vai para quem executou
-- ════════════════════════════════════════════════════════════
create table procedimentos (
  id                       uuid primary key default uuid_generate_v4(),
  nome                     text not null unique,
  categoria                categoria_enum not null default 'CABELO',
  requer_comprimento       boolean not null default true,
  preco_p                  numeric(10,2),   -- P ou preço único
  preco_m                  numeric(10,2),
  preco_g                  numeric(10,2),
  custo_variavel           numeric(10,2) not null default 0,
  porcentagem_profissional numeric(5,2)  not null default 40,
  ativo                    boolean not null default true,
  criado_em                timestamptz default now()
);

insert into procedimentos
  (nome, categoria, requer_comprimento, preco_p, preco_m, preco_g, custo_variavel, porcentagem_profissional)
values
  ('Corte',        'CABELO',       false, 50,   null,  null,  0,   40),
  ('Coloração',    'CABELO',       true,  65,   80,    95,    28,  40),
  ('Luzes',        'CABELO',       true,  120,  180,   230,   45,  40),
  ('Botox',        'CABELO',       true,  80,   100,   130,   30,  40),
  ('Hidratação',   'CABELO',       true,  45,   60,    80,    15,  40),
  ('Fusion',       'CABELO',       true,  50,   65,    85,    20,  40),
  ('Kit Lavatório','CABELO',       true,  35,   45,    60,    10,  40),
  ('Escova',       'CABELO',       true,  40,   55,    70,    5,   40),
  ('Progressiva',  'CABELO',       true,  150,  180,   220,   60,  40),
  ('Unhas',        'UNHAS',        false, 20,   null,  null,  5,   40),
  ('Cílios',       'CILIOS',       false, 70,   null,  null,  15,  40),
  ('Sobrancelha',  'SOBRANCELHAS', false, 15,   null,  null,  2,   40),
  ('Busso',        'SOBRANCELHAS', false, 25,   null,  null,  3,   40);


-- ════════════════════════════════════════════════════════════
--  4. ATENDIMENTOS — coração do sistema (= aba CONTROLE)
--
--  Todos os campos de valor são calculados automaticamente
--  pelo trigger abaixo ao inserir ou editar.
--
--  CÁLCULOS (por atendimento):
--    valor_maquininha    = valor_cobrado × taxa_maquininha%
--    valor_profissional  = valor_cobrado × porcentagem_profissional%
--    custo_variavel      = procedimento.custo_variavel
--    custo_fixo          = configuracoes.custo_fixo_por_atendimento (R$29)
--    lucro_liquido       = cobrado - maquininha - profissional - custo_fixo - custo_variavel
--    lucro_possivel      = cobrado - profissional - custo_fixo - custo_variavel
--                          (sem descontar maquininha — mostra o potencial)
-- ════════════════════════════════════════════════════════════
create table atendimentos (
  id                  uuid primary key default uuid_generate_v4(),
  data                date not null,
  horario             time not null,
  profissional_id     uuid not null references profissionais(id),
  procedimento_id     uuid not null references procedimentos(id),
  comprimento         comprimento_enum,
  cliente             text not null,

  -- Valores calculados automaticamente pelo trigger
  valor_cobrado       numeric(10,2),       -- o que o cliente paga
  valor_maquininha    numeric(10,2),       -- desconto da maquininha
  valor_profissional  numeric(10,2),       -- parte da profissional
  custo_fixo          numeric(10,2),       -- R$29 fixo
  custo_variavel      numeric(10,2),       -- custo do produto
  lucro_liquido       numeric(10,2),       -- lucro real do salão
  lucro_possivel      numeric(10,2),       -- lucro sem descontar maquininha

  pago                boolean not null default false,
  executado           boolean not null default false,
  status              status_enum not null default 'AGENDADO',
  obs                 text,
  criado_em           timestamptz default now(),
  atualizado_em       timestamptz default now()
);

create index idx_atendimentos_data         on atendimentos(data);
create index idx_atendimentos_profissional on atendimentos(profissional_id, data);
create index idx_atendimentos_mes          on atendimentos(date_trunc('month', data));
create index idx_atendimentos_status       on atendimentos(status);


-- ════════════════════════════════════════════════════════════
--  5. HOME CAR — venda de kits e produtos
-- ════════════════════════════════════════════════════════════
create table homecare (
  id              uuid primary key default uuid_generate_v4(),
  data            date not null,
  cliente         text not null,
  produto         text not null,
  custo_produto   numeric(10,2) not null default 0,
  valor_venda     numeric(10,2) not null,
  valor_pago      numeric(10,2) not null default 0,
  valor_pendente  numeric(10,2) generated always as (valor_venda - valor_pago) stored,
  lucro           numeric(10,2) generated always as (valor_venda - custo_produto) stored,
  obs             text,
  criado_em       timestamptz default now()
);

create index idx_homecare_mes on homecare(date_trunc('month', data));


-- ════════════════════════════════════════════════════════════
--  6. PROCEDIMENTOS PARALELOS — serviços extras
--     (cílios, busso, sobrancelhas fora da agenda principal)
-- ════════════════════════════════════════════════════════════
create table procedimentos_paralelos (
  id              uuid primary key default uuid_generate_v4(),
  data            date not null,
  profissional_id uuid references profissionais(id),
  descricao       text not null,
  cliente         text not null,
  valor           numeric(10,2) not null,
  valor_pago      numeric(10,2) not null default 0,
  valor_pendente  numeric(10,2) generated always as (valor - valor_pago) stored,
  criado_em       timestamptz default now()
);

create index idx_paralelos_mes on procedimentos_paralelos(date_trunc('month', data));


-- ════════════════════════════════════════════════════════════
--  7. DESPESAS — gastos do salão no mês
-- ════════════════════════════════════════════════════════════
create table despesas (
  id          uuid primary key default uuid_generate_v4(),
  data        date not null,
  descricao   text not null,
  tipo        tipo_despesa_enum not null default 'OUTRO',
  valor       numeric(10,2) not null,
  pago        boolean not null default false,
  criado_em   timestamptz default now()
);

create index idx_despesas_mes on despesas(date_trunc('month', data));


-- ════════════════════════════════════════════════════════════
--  8. TRIGGER — calcular valores automaticamente
--
--  Dispara em EVERY INSERT ou UPDATE em atendimentos.
--  Busca as configurações globais e o procedimento,
--  e preenche todos os campos de valor automaticamente.
-- ════════════════════════════════════════════════════════════
create or replace function fn_calcular_atendimento()
returns trigger language plpgsql as $$
declare
  v_proc    procedimentos%rowtype;
  v_cfg     configuracoes%rowtype;
  v_preco   numeric(10,2);
begin
  select * into v_proc from procedimentos where id = new.procedimento_id;
  select * into v_cfg  from configuracoes  where id = 1;

  -- 1. Preço base conforme comprimento
  if not v_proc.requer_comprimento or new.comprimento = 'P' then
    v_preco := v_proc.preco_p;
  elsif new.comprimento = 'M' then
    v_preco := coalesce(v_proc.preco_m, v_proc.preco_p);
  elsif new.comprimento = 'G' then
    v_preco := coalesce(v_proc.preco_g, v_proc.preco_p);
  else
    v_preco := v_proc.preco_p;
  end if;

  -- 2. Se não informou valor, usa o da tabela de preços
  if new.valor_cobrado is null then
    new.valor_cobrado := v_preco;
  end if;

  -- 3. Calcular cada componente
  new.valor_maquininha   := round(new.valor_cobrado * v_cfg.taxa_maquininha_pct   / 100, 2);
  new.valor_profissional := round(new.valor_cobrado * v_proc.porcentagem_profissional / 100, 2);
  new.custo_fixo         := v_cfg.custo_fixo_por_atendimento;
  new.custo_variavel     := v_proc.custo_variavel;

  -- 4. Lucro líquido (descontando tudo, inclusive maquininha)
  new.lucro_liquido := new.valor_cobrado
    - new.valor_maquininha
    - new.valor_profissional
    - new.custo_fixo
    - new.custo_variavel;

  -- 5. Lucro possível (sem desconto de maquininha — mostra o potencial)
  new.lucro_possivel := new.valor_cobrado
    - new.valor_profissional
    - new.custo_fixo
    - new.custo_variavel;

  -- 6. Se cancelado, zera tudo relacionado a valor
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


-- ════════════════════════════════════════════════════════════
--  VIEWS — leitura rápida para o frontend
-- ════════════════════════════════════════════════════════════

-- ── AGENDA DO DIA
--    Uso: select * from agenda_do_dia where data = current_date;
create or replace view agenda_do_dia as
select
  a.id,
  a.data,
  a.horario,
  a.cliente,
  a.comprimento,
  a.valor_cobrado,
  a.valor_profissional,
  a.lucro_liquido,
  a.lucro_possivel,
  a.pago,
  a.executado,
  a.status,
  a.obs,
  p.id   as profissional_id,
  p.nome as profissional_nome,
  p.cargo,
  pr.id                    as procedimento_id,
  pr.nome                  as procedimento_nome,
  pr.categoria,
  pr.requer_comprimento
from atendimentos a
join profissionais  p  on p.id  = a.profissional_id
join procedimentos  pr on pr.id = a.procedimento_id
order by a.data, a.horario, p.nome;


-- ── FECHAMENTO MENSAL
--    Uso: select * from fechamento_mensal where mes = '2026-04-01';
create or replace view fechamento_mensal as
with base as (
  select date_trunc('month', data)::date as mes
  from atendimentos
  union
  select date_trunc('month', data)::date from homecare
  union
  select date_trunc('month', data)::date from procedimentos_paralelos
),
atend as (
  select
    date_trunc('month', data)::date                                             as mes,
    sum(valor_cobrado)    filter (where status <> 'CANCELADO')                  as receita_bruta,
    sum(valor_cobrado)    filter (where pago = true)                            as receita_recebida,
    sum(valor_cobrado)    filter (where executado = true and pago = false)       as pendencias,
    sum(valor_maquininha) filter (where status <> 'CANCELADO')                  as total_maquininha,
    sum(valor_profissional) filter (where status <> 'CANCELADO')                as total_profissionais,
    sum(custo_fixo)       filter (where status <> 'CANCELADO')                  as total_custo_fixo,
    sum(custo_variavel)   filter (where status <> 'CANCELADO')                  as total_custo_variavel,
    sum(lucro_liquido)    filter (where status <> 'CANCELADO')                  as lucro_liquido,
    sum(lucro_possivel)   filter (where status <> 'CANCELADO')                  as lucro_possivel,
    count(*)              filter (where status <> 'CANCELADO')                  as total_atendimentos,
    count(*)              filter (where status = 'CANCELADO')                   as total_cancelamentos
  from atendimentos
  group by 1
),
hc as (
  select
    date_trunc('month', data)::date as mes,
    sum(valor_venda) as receita_homecare,
    sum(valor_pago)  as recebido_homecare,
    sum(valor_pendente) as pendente_homecare,
    sum(lucro)       as lucro_homecare
  from homecare
  group by 1
),
pp as (
  select
    date_trunc('month', data)::date as mes,
    sum(valor)         as receita_paralelos,
    sum(valor_pago)    as recebido_paralelos,
    sum(valor_pendente) as pendente_paralelos
  from procedimentos_paralelos
  group by 1
),
desp as (
  select
    date_trunc('month', data)::date as mes,
    sum(valor) as total_despesas
  from despesas
  group by 1
),
sal as (
  select sum(salario_fixo) as total_salarios_fixos
  from profissionais
  where ativo = true and cargo = 'FUNCIONARIO'
)
select
  b.mes,
  coalesce(a.receita_bruta,       0) as receita_bruta,
  coalesce(a.receita_recebida,    0) as receita_recebida,
  coalesce(a.pendencias,          0) as pendencias,
  coalesce(a.total_maquininha,    0) as total_maquininha,
  coalesce(a.total_profissionais, 0) as total_profissionais,
  coalesce(a.total_custo_fixo,    0) as total_custo_fixo,
  coalesce(a.total_custo_variavel,0) as total_custo_variavel,
  coalesce(a.lucro_liquido,       0) as lucro_liquido_atendimentos,
  coalesce(a.lucro_possivel,      0) as lucro_possivel_atendimentos,
  coalesce(a.total_atendimentos,  0) as total_atendimentos,
  coalesce(a.total_cancelamentos, 0) as total_cancelamentos,
  coalesce(h.receita_homecare,    0) as receita_homecare,
  coalesce(h.lucro_homecare,      0) as lucro_homecare,
  coalesce(h.pendente_homecare,   0) as pendente_homecare,
  coalesce(p.receita_paralelos,   0) as receita_paralelos,
  coalesce(p.pendente_paralelos,  0) as pendente_paralelos,
  coalesce(d.total_despesas,      0) as total_despesas,
  coalesce(s.total_salarios_fixos,0) as total_salarios_fixos,

  -- RECEITA TOTAL (todas as fontes)
  coalesce(a.receita_bruta,    0)
  + coalesce(h.receita_homecare, 0)
  + coalesce(p.receita_paralelos,0) as receita_total,

  -- SAÚDE FINANCEIRA DO MÊS (lucro - despesas - salários fixos)
  coalesce(a.lucro_liquido,    0)
  + coalesce(h.lucro_homecare, 0)
  - coalesce(d.total_despesas, 0)
  - coalesce(s.total_salarios_fixos, 0) as saude_financeira

from base b
left join atend a on a.mes = b.mes
left join hc    h on h.mes = b.mes
left join pp    p on p.mes = b.mes
left join desp  d on d.mes = b.mes
cross join sal  s
order by b.mes desc;


-- ── SAÚDE FINANCEIRA — snapshot atual (mês corrente)
--    Uso: select * from saude_financeira_atual;
create or replace view saude_financeira_atual as
select *
from fechamento_mensal
where mes = date_trunc('month', current_date)::date;


-- ── RENDIMENTO POR PROFISSIONAL (mês)
--    Uso: select * from rendimento_por_profissional where mes = '2026-04-01';
create or replace view rendimento_por_profissional as
select
  date_trunc('month', a.data)::date  as mes,
  p.id                               as profissional_id,
  p.nome                             as profissional,
  p.cargo,
  p.salario_fixo,
  count(*) filter (where a.status <> 'CANCELADO')         as total_atendimentos,
  sum(a.valor_cobrado) filter (where a.status <> 'CANCELADO')  as receita_gerada,
  sum(a.valor_profissional) filter (where a.status <> 'CANCELADO') as rendimento_variavel,
  sum(a.valor_profissional) filter (where a.status <> 'CANCELADO')
    + p.salario_fixo                                       as rendimento_total
from atendimentos a
join profissionais p on p.id = a.profissional_id
group by 1, p.id, p.nome, p.cargo, p.salario_fixo
order by 1 desc, receita_gerada desc;


-- ── RANKING DE PROCEDIMENTOS (mês)
--    Uso: select * from ranking_procedimentos where mes = '2026-04-01';
create or replace view ranking_procedimentos as
select
  date_trunc('month', a.data)::date as mes,
  pr.nome                           as procedimento,
  pr.categoria,
  count(*) filter (where a.status <> 'CANCELADO')              as quantidade,
  sum(a.valor_cobrado) filter (where a.status <> 'CANCELADO')  as receita_total,
  sum(a.lucro_liquido) filter (where a.status <> 'CANCELADO')  as lucro_total,
  round(avg(a.valor_cobrado) filter (where a.status <> 'CANCELADO'), 2) as ticket_medio
from atendimentos a
join procedimentos pr on pr.id = a.procedimento_id
group by 1, pr.id, pr.nome, pr.categoria
order by 1 desc, receita_total desc;


-- ════════════════════════════════════════════════════════════
--  ROW LEVEL SECURITY
--  Só usuários autenticados acessam qualquer dado.
-- ════════════════════════════════════════════════════════════
alter table configuracoes            enable row level security;
alter table profissionais            enable row level security;
alter table procedimentos            enable row level security;
alter table atendimentos             enable row level security;
alter table homecare                 enable row level security;
alter table procedimentos_paralelos  enable row level security;
alter table despesas                 enable row level security;

create policy "auth_only" on configuracoes           for all to authenticated using (true) with check (true);
create policy "auth_only" on profissionais           for all to authenticated using (true) with check (true);
create policy "auth_only" on procedimentos           for all to authenticated using (true) with check (true);
create policy "auth_only" on atendimentos            for all to authenticated using (true) with check (true);
create policy "auth_only" on homecare                for all to authenticated using (true) with check (true);
create policy "auth_only" on procedimentos_paralelos for all to authenticated using (true) with check (true);
create policy "auth_only" on despesas                for all to authenticated using (true) with check (true);


-- ════════════════════════════════════════════════════════════
--  RESUMO DO QUE ESSE SCHEMA COBRE
-- ════════════════════════════════════════════════════════════
--
--  TABELAS (7):
--    configuracoes           → parâmetros globais: custo fixo R$29, maquininha 5%
--    profissionais           → equipe + salário fixo mensal
--    procedimentos           → serviços, preços P/M/G e custo variável
--    atendimentos            → cada atendimento com todos os valores calculados
--    homecare                → venda de kits
--    procedimentos_paralelos → serviços extras (cílios, busso, etc.)
--    despesas                → gastos do mês
--
--  TRIGGER (1):
--    trg_calcular_atendimento → calcula automaticamente ao salvar qualquer atendimento:
--      valor_maquininha, valor_profissional, custo_fixo, custo_variavel,
--      lucro_liquido, lucro_possivel
--
--  VIEWS (5):
--    agenda_do_dia            → grade da agenda com todos os dados
--    fechamento_mensal        → relatório completo por mês (dashboard)
--    saude_financeira_atual   → snapshot do mês corrente
--    rendimento_por_profissional → quanto cada uma gerou
--    ranking_procedimentos    → quais serviços rendem mais
--
-- ════════════════════════════════════════════════════════════
