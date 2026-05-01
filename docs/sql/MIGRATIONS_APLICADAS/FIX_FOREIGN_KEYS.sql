-- ========================================================================================
-- SCRIPT DE FIX DE FOREIGN KEYS: PRESERVAÇÃO DE HISTÓRICO
-- Execute este script no SQL Editor do Supabase para aplicar a política de 
-- ON DELETE SET NULL, garantindo que o histórico de agendamentos não seja
-- apagado quando um profissional ou procedimento for deletado.
-- ========================================================================================

-- 1. Remover obrigatoriedade (NOT NULL) das colunas em atendimentos
ALTER TABLE public.atendimentos ALTER COLUMN profissional_id DROP NOT NULL;
ALTER TABLE public.atendimentos ALTER COLUMN procedimento_id DROP NOT NULL;

-- 2. Recriar a Foreign Key de profissional_id em atendimentos
ALTER TABLE public.atendimentos DROP CONSTRAINT IF EXISTS atendimentos_profissional_id_fkey;
ALTER TABLE public.atendimentos
  ADD CONSTRAINT atendimentos_profissional_id_fkey
  FOREIGN KEY (profissional_id)
  REFERENCES public.profissionais(id)
  ON DELETE SET NULL;

-- 3. Recriar a Foreign Key de procedimento_id em atendimentos
ALTER TABLE public.atendimentos DROP CONSTRAINT IF EXISTS atendimentos_procedimento_id_fkey;
ALTER TABLE public.atendimentos
  ADD CONSTRAINT atendimentos_procedimento_id_fkey
  FOREIGN KEY (procedimento_id)
  REFERENCES public.procedimentos(id)
  ON DELETE SET NULL;

-- 4. Recriar a Foreign Key de profissional_id em procedimentos_paralelos
ALTER TABLE public.procedimentos_paralelos DROP CONSTRAINT IF EXISTS procedimentos_paralelos_profissional_id_fkey;
ALTER TABLE public.procedimentos_paralelos
  ADD CONSTRAINT procedimentos_paralelos_profissional_id_fkey
  FOREIGN KEY (profissional_id)
  REFERENCES public.profissionais(id)
  ON DELETE SET NULL;

-- Aviso: Se você já tiver dependências que quebrem isso, assegure-se de que nenhum view dependa das constraints antigas.
