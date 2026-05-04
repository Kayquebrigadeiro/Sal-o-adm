-- ============================================================================
-- VIEW: clientes_com_resumo
-- ============================================================================
-- Agrega dados de atendimentos EXECUTADOS por cliente para exibição no CRM.
-- Campos computados: total_gasto, ultima_visita, total_atendimentos
--
-- NOTA: Atualmente o frontend computa esses valores client-side.
-- Esta view pode ser usada no futuro para otimização (1 query ao invés de 2).
-- ============================================================================

CREATE OR REPLACE VIEW clientes_com_resumo AS
SELECT
  c.id,
  c.salao_id,
  c.nome,
  c.telefone,
  c.criado_em,
  COALESCE(SUM(a.valor_cobrado), 0)::numeric(12,2) AS total_gasto,
  MAX(a.data) AS ultima_visita,
  COUNT(a.id)::integer AS total_atendimentos
FROM clientes c
LEFT JOIN atendimentos a
  ON a.cliente = c.nome
  AND a.salao_id = c.salao_id
  AND a.status = 'EXECUTADO'
GROUP BY c.id, c.salao_id, c.nome, c.telefone, c.criado_em;

-- ============================================================================
-- RLS: Herdar a mesma política da tabela clientes
-- ============================================================================
-- Se sua tabela clientes já tem RLS ativo, a view vai herdar.
-- Caso contrário, crie uma policy:

-- ALTER VIEW clientes_com_resumo SET (security_invoker = true);
-- Ou use SECURITY INVOKER no CREATE VIEW (Postgres 15+):
-- CREATE OR REPLACE VIEW clientes_com_resumo WITH (security_invoker = true) AS ...

-- ============================================================================
-- ÍNDICE RECOMENDADO para performance
-- ============================================================================
-- CREATE INDEX IF NOT EXISTS idx_atendimentos_cliente_nome
--   ON atendimentos (salao_id, cliente, status);
