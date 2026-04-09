import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    const { email, senha, nome } = await req.json()

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

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

    // Cria o perfil com cargo VENDEDOR (salao_id especial para vendedores)
    await supabaseAdmin.from('perfis_acesso').insert({
      auth_user_id: user.user.id,
      salao_id: '00000000-0000-0000-0000-000000000000',
      cargo: 'VENDEDOR'
    })

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
