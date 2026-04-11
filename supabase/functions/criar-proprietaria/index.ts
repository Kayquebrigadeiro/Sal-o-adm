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
    const { email, senha, nome, nome_salao, telefone, vendedor_id } = await req.json()

    // Usando a chave de Serviço (Bypassa RLS e não afeta a sessão do navegador)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Cria o salão
    const { data: salao, error: salaoError } = await supabaseAdmin
      .from('saloes')
      .insert([{ nome: nome_salao, telefone, vendedor_id }])
      .select('id')
      .single()

    if (salaoError) throw salaoError

    // 2. Cria a proprietária com e-mail real (email_confirm: false para enviar e-mail de ativação)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: false, // ← Envia e-mail de ativação
      user_metadata: {
        cargo: 'PROPRIETARIO',
        nome,
        salao_id: salao.id
      }
    })

    if (authError) throw authError

    // 3. Cria o perfil de acesso
    const { error: perfilError } = await supabaseAdmin.from('perfis_acesso').insert({
      auth_user_id: authData.user.id,
      salao_id: salao.id,
      cargo: 'PROPRIETARIO'
    })

    if (perfilError) throw perfilError

    // 4. Salva a credencial na tabela para o Vendedor consultar depois
    const { error: loginError } = await supabaseAdmin.from('logins_gerados').insert({
      vendedor_id,
      salao_id: salao.id,
      email,
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
