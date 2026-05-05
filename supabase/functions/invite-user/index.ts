import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

interface InviteBody {
  email: string
  salao_id: string
  role: string
  nome: string
}

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://adm-salao.vercel.app',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // CORS headers
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
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

    // Validar sessão do chamador
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY") ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user: caller }, error: callerError } = await supabaseClient.auth.getUser()
    if (callerError || !caller) {
      return new Response(
        JSON.stringify({ error: 'Token inválido ou sessão expirada' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Criar client do Supabase com Service Role Key
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    // Verificar que o chamador é PROPRIETARIO ou VENDEDOR
    const { data: callerPerfil, error: perfilError } = await supabaseAdmin
      .from('perfis_acesso')
      .select('cargo')
      .eq('auth_user_id', caller.id)
      .single()

    if (perfilError || !callerPerfil || !['PROPRIETARIO', 'VENDEDOR'].includes(callerPerfil.cargo)) {
      return new Response(
        JSON.stringify({ error: 'Apenas proprietários ou vendedores podem enviar convites' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { email, salao_id, role, nome } = (await req.json()) as InviteBody

    // Validações
    if (!email || !salao_id || !role) {
      return new Response(
        JSON.stringify({ error: "email, salao_id e role são obrigatórios" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    // Enviar convite para o email
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      {
        data: {
          salao_id,
          role,
          nome: nome || email.split("@")[0],
        },
      }
    )

    if (inviteError) {
      console.error("Erro ao enviar convite:", inviteError)
      return new Response(
        JSON.stringify({ error: `Erro ao enviar convite: ${inviteError.message}` }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    // Criar perfil de acesso para o novo usuário
    if (inviteData.user) {
      const { error: profileError } = await supabaseAdmin
        .from("perfis_acesso")
        .insert({
          auth_user_id: inviteData.user.id,
          salao_id,
          cargo: role,
        })

      if (profileError) {
        console.error("Erro ao criar perfil:", profileError)
        return new Response(
          JSON.stringify({ error: `Erro ao criar perfil: ${profileError.message}` }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        )
      }

      // Se for profissional, criar também em profissionais
      if (role === "FUNCIONARIO" || role === "PROPRIETARIO") {
        await supabaseAdmin.from("profissionais").insert({
          salao_id,
          nome: nome || email.split("@")[0],
          cargo: role,
          ativo: true,
        })
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Convite enviado para ${email}`,
        user_id: inviteData.user?.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  } catch (error) {
    console.error("Erro geral:", error)
    return new Response(
      JSON.stringify({ error: `Erro interno do servidor: ${error.message}` }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  }
})

