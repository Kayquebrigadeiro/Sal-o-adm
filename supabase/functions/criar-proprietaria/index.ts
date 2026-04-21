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

  // LOG TEMPORÁRIO: Ver o que está chegando
  const body = await req.json()
  console.log('BODY RECEBIDO:', JSON.stringify(body))

  // Cria cliente admin no escopo externo para usar no rollback
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    // Valida o token do vendedor (opcional, mas recomendado)
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Token de autoriza\u00e7\u00e3o n\u00e3o fornecido')
    }

    // Cria cliente com anon key para validar o token do vendedor
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    // Valida se o usu\u00e1rio est\u00e1 autenticado
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      throw new Error('Token inv\u00e1lido ou sess\u00e3o expirada')
    }

    const { email, senha, nome, nome_salao, telefone, vendedor_id } = body

    // Valida se o vendedor_id corresponde ao usu\u00e1rio autenticado
    if (vendedor_id !== user.id) {
      throw new Error('Vendedor n\u00e3o autorizado')
    }

    // 1. Cria o salão
    const { data: salao, error: salaoError } = await supabaseAdmin
      .from('saloes')
      .insert([{ nome: nome_salao, telefone, vendedor_id }])
      .select('id')
      .single()

    console.log('SALAO ERROR:', salaoError)
    if (salaoError) throw salaoError
    if (!salao) throw new Error('Falha ao criar salão')

    // 1.5 Cria as configurações iniciais do salão
    const { error: configError } = await supabaseAdmin
      .from('configuracoes')
      .insert([{ salao_id: salao.id, custo_fixo_por_atendimento: 10.65, taxa_maquininha_pct: 5 }])

    console.log('CONFIG ERROR:', configError)
    if (configError) throw configError

    // 2. Cria a proprietária com e-mail real (email_confirm: false para enviar e-mail de ativação)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: false, // ← Envia e-mail de ativação
      user_metadata: {
        cargo: 'PROPRIETARIO',
        nome,
        salao_id: salao.id
      },
      // Opcional: pode passar redirectTo aqui também se necessário
      // options: { emailRedirectTo: redirectTo }
    })

    console.log('AUTH ERROR:', authError)
    if (authError) throw authError
    if (!authData.user) throw new Error('Falha ao criar usuário de auth')

    const authUserId = authData.user.id // Salva para rollback se necessário
    const rollback = () => supabaseAdmin.auth.admin.deleteUser(authUserId)

    // 3. Cria o perfil de acesso (upsert para evitar duplicatas)
    const { error: perfilError } = await supabaseAdmin
      .from('perfis_acesso')
      .upsert(
        {
          auth_user_id: authUserId,
          salao_id: salao.id,
          cargo: 'PROPRIETARIO'
        },
        { onConflict: 'auth_user_id' }
      )

    console.log('PERFIL ERROR:', perfilError)
    if (perfilError) {
      await rollback()
      throw perfilError
    }

    // 4. Salva a credencial na tabela para o Vendedor consultar depois
    const { error: loginError } = await supabaseAdmin.from('logins_gerados').insert({
      vendedor_id,
      salao_id: salao.id,
      username: email,
      senha_temporaria: senha,
    })

    console.log('LOGIN ERROR:', loginError)
    if (loginError) {
      await rollback()
      throw loginError
    }

    return new Response(JSON.stringify({ user: authData.user }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    console.error('ERRO CAPTURADO:', error)
    
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
