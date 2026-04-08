-- ════════════════════════════════════════════════════════════════════════════
-- MIGRAÇÃO: Adicionar suporte a VENDEDOR/ADMIN no sistema
-- ════════════════════════════════════════════════════════════════════════════

-- 1. Adicionar campo vendedor_id em saloes
alter table saloes add column vendedor_id uuid references auth.users(id) on delete set null;
alter table saloes add column deletado_em timestamptz default null;

create index idx_saloes_vendedor_id on saloes(vendedor_id);
create index idx_saloes_deletado_em on saloes(deletado_em);

-- 2. Tabela para rastrear histórico de logins gerados
create table if not exists logins_gerados (
  id uuid primary key default uuid_generate_v4(),
  vendedor_id uuid not null references auth.users(id) on delete cascade,
  salao_id uuid not null references saloes(id) on delete cascade,
  email_proprietaria text not null,
  auth_user_id uuid references auth.users(id) on delete set null,
  senha_temporaria text,
  gerado_em timestamptz default now(),
  alterado_em timestamptz,
  ativo boolean default true
);

create index idx_logins_vendedor on logins_gerados(vendedor_id);
create index idx_logins_salao on logins_gerados(salao_id);

-- 3. Policy de RLS para logins_gerados
alter table logins_gerados enable row level security;
create policy "Vendedor vê seus logins" on logins_gerados 
  for all to authenticated using (vendedor_id = auth.uid());

-- 4. Função para gerar senha aleatória
create or replace function fn_gerar_senha_aleatoria(length int default 10)
returns text as $$
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

-- 5. Função para soft-delete de salão
create or replace function fn_deletar_salao(p_salao_id uuid)
returns json as $$
declare
  v_salao_id uuid;
  v_count_atendimentos int;
  v_count_profissionais int;
begin
  -- Verificar existência
  select id into v_salao_id from saloes 
  where id = p_salao_id and deletado_em is null limit 1;
  
  if v_salao_id is null then
    return json_build_object(
      'sucesso', false,
      'mensagem', 'Salão não encontrado ou já foi deletado'
    );
  end if;

  -- Contar relacionamentos
  select count(*) into v_count_atendimentos from atendimentos where salao_id = p_salao_id;
  select count(*) into v_count_profissionais from profissionais where salao_id = p_salao_id and ativo = true;

  -- Soft delete
  update saloes set deletado_em = now(), ativo = false where id = p_salao_id;

  -- Retornar resultado
  return json_build_object(
    'sucesso', true,
    'mensagem', 'Salão deletado com sucesso (soft delete)',
    'atendimentos_existentes', v_count_atendimentos,
    'profissionais_ativos', v_count_profissionais
  );
end;
$$ language plpgsql security definer;

-- 6. Atualizar trigger de novo usuário para suportar VENDEDOR
create or replace function public.handle_new_user_salao()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_salao_id uuid;
  v_cargo cargo_enum;
  v_vendedor_id uuid;
begin
  v_salao_id := (new.raw_user_meta_data->>'salao_id')::uuid;
  v_cargo    := coalesce((new.raw_user_meta_data->>'cargo')::cargo_enum, 'PROPRIETARIO'::cargo_enum);
  v_vendedor_id := (new.raw_user_meta_data->>'vendedor_id')::uuid;

  -- Se for VENDEDOR, não precisa de salão
  if v_cargo = 'VENDEDOR' then
    insert into public.perfis_acesso (auth_user_id, salao_id, cargo)
    values (new.id, '00000000-0000-0000-0000-000000000000', v_cargo);
    return new;
  end if;

  -- Para PROPRIETARIO/FUNCIONARIO, precisa salão
  if v_salao_id is null then
    insert into public.saloes (nome, vendedor_id)
    values ('Salão de ' || coalesce(new.email, 'Usuário'), v_vendedor_id)
    returning id into v_salao_id;

    insert into public.configuracoes (salao_id, custo_fixo_por_atendimento, taxa_maquininha_pct)
    values (v_salao_id, 29.00, 5.00);
  end if;

  insert into public.perfis_acesso (auth_user_id, salao_id, cargo)
  values (new.id, v_salao_id, v_cargo);

  return new;
end;
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- ✅ MIGRAÇÃO CONCLUÍDA
-- ════════════════════════════════════════════════════════════════════════════
