-- ============================================================================
-- SCHEMA V8 — PARTE 4: SISTEMA DE MENSALIDADES (SAAS) - ADAPTADO AO V8_01
-- Finalidade: Funções, RLS e População Inicial baseadas nas tabelas existentes
-- ============================================================================

-- 1. GARANTIR QUE TEMOS UM PLANO ÚNICO
INSERT INTO planos (id, nome, descricao, valor_mensal, dias_trial)
VALUES ('00000000-0000-0000-0000-000000000001', 'Plano Único', 'Acesso total ao Salão Secreto', 100.00, 30)
ON CONFLICT (id) DO NOTHING;

-- 2. RLS PARA AS TABELAS EXISTENTES (planos, assinaturas, pagamentos_assinatura)

-- Planos
ALTER TABLE planos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Todos leem planos" ON planos;
CREATE POLICY "Todos leem planos" ON planos FOR SELECT TO authenticated USING (true);

-- Assinaturas
ALTER TABLE assinaturas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Vendedor gerencia assinaturas" ON assinaturas;
CREATE POLICY "Vendedor gerencia assinaturas" ON assinaturas FOR ALL TO authenticated 
  USING (salao_id IN (SELECT id FROM saloes WHERE vendedor_id = auth.uid()));

DROP POLICY IF EXISTS "Proprietaria le propria assinatura" ON assinaturas;
CREATE POLICY "Proprietaria le propria assinatura" ON assinaturas FOR SELECT TO authenticated 
  USING (salao_id IN (SELECT salao_id FROM perfis_acesso WHERE auth_user_id = auth.uid()));

-- Pagamentos Assinatura
ALTER TABLE pagamentos_assinatura ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Vendedor gerencia pagamentos" ON pagamentos_assinatura;
CREATE POLICY "Vendedor gerencia pagamentos" ON pagamentos_assinatura FOR ALL TO authenticated 
  USING (salao_id IN (SELECT id FROM saloes WHERE vendedor_id = auth.uid()));

DROP POLICY IF EXISTS "Proprietaria le proprios pagamentos" ON pagamentos_assinatura;
CREATE POLICY "Proprietaria le proprios pagamentos" ON pagamentos_assinatura FOR SELECT TO authenticated 
  USING (salao_id IN (SELECT salao_id FROM perfis_acesso WHERE auth_user_id = auth.uid()));


-- 3. FUNÇÃO: VERIFICAR ACESSO (Adaptada para retornar a estrutura que o frontend espera)
CREATE OR REPLACE FUNCTION verificar_acesso_salao(p_salao_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_assinatura assinaturas%ROWTYPE;
  v_plano planos%ROWTYPE;
  v_dias_restantes integer;
BEGIN
  SELECT * INTO v_assinatura 
  FROM assinaturas 
  WHERE salao_id = p_salao_id;

  -- Sem assinatura = TRIAL de 30 dias
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'tem_acesso', true,
      'status', 'TRIAL',
      'dias_restantes', 30,
      'mensagem', 'Período de teste',
      'valor_plano', 100.00
    );
  END IF;

  SELECT * INTO v_plano FROM planos WHERE id = v_assinatura.plano_id;

  v_dias_restantes := (v_assinatura.proximo_vencimento - CURRENT_DATE);
  
  RETURN jsonb_build_object(
    'tem_acesso',       (v_assinatura.status = 'ATIVA' OR v_assinatura.status = 'TRIAL') AND v_dias_restantes >= 0,
    'status',           v_assinatura.status,
    'data_vencimento',  v_assinatura.proximo_vencimento,
    'dias_restantes',   v_dias_restantes,
    'valor_plano',      coalesce(v_plano.valor_mensal, 100.00),
    'mensagem',         CASE 
      WHEN v_assinatura.status IN ('ATIVA', 'TRIAL') AND v_dias_restantes > 5 
        THEN 'Assinatura ativa'
      WHEN v_assinatura.status IN ('ATIVA', 'TRIAL') AND v_dias_restantes BETWEEN 1 AND 5 
        THEN 'Assinatura vence em ' || v_dias_restantes || ' dias'
      WHEN v_assinatura.status IN ('ATIVA', 'TRIAL') AND v_dias_restantes = 0 
        THEN 'Assinatura vence hoje'
      WHEN v_assinatura.status IN ('SUSPENSA', 'EXPIRADA') OR v_dias_restantes < 0 
        THEN 'Assinatura vencida'
      ELSE 'Acesso bloqueado'
    END
  );
