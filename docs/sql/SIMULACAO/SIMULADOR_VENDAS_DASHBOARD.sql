-- ============================================================================
-- SIMULADOR DE VENDAS (Massa de Dados)
-- Finalidade: Gerar massa de dados rápida e aleatória para visualizar gráficos
-- e testar a performance do Dashboard com muitos atendimentos.
-- ============================================================================

DO $$
DECLARE
    -- 1. INSIRA O ID DO SEU SALÃO AQUI
    target_salao_uuid UUID := 'SEU_ID_DO_SALAO_AQUI'; 
    
    -- Configurações da simulação
    data_inicio DATE := '2026-04-01';
    data_fim    DATE := '2026-04-30';
    
    -- Variáveis de controle
    current_day DATE;
    num_atendimentos INTEGER;
    prof_id UUID;
    proc_id UUID;
    v_valor_cobrado NUMERIC;
    v_id_atendimento UUID;
BEGIN
    -- Verificação básica
    IF NOT EXISTS (SELECT 1 FROM saloes WHERE id = target_salao_uuid) THEN
        RAISE EXCEPTION 'ID do salão não encontrado. Por favor, ajuste a variável target_salao_uuid.';
    END IF;

    -- Loop pelos dias do mês
    FOR current_day IN SELECT generate_series(data_inicio, data_fim, '1 day')::date LOOP
        
        -- Ignorar domingos (opcional)
        IF EXTRACT(DOW FROM current_day) = 0 THEN CONTINUE; END IF;

        -- Escolher número de atendimentos (ex: 3 a 8 por dia)
        num_atendimentos := floor(random() * 6 + 3);

        FOR i IN 1..num_atendimentos LOOP
            -- Selecionar profissional e procedimento aleatórios do salão
            SELECT id INTO prof_id FROM profissionais WHERE salao_id = target_salao_uuid AND ativo = true ORDER BY random() LIMIT 1;
            SELECT id INTO proc_id FROM procedimentos WHERE salao_id = target_salao_uuid AND ativo = true ORDER BY random() LIMIT 1;

            IF prof_id IS NOT NULL AND proc_id IS NOT NULL THEN
                -- Inserir Atendimento
                INSERT INTO atendimentos (
                    salao_id,
                    data,
                    horario,
                    profissional_id,
                    procedimento_id,
                    cliente,
                    status,
                    comprimento,
                    valor_cobrado, -- Deixamos 0 para o trigger calcular
                    valor_pago,
                    obs
                ) VALUES (
                    target_salao_uuid,
                    current_day,
                    (9 + floor(random() * 10))::text || ':00:00',
                    prof_id,
                    proc_id,
                    'Cliente Teste ' || floor(random() * 1000),
                    CASE WHEN random() < 0.1 THEN 'CANCELADO'::status_enum ELSE 'EXECUTADO'::status_enum END,
                    (ARRAY['P', 'M', 'G'])[floor(random() * 3 + 1)]::comprimento_enum,
                    0, 
                    0,
                    'Simulação Automática'
                ) RETURNING id, valor_cobrado INTO v_id_atendimento, v_valor_cobrado;

                -- Simular pagamento total para atendimentos EXECUTADOS
                UPDATE atendimentos 
                SET valor_pago = valor_cobrado 
                WHERE id = v_id_atendimento AND status = 'EXECUTADO';
            END IF;
        END LOOP;

        -- Gerar 1-2 vendas de Homecare por dia
        FOR j IN 1..floor(random() * 2 + 1) LOOP
            INSERT INTO homecare (salao_id, data, cliente, produto, custo_produto, valor_venda, valor_pago)
            VALUES (
                target_salao_uuid, current_day, 'Cliente Teste', 'Produto Simulado', 
                30.00, 85.00, 85.00
            );
        END LOOP;

        -- Gerar 1 despesa a cada 3 dias para não ficar lucro infinito
        IF floor(random() * 3) = 0 THEN
            INSERT INTO despesas (salao_id, data, descricao, tipo, valor, valor_pago)
            VALUES (target_salao_uuid, current_day, 'Gasto Simulado', 'OUTRO', 150.00, 150.00);
        END IF;

    END LOOP;

    RAISE NOTICE 'Simulação concluída com sucesso para o salão %', target_salao_uuid;
END $$;

-- ============================================================================
-- COMANDOS ÚTEIS PARA LIMPEZA (Se quiser apagar os dados de teste depois)
-- ============================================================================
/*
DELETE FROM atendimentos WHERE obs = 'Simulação Automática' AND salao_id = 'SEU_ID_DO_SALAO';
DELETE FROM homecare WHERE produto = 'Produto Simulado' AND salao_id = 'SEU_ID_DO_SALAO';
DELETE FROM despesas WHERE descricao = 'Gasto Simulado' AND salao_id = 'SEU_ID_DO_SALAO';
*/
