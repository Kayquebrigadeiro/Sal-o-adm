import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

interface InviteBody {
  email: string
  salao_id: string
  role: string
  nome: string
}

serve(async (req) => {
  // CORS headers
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    })
  }

  try {
    const { email, salao_id, role, nome } = (await req.json()) as InviteBody

    // Validações
    if (!email || !salao_id || !role) {
      return new Response(
        JSON.stringify({ error: "email, salao_id e role são obrigatórios" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        }
      )
    }

    // Criar client do Supabase com Service Role Key
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

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
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
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
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
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
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      }
    )
  } catch (error) {
    console.error("Erro geral:", error)
    return new Response(
      JSON.stringify({ error: `Erro interno do servidor: ${error.message}` }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      }
    )
  }
})
