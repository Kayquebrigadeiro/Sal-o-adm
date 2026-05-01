-- ============================================================================
-- VIEWS OFICIAIS DO DASHBOARD (VERSÃO PRODUÇÃO)
-- Use este script para restaurar as views que o Dashboard.jsx consome.
-- ============================================================================

-- 1. CORREÇÃO DA VIEW rendimento_por_profissional
DROP VIEW IF EXISTS public.rendimento_por_profissional CASCADE;
CREATE OR REPLACE VIEW public.rendimento_por_profissional 
WITH (security_invoker = true) AS
SELECT
  a.salao_id, 
  DATE_TRUNC('month', a.data)::date AS mes, 
  p.nome AS profissional, 
  p.cargo,
  COUNT(*) FILTER (WHERE a.status = 'EXECUTADO') AS atendimentos,
  -- Alterado para valor_cobrado para não aparecer zerado sem comissão
  SUM(a.valor_cobrado) FILTER (WHERE a.status = 'EXECUTADO') AS rendimento_bruto,
  SUM(a.valor_cobrado) FILTER (WHERE a.status = 'EXECUTADO') AS faturamento_gerado
FROM atendimentos a 
JOIN profissionais p ON p.id = a.profissional_id
GROUP BY a.salao_id, DATE_TRUNC('month', a.data)::date, p.id, p.nome, p.cargo;

-- 2. CORREÇÃO DA VIEW fechamento_mensal (Aliases para o Dashboard)
DROP VIEW IF EXISTS public.fechamento_mensal CASCADE;
CREATE OR REPLACE VIEW public.fechamento_mensal 
WITH (security_invoker = true) AS
WITH base AS (
  SELECT salao_id, DATE_TRUNC('month', data)::date AS mes FROM atendimentos
  UNION SELECT salao_id, DATE_TRUNC('month', data)::date FROM homecare
  UNION SELECT salao_id, DATE_TRUNC('month', data)::date FROM procedimentos_paralelos
  UNION SELECT salao_id, DATE_TRUNC('month', data)::date FROM despesas
),
atend AS (
  SELECT
    salao_id, DATE_TRUNC('month', data)::date AS mes,
    SUM(valor_cobrado) FILTER (WHERE status <> 'CANCELADO') AS faturamento_bruto,
    SUM(valor_pago) FILTER (WHERE status <> 'CANCELADO') AS receita_recebida,
    SUM(valor_cobrado - valor_pago) FILTER (WHERE status = 'EXECUTADO') AS total_pendente,
    SUM(valor_maquininha) FILTER (WHERE status <> 'CANCELADO') AS total_maquininha,
    SUM(valor_profissional) FILTER (WHERE status <> 'CANCELADO') AS total_profissionais,
    SUM(custo_fixo) FILTER (WHERE status <> 'CANCELADO') AS total_custo_fixo,
    SUM(custo_variavel) FILTER (WHERE status <> 'CANCELADO') AS total_custo_variavel,
    SUM(lucro_liquido) FILTER (WHERE status <> 'CANCELADO') AS lucro_real,
    SUM(lucro_possivel) FILTER (WHERE status <> 'CANCELADO') AS lucro_possivel,
    COUNT(*) FILTER (WHERE status <> 'CANCELADO') AS total_atendimentos,
    COUNT(*) FILTER (WHERE status = 'CANCELADO') AS total_cancelamentos
  FROM atendimentos GROUP BY 1,2
),
hc AS (
  SELECT salao_id, DATE_TRUNC('month', data)::date AS mes, SUM(valor_venda) AS receita_homecare,
  SUM(valor_pago) AS recebido_homecare, SUM(valor_pendente) AS pendente_homecare, SUM(lucro) AS lucro_homecare
  FROM homecare GROUP BY 1,2
),
pp AS (
  SELECT salao_id, DATE_TRUNC('month', data)::date AS mes, SUM(valor) AS receita_paralelos,
  SUM(valor_pago) AS recebido_paralelos, SUM(valor_pendente) AS pendente_paralelos
  FROM procedimentos_paralelos GROUP BY 1,2
),
desp AS (
  SELECT salao_id, DATE_TRUNC('month', data)::date AS mes, SUM(valor) AS total_despesas
  FROM despesas GROUP BY 1,2
),
sal AS (
  SELECT salao_id, SUM(salario_fixo) AS total_salarios_fixos
  FROM profissionais WHERE ativo = true AND cargo = 'FUNCIONARIO' GROUP BY salao_id
)
SELECT
  b.salao_id, b.mes,
  COALESCE(a.faturamento_bruto, 0)        AS faturamento_bruto,
  COALESCE(a.receita_recebida, 0)         AS receita_recebida,
  COALESCE(a.total_pendente, 0)           AS total_pendente,
  COALESCE(a.total_maquininha, 0)         AS total_maquininha,
  COALESCE(a.total_profissionais, 0)      as total_profissionais,
  COALESCE(a.total_custo_fixo, 0)         AS total_custo_fixo,
  COALESCE(a.total_custo_variavel, 0)     AS total_custo_variavel,
  COALESCE(a.lucro_real, 0)               AS lucro_real,
  COALESCE(a.lucro_possivel, 0)           AS lucro_possivel,
  COALESCE(a.total_atendimentos, 0)       AS total_atendimentos,
  COALESCE(a.total_cancelamentos, 0)      AS total_cancelamentos,
  COALESCE(h.receita_homecare, 0)         AS receita_homecare,
  COALESCE(h.lucro_homecare, 0)           AS lucro_homecare,
  COALESCE(h.pendente_homecare, 0)        AS pendente_homecare,
  COALESCE(p.receita_paralelos, 0)        AS receita_paralelos,
  COALESCE(p.pendente_paralelos, 0)       AS pendente_paralelos,
  COALESCE(d.total_despesas, 0)           AS total_despesas,
  COALESCE(s.total_salarios_fixos, 0)     AS total_salarios_fixos,
  COALESCE(a.faturamento_bruto, 0) + COALESCE(h.receita_homecare, 0) + COALESCE(p.receita_paralelos, 0) AS receita_total,
  COALESCE(a.lucro_real, 0) + COALESCE(h.lucro_homecare, 0) - COALESCE(d.total_despesas, 0) - COALESCE(s.total_salarios_fixos, 0) AS saude_financeira
FROM base b
LEFT JOIN atend a ON a.salao_id = b.salao_id AND a.mes = b.mes
LEFT JOIN hc    h ON h.salao_id = b.salao_id AND h.mes = b.mes
LEFT JOIN pp    p ON p.salao_id = b.salao_id AND p.mes = b.mes
LEFT JOIN desp  d ON d.salao_id = b.salao_id AND d.mes = b.mes
LEFT JOIN sal   s ON s.salao_id = b.salao_id
ORDER BY b.mes DESC;
