-- ============================================================================
-- MIGRATION: Sprint 3 — Múltiplos Serviços por Agendamento
-- STATUS: APLICAR NO SUPABASE SQL EDITOR
-- ============================================================================

-- 1. Tabela de junção atendimento_procedimentos
create table if not exists atendimento_procedimentos (
  id                 uuid primary key default uuid_generate_v4(),
  atendimento_id     uuid not null references atendimentos(id) on delete cascade,
  procedimento_id    uuid not null references procedimentos(id) on delete restrict,
  comprimento        comprimento_enum,
  valor_indicado     numeric(10,2) not null default 0,
  valor_cobrado      numeric(10,2) not null default 0,
  valor_pago         numeric(10,2) not null default 0,
  valor_pendente     numeric(10,2) generated always as (valor_cobrado - valor_pago) stored,
  sequencia          integer not null default 1,
  criado_em          timestamptz default now(),
  atualizado_em      timestamptz default now(),
  constraint chk_valores_pos check (valor_indicado >= 0 and valor_cobrado >= 0 and valor_pago >= 0),
  unique(atendimento_id, procedimento_id)
);

create index if not exists idx_atend_proc_atend on atendimento_procedimentos(atendimento_id);
create index if not exists idx_atend_proc_proc  on atendimento_procedimentos(procedimento_id);

-- 2. RLS na nova tabela
alter table atendimento_procedimentos enable row level security;

drop policy if exists "Isolar atendimento_procedimentos" on atendimento_procedimentos;
create policy "Isolar atendimento_procedimentos" on atendimento_procedimentos
  for all to authenticated
  using (
    atendimento_id in (
      select id from atendimentos
      where salao_id in (select salao_id from perfis_acesso where auth_user_id = auth.uid())
    )
  );

-- 3. Trigger para sincronizar totais do atendimento pai
create or replace function atualizar_totais_atendimento()
returns trigger as $$
declare
  v_atendimento_id uuid;
begin
  v_atendimento_id := coalesce(new.atendimento_id, old.atendimento_id);

  update atendimentos
  set
    valor_cobrado = coalesce((select sum(valor_cobrado) from atendimento_procedimentos where atendimento_id = v_atendimento_id), 0),
    valor_pago    = coalesce((select sum(valor_pago)    from atendimento_procedimentos where atendimento_id = v_atendimento_id), 0),
    atualizado_em = now()
  where id = v_atendimento_id;

  return coalesce(new, old);
end;
$$ language plpgsql;

drop trigger if exists trg_atend_proc_totais on atendimento_procedimentos;
create trigger trg_atend_proc_totais
after insert or update or delete on atendimento_procedimentos
for each row execute function atualizar_totais_atendimento();

-- 4. View v_atendimentos_completo (inclui lucro_possivel que a Agenda utiliza)
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
  json_agg(
    json_build_object(
      'id',               ap.id,
      'procedimento_id',  ap.procedimento_id,
      'procedimento_nome', p.nome,
      'categoria',        p.categoria,
      'comprimento',      ap.comprimento,
      'valor_indicado',   ap.valor_indicado,
      'valor_cobrado',    ap.valor_cobrado,
      'valor_pago',       ap.valor_pago,
      'sequencia',        ap.sequencia
    ) order by ap.sequencia
  ) as procedimentos
from atendimentos a
left join atendimento_procedimentos ap on a.id = ap.atendimento_id
left join procedimentos p on ap.procedimento_id = p.id
group by a.id;

-- 5. Migrar dados existentes (atendimentos legados com procedimento_id)
insert into atendimento_procedimentos (
  atendimento_id,
  procedimento_id,
  comprimento,
  valor_indicado,
  valor_cobrado,
  valor_pago,
  sequencia
)
select
  a.id,
  a.procedimento_id,
  a.comprimento,
  a.valor_cobrado,
  a.valor_cobrado,
  a.valor_pago,
  1
from atendimentos a
where a.procedimento_id is not null
  and not exists (
    select 1 from atendimento_procedimentos ap where ap.atendimento_id = a.id
  )
on conflict (atendimento_id, procedimento_id) do nothing;

-- 6. Recarregar schema do PostgREST
notify pgrst, 'reload schema';
