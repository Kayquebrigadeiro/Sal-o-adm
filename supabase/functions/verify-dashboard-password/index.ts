// supabase/functions/verify-dashboard-password/index.ts
// Sprint 9.1 — Valida a senha de login do usuário (usado no fluxo "Esqueci meu PIN")
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://adm-salao.vercel.app',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Token de autorização não fornecido')
    }

    const { password } = await req.json()
    if (!password || typeof password !== 'string') {
      throw new Error('Senha não fornecida')
    }

    // Cliente com anon key para validar o token do usuário
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    // Identifica o usuário autenticado pelo JWT
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      throw new Error('Token inválido ou sessão expirada')
    }

    // Cliente admin para buscar dados e tentar login
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Obtém o email do usuário via admin API
    const { data: adminUser, error: adminError } = await supabaseAdmin.auth.admin.getUserById(user.id)
    if (adminError || !adminUser?.user?.email) {
      throw new Error('Não foi possível identificar o usuário')
    }

    const email = adminUser.user.email

    // Tenta autenticar com a senha fornecida (usando admin client para não afetar sessão do frontend)
    const { error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      return new Response(
        JSON.stringify({ authorized: false }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    return new Response(
      JSON.stringify({ authorized: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: any) {
    console.error('verify-dashboard-password ERROR:', error.message)

    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