END;
$$;


-- 4. ATUALIZAR TRIGGER PARA CRIAR ASSINATURA AUTOMATICAMENTE
CREATE OR REPLACE FUNCTION public.handle_new_user_salao() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_salao_id uuid; v_cargo cargo_enum; v_vendedor_id uuid; v_username text; v_cargo_text text; v_plano_id uuid;
BEGIN
  v_cargo_text := new.raw_user_meta_data->>'cargo';
  IF v_cargo_text IS NOT NULL AND v_cargo_text IN ('PROPRIETARIO','FUNCIONARIO','VENDEDOR') THEN
    v_cargo := v_cargo_text::cargo_enum;
  ELSE v_cargo := 'PROPRIETARIO'::cargo_enum; END IF;

  BEGIN v_salao_id := (new.raw_user_meta_data->>'salao_id')::uuid; EXCEPTION WHEN OTHERS THEN v_salao_id := NULL; END;
  BEGIN v_vendedor_id := (new.raw_user_meta_data->>'vendedor_id')::uuid; EXCEPTION WHEN OTHERS THEN v_vendedor_id := NULL; END;
  v_username := coalesce(new.raw_user_meta_data->>'username', fn_gerar_username(coalesce(new.email, 'user')));

  IF v_cargo = 'VENDEDOR' THEN
    INSERT INTO perfis_acesso (auth_user_id, salao_id, cargo, username) VALUES (new.id, null, v_cargo, v_username) ON CONFLICT (auth_user_id) DO NOTHING;
    RETURN new;
  END IF;

  IF v_salao_id IS NULL THEN
    INSERT INTO saloes (nome, vendedor_id) VALUES ('Salão de ' || coalesce(v_username, new.email, 'Usuário'), v_vendedor_id) RETURNING id INTO v_salao_id;
    INSERT INTO configuracoes (salao_id) VALUES (v_salao_id);
    
    -- Inserir assinatura TRIAL automática (buscando o plano único)
    SELECT id INTO v_plano_id FROM planos LIMIT 1;
    IF v_plano_id IS NOT NULL THEN
      INSERT INTO public.assinaturas (salao_id, plano_id, status, proximo_vencimento, trial_fim)
      VALUES (v_salao_id, v_plano_id, 'TRIAL', CURRENT_DATE + INTERVAL '30 days', CURRENT_DATE + INTERVAL '30 days');
    END IF;
  END IF;

  INSERT INTO perfis_acesso (auth_user_id, salao_id, cargo, username) VALUES (new.id, v_salao_id, v_cargo, v_username) ON CONFLICT (auth_user_id) DO NOTHING;
  RETURN new;
END;
$$;


-- 5. POPULAR ASSINATURAS TRIAL PARA SALÕES EXISTENTES
DO $$ 
DECLARE
  v_plano_id uuid;
BEGIN
  SELECT id INTO v_plano_id FROM planos LIMIT 1;
  IF v_plano_id IS NOT NULL THEN
    INSERT INTO assinaturas (salao_id, plano_id, status, proximo_vencimento, trial_fim)
    SELECT id, v_plano_id, 'TRIAL', CURRENT_DATE + INTERVAL '30 days', CURRENT_DATE + INTERVAL '30 days'
    FROM saloes 
    WHERE ativo = true
    ON CONFLICT (salao_id) DO NOTHING;
  END IF;
END $$;
