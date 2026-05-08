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
        JSON.stringify({ error: 'Apenas vendedores podem deletar salões' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { salao_id } = await req.json()
    if (!salao_id) {
      return new Response(
        JSON.stringify({ error: 'salao_id não fornecido' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 1. Encontrar todos os usuários (auth_user_id) associados a este salão
    const { data: perfis, error: perfisBuscaError } = await supabaseAdmin
      .from('perfis_acesso')
      .select('auth_user_id')
      .eq('salao_id', salao_id)

    if (perfisBuscaError) {
      throw new Error(`Erro ao buscar perfis do salão: ${perfisBuscaError.message}`)
    }

    // 2. Apagar esses usuários do sistema de Auth do Supabase (Hard Delete)
    if (perfis && perfis.length > 0) {
      const promises = perfis.map(p => supabaseAdmin.auth.admin.deleteUser(p.auth_user_id));
      await Promise.all(promises);
    }
    
    // 3. Apagar o salão FISICAMENTE da tabela `saloes`
    // (Isso fará CASCADE para deletar atendimentos, procedimentos, perfis_acesso órfãos, etc)
    const { error: salaoDeleteError } = await supabaseAdmin
      .from('saloes')
      .delete()
      .eq('id', salao_id)

    if (salaoDeleteError) {
      throw new Error(`Erro ao deletar o salão: ${salaoDeleteError.message}`)
    }

    return new Response(
      JSON.stringify({ ok: true, success: true, mensagem: 'Salão e usuários deletados permanentemente.' }), 
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: any) {
    console.error('Erro ao deletar salão:', err)
    return new Response(
      JSON.stringify({ error: err.message }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
