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
    // 🛡️ SEGURANÇA: Validar token de autorização
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Token de autorização não fornecido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Validar sessão do chamador usando anon key
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user: caller }, error: callerError } = await supabaseClient.auth.getUser()
    if (callerError || !caller) {
      return new Response(
        JSON.stringify({ error: 'Token inválido ou sessão expirada' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verificar que o chamador é VENDEDOR
    const { data: callerPerfil, error: perfilError } = await supabaseAdmin
      .from('perfis_acesso')
      .select('cargo')
      .eq('auth_user_id', caller.id)
      .single()

    if (perfilError || !callerPerfil || callerPerfil.cargo !== 'VENDEDOR') {
      return new Response(
        JSON.stringify({ error: 'Apenas vendedores podem remover admins' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { user_id } = await req.json()

    // Impedir que o admin se auto-delete
    if (user_id === caller.id) {
      return new Response(
        JSON.stringify({ error: 'Você não pode remover a si mesmo.' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Remove o perfil
    await supabaseAdmin.from('perfis_acesso').delete().eq('auth_user_id', user_id)
    
    // Remove o usuário do Auth
    await supabaseAdmin.auth.admin.deleteUser(user_id)

    return new Response(
      JSON.stringify({ ok: true, success: true }), 
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

