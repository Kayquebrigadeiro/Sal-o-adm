-- ============================================================================
-- MIGRATION: Horário de Funcionamento do Salão
-- Adiciona hora_inicio e hora_fim na tabela configuracoes
-- ============================================================================

alter table configuracoes
  add column if not exists hora_inicio time not null default '08:00',
  add column if not exists hora_fim    time not null default '19:00',
  add column if not exists intervalo_minutos integer not null default 30;

comment on column configuracoes.hora_inicio is 'Horário de abertura do salão (ex: 08:00)';
comment on column configuracoes.hora_fim    is 'Horário de fechamento do salão (ex: 22:00)';
comment on column configuracoes.intervalo_minutos is 'Intervalo entre slots da agenda em minutos (30 ou 60)';

notify pgrst, 'reload schema';
