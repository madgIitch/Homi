// supabase/functions/auth-check-email/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, handleCORS } from '../_shared/cors.ts'

interface CheckEmailRequest {
  email: string
}

interface CheckEmailResponse {
  exists: boolean
  email: string
}

async function handler(req: Request): Promise<Response> {
  const corsResponse = handleCORS(req)
  if (corsResponse) return corsResponse

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body: CheckEmailRequest = await req.json()
    
    if (!body.email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(body.email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const normalizedEmail = body.email.trim().toLowerCase()

    // Verificar si el email existe en auth.users
    const { data: authUsers, error: authError } = await supabaseClient.auth.admin.listUsers()
    
    if (authError) {
      console.error('Error checking auth users:', authError)
      return new Response(
        JSON.stringify({ error: 'Failed to check email' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Buscar si el email existe en los usuarios autenticados
    const emailExists = authUsers.users.some(
      user => user.email?.toLowerCase() === normalizedEmail
    )

    const response: CheckEmailResponse = {
      exists: emailExists,
      email: normalizedEmail
    }

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Check email error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

Deno.serve(handler)
