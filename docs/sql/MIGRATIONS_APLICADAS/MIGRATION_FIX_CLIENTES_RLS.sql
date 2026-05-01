-- Script para corrigir as políticas de segurança (RLS) da tabela clientes
-- Execute isso no SQL Editor do Supabase

-- Garante que o RLS está ativado
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;

-- Remove políticas antigas que possam estar causando conflito (se existirem)
DROP POLICY IF EXISTS "Isolar clientes" ON clientes;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON clientes;
DROP POLICY IF EXISTS "Enable all operations for users based on salao_id" ON clientes;

-- Cria uma política robusta que permite SELECT, INSERT, UPDATE e DELETE
-- apenas para usuários que pertencem ao salão do cliente
CREATE POLICY "Isolar clientes" ON clientes
FOR ALL 
TO authenticated 
USING (
    salao_id IN (
        SELECT salao_id 
        FROM perfis_acesso 
        WHERE auth_user_id = auth.uid()
    )
)
WITH CHECK (
    salao_id IN (
        SELECT salao_id 
        FROM perfis_acesso 
        WHERE auth_user_id = auth.uid()
    )
);

-- Opcional: Para garantir que proprietários e vendedores tenham as permissões corretas
-- (Opcional, pois a política "Isolar clientes" já cobre a maioria dos casos se os usuários 
-- estiverem corretamente associados ao salao_id através da tabela perfis_acesso).
