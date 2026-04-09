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
    const { user_id, admin_solicitante_id } = await req.json()

    // Impedir que o admin se auto-delete
    if (user_id === admin_solicitante_id) {
      return new Response(
        JSON.stringify({ error: 'Você não pode remover a si mesmo.' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

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
