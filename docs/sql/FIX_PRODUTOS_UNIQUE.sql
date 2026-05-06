-- ============================================================================
-- FIX: Adicionar constraint UNIQUE para produtos do catálogo
-- Isso permite o uso de upsert (on_conflict) ao salvar produtos na tela de Configurações.
-- ============================================================================

ALTER TABLE produtos_catalogo ADD CONSTRAINT produtos_catalogo_salao_id_nome_key UNIQUE (salao_id, nome);
