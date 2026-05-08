import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://adm-salao.vercel.app',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Token inválido' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const authUserId = user.id

    // Validar que o usuário autenticado é o vendedor_id
    if (authUserId !== vendedor_id) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado: você não pode criar admin para outro vendedor' }), 
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Cliente com permissões totais para criar usuários e burlar RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Criar usuário no auth.users (Supabase)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
      user_metadata: {
        cargo: 'VENDEDOR',
        nome
      }
    })

    if (authError) throw authError
    if (!authData.user) throw new Error('Falha ao criar credenciais')

    const novoUserId = authData.user.id

    // Função de rollback (caso algo dê erro depois de criar no auth)
    const rollback = () => supabaseAdmin.auth.admin.deleteUser(novoUserId)

    // 2. Gerar username a partir do email
    const username = email.split('@')[0]

    // 3. Criar perfil de acesso (upsert para evitar duplicatas por causa da trigger)
    const { error: perfilError } = await supabaseAdmin.from('perfis_acesso').upsert(
      {
        auth_user_id: novoUserId,
        cargo: 'VENDEDOR',
        username
      },
      { onConflict: 'auth_user_id' }
    )

    if (perfilError) {
      await rollback()
      throw perfilError
    }

    // Sucesso!
    return new Response(
      JSON.stringify({ 
        sucesso: true, 
        user: authData.user,
        mensagem: `Admin ${nome} criado com sucesso!`
      }), 
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Erro na Edge Function criar-admin:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Erro interno no servidor' }), 
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
