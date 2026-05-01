-- ============================================================================
-- SCRIPT DE SIMULAÇÃO COM DADOS REAIS DO SALÃO (VERSÃO CORRIGIDA)
-- Alvo: ~R$ 11.984,56 faturamento | ~R$ 6.200,00 lucro
-- ============================================================================

DO $$
DECLARE
    -- 1. INSIRA SEU ID DO SALÃO AQUI
    v_salao_id UUID := 'SEU_UUID_AQUI'; 
    
    v_prof_prop_id UUID;
    v_prof_jess_id UUID;
    
    -- IDs de procedimentos
    v_proc_prog_sf UUID; v_proc_prog_cf UUID; v_proc_botox UUID;
    v_proc_luzes UUID; v_proc_color UUID; v_proc_hidra UUID;
    v_proc_nutri UUID; v_proc_corte UUID; v_proc_unhas UUID;
    v_proc_sombr UUID; v_proc_cilios UUID; v_proc_lavat UUID;

    v_data DATE;
    v_prof_atual UUID;
    i INTEGER;
BEGIN
    -- A. GARANTIR PROFISSIONAIS (Lógica segura sem ON CONFLICT)
    
    -- Proprietária
    SELECT id INTO v_prof_prop_id FROM profissionais WHERE salao_id = v_salao_id AND nome = 'PROPRIETARIA';
    IF v_prof_prop_id IS NULL THEN
        INSERT INTO profissionais (salao_id, nome, cargo, salario_fixo)
        VALUES (v_salao_id, 'PROPRIETARIA', 'PROPRIETARIO', 0)
        RETURNING id INTO v_prof_prop_id;
    END IF;

    -- Jessica
    SELECT id INTO v_prof_jess_id FROM profissionais WHERE salao_id = v_salao_id AND nome = 'JESSICA';
    IF v_prof_jess_id IS NULL THEN
        INSERT INTO profissionais (salao_id, nome, cargo, salario_fixo)
        VALUES (v_salao_id, 'JESSICA', 'FUNCIONARIO', 800)
        RETURNING id INTO v_prof_jess_id;
    END IF;

    -- B. GARANTIR PROCEDIMENTOS (Com preços e custos reais)
    -- Progressiva S/F
    INSERT INTO procedimentos (salao_id, nome, categoria, preco_p, preco_m, preco_g, custo_variavel)
    VALUES (v_salao_id, 'PROGRESSIVA S/F', 'SERVICO_CABELO', 164.26, 197.11, 213.54, 6.75)
    ON CONFLICT (salao_id, nome) DO UPDATE SET preco_p = 164.26, preco_m = 197.11, preco_g = 213.54, custo_variavel = 6.75
    RETURNING id INTO v_proc_prog_sf;

    -- Botox
    INSERT INTO procedimentos (salao_id, nome, categoria, preco_p, preco_m, preco_g, custo_variavel)
    VALUES (v_salao_id, 'BOTOX', 'SERVICO_CABELO', 122.24, 146.69, 158.91, 15.83)
    ON CONFLICT (salao_id, nome) DO UPDATE SET preco_p = 122.24, preco_m = 146.69, preco_g = 158.91, custo_variavel = 15.83
    RETURNING id INTO v_proc_botox;

    -- Luzes
    INSERT INTO procedimentos (salao_id, nome, categoria, preco_p, requer_comprimento, custo_variavel)
    VALUES (v_salao_id, 'LUZES', 'SERVICO_CABELO', 206.11, false, 101.50)
    ON CONFLICT (salao_id, nome) DO UPDATE SET preco_p = 206.11, custo_variavel = 101.50
    RETURNING id INTO v_proc_luzes;

    -- Coloracao
    INSERT INTO procedimentos (salao_id, nome, categoria, preco_p, requer_comprimento, custo_variavel)
    VALUES (v_salao_id, 'COLORACAO', 'SERVICO_CABELO', 136.00, false, 34.90)
    ON CONFLICT (salao_id, nome) DO UPDATE SET preco_p = 136.00, custo_variavel = 34.90
    RETURNING id INTO v_proc_color;

    -- Hidratação
    INSERT INTO procedimentos (salao_id, nome, categoria, preco_p, preco_m, preco_g, custo_variavel)
    VALUES (v_salao_id, 'HIDRATACAO', 'SERVICO_CABELO', 88.41, 106.09, 114.93, 4.69)
    ON CONFLICT (salao_id, nome) DO UPDATE SET preco_p = 88.41, preco_m = 106.09, preco_g = 114.93, custo_variavel = 4.69
    RETURNING id INTO v_proc_hidra;

    -- Unhas Gel
    INSERT INTO procedimentos (salao_id, nome, categoria, preco_p, requer_comprimento, custo_variavel)
    VALUES (v_salao_id, 'UNHAS GEL', 'SERVICO_ESTETICA', 56.11, false, 4.00)
    ON CONFLICT (salao_id, nome) DO UPDATE SET preco_p = 56.11, custo_variavel = 4.00
    RETURNING id INTO v_proc_unhas;

    -- Sobrancelha
    INSERT INTO procedimentos (salao_id, nome, categoria, preco_p, requer_comprimento, custo_variavel)
    VALUES (v_salao_id, 'SOMBRANCELHA', 'SERVICO_ESTETICA', 54.00, false, 2.00)
    ON CONFLICT (salao_id, nome) DO UPDATE SET preco_p = 54.00, custo_variavel = 2.00
    RETURNING id INTO v_proc_sombr;

    -- Extensão de Cílios
    INSERT INTO procedimentos (salao_id, nome, categoria, preco_p, requer_comprimento, custo_variavel)
    VALUES (v_salao_id, 'EXTENSAO DE CILIOS', 'SERVICO_ESTETICA', 157.16, false, 50.00)
    ON CONFLICT (salao_id, nome) DO UPDATE SET preco_p = 157.16, custo_variavel = 50.00
    RETURNING id INTO v_proc_cilios;

    -- Corte
    INSERT INTO procedimentos (salao_id, nome, categoria, preco_p, preco_m, preco_g, custo_variavel)
    VALUES (v_salao_id, 'CORTE', 'SERVICO_CABELO', 73.65, 88.38, 95.75, 0.67)
    ON CONFLICT (salao_id, nome) DO UPDATE SET preco_p = 73.65, preco_m = 88.38, preco_g = 95.75, custo_variavel = 0.67
    RETURNING id INTO v_proc_corte;

    -- Pegar os IDs restantes por segurança (caso o ON CONFLICT tenha atualizado)
    SELECT id INTO v_proc_prog_sf FROM procedimentos WHERE salao_id = v_salao_id AND nome = 'PROGRESSIVA S/F';
    SELECT id INTO v_proc_botox FROM procedimentos WHERE salao_id = v_salao_id AND nome = 'BOTOX';
    SELECT id INTO v_proc_luzes FROM procedimentos WHERE salao_id = v_salao_id AND nome = 'LUZES';
    SELECT id INTO v_proc_color FROM procedimentos WHERE salao_id = v_salao_id AND nome = 'COLORACAO';
    SELECT id INTO v_proc_hidra FROM procedimentos WHERE salao_id = v_salao_id AND nome = 'HIDRATACAO';
    SELECT id INTO v_proc_unhas FROM procedimentos WHERE salao_id = v_salao_id AND nome = 'UNHAS GEL';
    SELECT id INTO v_proc_sombr FROM procedimentos WHERE salao_id = v_salao_id AND nome = 'SOMBRANCELHA';
    SELECT id INTO v_proc_cilios FROM procedimentos WHERE salao_id = v_salao_id AND nome = 'EXTENSAO DE CILIOS';
    SELECT id INTO v_proc_corte FROM procedimentos WHERE salao_id = v_salao_id AND nome = 'CORTE';

    -- C. SIMULAR ATENDIMENTOS (Volume sugerido)
    FOR i IN 1..105 LOOP
        v_data := '2026-04-01'::date + (i % 28) * '1 day'::interval;
        v_prof_atual := CASE WHEN i % 2 = 0 THEN v_prof_prop_id ELSE v_prof_jess_id END;

        INSERT INTO atendimentos (
            salao_id, data, horario, profissional_id, procedimento_id, cliente, status, comprimento, valor_cobrado, valor_pago, obs
        ) VALUES (
            v_salao_id, v_data, 
            ((8 + (i % 10))::text || ':00:00')::time, 
            v_prof_atual,
            CASE 
                WHEN i <= 8 THEN v_proc_prog_sf
                WHEN i <= 14 THEN v_proc_botox
                WHEN i <= 18 THEN v_proc_luzes
                WHEN i <= 26 THEN v_proc_color
                WHEN i <= 36 THEN v_proc_hidra
                WHEN i <= 51 THEN v_proc_unhas
                WHEN i <= 71 THEN v_proc_sombr
                WHEN i <= 74 THEN v_proc_cilios
                ELSE v_proc_corte
            END,
            'Cliente Simulado ' || i,
            'EXECUTADO',
            CASE 
                WHEN i <= 8 THEN 'G'::comprimento_enum -- PROGRESSIVA G
                WHEN i <= 14 THEN 'M'::comprimento_enum -- BOTOX M
                WHEN i <= 36 THEN 'G'::comprimento_enum -- HIDRA G
                ELSE 'P'::comprimento_enum
            END,
            0, 0, 'Simulação Real'
        );
    END LOOP;

    -- Ajustar pagamentos (Trigger já calculou valor_cobrado)
    UPDATE atendimentos SET valor_pago = valor_cobrado WHERE salao_id = v_salao_id AND obs = 'Simulação Real';

    -- D. DESPESAS FIXAS
    INSERT INTO despesas (salao_id, data, descricao, tipo, valor, valor_pago)
    VALUES 
        (v_salao_id, '2026-04-05', 'ALUGUEL', 'ALUGUEL', 1750.00, 1750.00),
        (v_salao_id, '2026-04-10', 'ENERGIA', 'ENERGIA', 190.00, 190.00),
        (v_salao_id, '2026-04-10', 'AGUA', 'AGUA', 120.00, 120.00),
        (v_salao_id, '2026-04-15', 'INTERNET', 'INTERNET', 150.00, 150.00),
        (v_salao_id, '2026-04-20', 'PRODUTOS LIMPEZA', 'OUTRO', 55.00, 55.00),
        (v_salao_id, '2026-04-22', 'ALIMENTOS STUDIOS', 'OUTRO', 200.00, 200.00),
        (v_salao_id, '2026-04-25', 'SISTEMA STUDIO', 'OUTRO', 100.00, 100.00),
        (v_salao_id, '2026-04-27', 'ACESSORIOS FIXO', 'OUTRO', 100.00, 100.00),
        (v_salao_id, '2026-04-28', 'CAPSULA CAFE', 'OUTRO', 150.00, 150.00);

    -- E. HOMECARE (8 vendas)
    FOR i IN 1..8 LOOP
        INSERT INTO homecare (salao_id, data, cliente, produto, custo_produto, valor_venda, valor_pago)
        VALUES (v_salao_id, '2026-04-01'::date + (i * 3), 'Cliente HomeCare', 'Kit Profissional ' || i, 45.00, 90.00, 90.00);
    END LOOP;

    RAISE NOTICE 'Simulação Real concluída com sucesso!';
END $$;

-- LIMPEZA:
-- DELETE FROM atendimentos WHERE obs = 'Simulação Real' AND salao_id = 'SEU_UUID_AQUI';
-- DELETE FROM homecare WHERE cliente = 'Cliente HomeCare' AND salao_id = 'SEU_UUID_AQUI';
-- DELETE FROM despesas WHERE salao_id = 'SEU_UUID_AQUI' AND data BETWEEN '2026-04-01' AND '2026-04-30';