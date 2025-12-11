// supabase/functions/auth/index.ts  
  
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'  
import { corsHeaders, handleCORS } from '../_shared/cors.ts'  
import { AuthSignupRequest, AuthResponse } from '../_shared/types.ts'  
  
/**      
 * Edge Function para registro de usuarios en HomiMatch      
 * Crea usuario en Supabase Auth y registros en tablas users/profiles      
 */  
async function handler(req: Request): Promise<Response> {  
  // Manejar CORS preflight  
  const corsResponse = handleCORS(req)  
  if (corsResponse) return corsResponse  
  
  try {  
    // Validar método HTTP  
    if (req.method !== 'POST') {  
      return new Response(  
        JSON.stringify({ error: 'Method not allowed' }),  
        {       
          status: 405,       
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }  
        }  
      )  
    }  
  
    // Parsear y validar request body  
    const body: AuthSignupRequest = await req.json()  
    console.log('📥 Register Edge Function - Request body:', {  
      email: body.email,  
      password: body.password ? '***' : 'vacío',  
      data: body.data  
    });           
  
    if (!body.email || !body.password || !body.data?.first_name || !body.data?.last_name || !body.data?.birth_date) {  
      return new Response(  
        JSON.stringify({       
          error: 'Missing required fields',  
          details: 'email, password, first_name, last_name, and birth_date are required'  
        }),  
        {       
          status: 400,       
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }  
        }  
      )  
    }  
  
    // Validar formato de email  
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/  
    if (!emailRegex.test(body.email)) {  
      return new Response(  
        JSON.stringify({ error: 'Invalid email format' }),  
        {       
          status: 400,       
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }  
        }  
      )  
    }  
  
    // Validar longitud de contraseña  
    if (body.password.length < 6) {  
      return new Response(  
        JSON.stringify({ error: 'Password must be at least 6 characters' }),  
        {       
          status: 400,       
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }  
        }  
      )  
    }  
  
    // Validar formato de fecha de nacimiento  
    const birthDateRegex = /^\d{4}-\d{2}-\d{2}$/  
    if (!birthDateRegex.test(body.data.birth_date)) {  
      return new Response(  
        JSON.stringify({ error: 'Invalid birth_date format. Use YYYY-MM-DD' }),  
        {       
          status: 400,       
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }  
        }  
      )  
    }  
  
    // Crear cliente de Supabase  
    const supabaseClient = createClient(  
      Deno.env.get('SUPABASE_URL') ?? '',  
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',  
      
      {  
        auth: {  
          autoRefreshToken: false,  
          persistSession: false  
        }  
      }  
    )  
  
    // 1. Crear usuario en Supabase Auth  
    const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({  
      email: body.email,  
      password: body.password,  
      email_confirm: true,  
      user_metadata: {  
        first_name: body.data.first_name,  
        last_name: body.data.last_name  
      }  
    })  
      
    console.log('🔐 Auth creation result:', {  
      success: !authError,  
      userId: authData?.user?.id,  
      error: authError?.message  
    });  
  
    if (authError || !authData.user) {  
      console.error('Auth error:', authError)  
      return new Response(  
        JSON.stringify({       
          error: 'Failed to create user',  
          details: authError?.message  
        }),  
        {       
          status: 500,       
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }  
        }  
      )  
    }  
  
    // 2. Crear registro en tabla users  
    const { error: userError } = await supabaseClient
      .from('users')
      .upsert(
        {
          id: authData.user.id,
          email: body.email,
          first_name: body.data.first_name,
          last_name: body.data.last_name,
          identity_document: body.data.identity_document,
          birth_date: body.data.birth_date
        },
        {
          onConflict: 'id'   // clave primaria
        }
      )  
        
        
      console.log('💾 Users table insert result:', {  
        success: !userError,  
        error: userError?.message  
      });  
  
    if (userError) {  
      console.error('User table error:', userError)  
      // Intentar rollback: eliminar usuario de Auth  
      await supabaseClient.auth.admin.deleteUser(authData.user.id)  
            
      return new Response(  
        JSON.stringify({       
          error: 'Failed to create user record',  
          details: userError.message  
        }),  
        {       
          status: 500,       
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }  
        }  
      )  
    }  
  
    // 3. Crear perfil básico (opcional - puede ser completado después)  
    const { error: profileError } = await supabaseClient  
      .from('profiles')  
      .insert({  
        id: authData.user.id  
      })  
  
    if (profileError) {  
      console.error('Profile creation warning:', profileError)  
      // No es crítico, continuamos  
    }  
  
    // 4. Generar tokens para respuesta  
    // 4. Generar sesión iniciando sesión con email y password
const anonClient = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

const { data: signInData, error: signInError } = await anonClient.auth.signInWithPassword({
  email: body.email,
  password: body.password
})

if (signInError || !signInData.session || !signInData.user) {
  console.error('Session generation error:', signInError)
  return new Response(
    JSON.stringify({
      error: 'User created but failed to generate session',
      user_id: authData.user.id
    }),
    {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )
}

const { session, user } = signInData

const response: AuthResponse = {
  access_token: session.access_token,
  token_type: 'bearer',
  // si session.expires_in no viene, puedes forzar 3600
  expires_in: (session as any).expires_in ?? 3600,
  refresh_token: session.refresh_token ?? '',
  user: {
    id: user.id,
    email: user.email!,
    first_name: body.data.first_name,
    last_name: body.data.last_name,
    identity_document: body.data.identity_document,
    birth_date: body.data.birth_date,
    created_at: user.created_at
  }
}

return new Response(
  JSON.stringify(response),
  {
    status: 201,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  }
)
 
  
  } catch (error) {  
    console.error('Register function error:', error)  
    const errorMessage = error instanceof Error ? error.message : String(error)  
    return new Response(  
      JSON.stringify({       
        error: 'Internal server error',  
        details: errorMessage  
      }),  
      {       
        status: 500,       
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }  
      }  
    )  
  }  
}  
  
// Exportar handler para Deno  
Deno.serve(handler)