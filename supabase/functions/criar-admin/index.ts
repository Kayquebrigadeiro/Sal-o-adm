import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { jwtDecode } from 'https://deno.land/x/jwt@v1.1.2/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, senha, nome, vendedor_id } = await req.json()

    // 🛡️ SEGURANÇA: Validar autorização — apenas vendedores podem criar admins
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Token não fornecido' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Extrair token
    const token = authHeader.replace('Bearer ', '')
    let authUserId: string
    try {
      const decoded = jwtDecode(token) as any
      authUserId = decoded.sub
    } catch {
      return new Response(
        JSON.stringify({ error: 'Token inválido' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validar que o usuário autenticado é o vendedor_id
    if (authUserId !== vendedor_id) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado: você não pode criar admin para outro vendedor' }), 
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Criar cliente admin para validar que vendedor_id existe e é VENDEDOR
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verificar que vendedor_id existe e tem cargo VENDEDOR
    const { data: vendedorPerfil, error: vendedorError } = await supabaseAdmin
      .from('perfis_acesso')
      .select('cargo')
      .eq('auth_user_id', vendedor_id)
      .single()

    if (vendedorError || !vendedorPerfil || vendedorPerfil.cargo !== 'VENDEDOR') {
      return new Response(
        JSON.stringify({ error: 'Apenas vendedores podem criar admins' }), 
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Email inválido' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Cria o usuário com acesso imediato (sem link de confirmação)
    const { data: user, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
      user_metadata: { 
        nome, 
        cargo: 'VENDEDOR'
      }
    })

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // O perfil VENDEDOR é criado automaticamente pelo trigger handle_new_user_salao
    // (com salao_id = NULL, que é o correto para vendedores)

    return new Response(
      JSON.stringify({ user_id: user.user.id, success: true }), 
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
