-- ============================================================
-- FIX: Corrigir RLS da tabela clientes (erro 403 no insert)
-- Execute no SQL Editor do Supabase Dashboard
-- ============================================================

-- 1. Garante que o RLS está ativado
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;

-- 2. Remove TODAS as policies antigas para evitar conflitos
DROP POLICY IF EXISTS "Isolar clientes" ON clientes;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON clientes;
DROP POLICY IF EXISTS "Enable all operations for users based on salao_id" ON clientes;
DROP POLICY IF EXISTS "clientes_policy" ON clientes;

-- 3. Cria policy única que cobre SELECT, INSERT, UPDATE, DELETE
-- Usa perfis_acesso para verificar se o usuário pertence ao salão
CREATE POLICY "Isolar clientes por salao" ON clientes
FOR ALL 
TO authenticated 
USING (
    salao_id IN (
        SELECT pa.salao_id 
        FROM perfis_acesso pa
        WHERE pa.auth_user_id = auth.uid()
    )
)
WITH CHECK (
    salao_id IN (
        SELECT pa.salao_id 
        FROM perfis_acesso pa
        WHERE pa.auth_user_id = auth.uid()
    )
);

-- 4. Verifica se funcionou
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'clientes';
