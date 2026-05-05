-- Corrige o erro de tipo de retorno "varchar(255) vs text" na listagem de admins
CREATE OR REPLACE FUNCTION get_admin_emails()
RETURNS TABLE(
  auth_user_id uuid,
  email text,
  criado_em timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pa.auth_user_id,
    u.email::text,
    pa.criado_em
  FROM perfis_acesso pa
  JOIN auth.users u ON u.id = pa.auth_user_id
  WHERE pa.cargo = 'VENDEDOR'
  ORDER BY pa.criado_em DESC;
END;
$$;
