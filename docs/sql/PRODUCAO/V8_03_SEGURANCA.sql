-- ============================================================================
--  SCHEMA V8 — PARTE 3: SEGURANÇA E PRIVACIDADE
--  Finalidade: Configurar a segurança (RLS) para isolar dados entre salões.
--  Este script garante que um usuário só veja dados do seu próprio salão.
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
      'create policy %I on %I for all to authenticated 
       using (salao_id in (select salao_id from perfis_acesso where auth_user_id = auth.uid()))
       with check (salao_id in (select salao_id from perfis_acesso where auth_user_id = auth.uid()))',
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
