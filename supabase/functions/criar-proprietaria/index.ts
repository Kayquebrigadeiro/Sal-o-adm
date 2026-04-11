// supabase/functions/criar-proprietaria/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Tratamento de CORS (Essencial para chamar do React)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, senha, username, salao_id, vendedor_id } = await req.json()

    // Usando a chave de Serviço (Bypassa RLS e não afeta a sessão do navegador)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Cria a proprietária já com e-mail confirmado
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
      user_metadata: {
        cargo: 'PROPRIETARIO',
        salao_id,
        vendedor_id,
        username
      }
    })

    if (authError) throw authError

    // 2. Salva a credencial na tabela para o Vendedor entregar depois
    const { error: loginError } = await supabaseAdmin.from('logins_gerados').insert({
      vendedor_id,
      salao_id,
      username,
      senha_hash: senha, 
      auth_user_id: authData.user.id
    })

    if (loginError) throw loginError

    return new Response(JSON.stringify({ user: authData.user }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
