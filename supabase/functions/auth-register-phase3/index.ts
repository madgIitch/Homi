// supabase/functions/auth-register-phase3/index.ts  
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'  
import { corsHeaders, handleCORS } from '../_shared/cors.ts'  
import { Phase3Request, AuthResponse } from '../_shared/types.ts'  
  
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
  
    const body: Phase3Request = await req.json()  
      
    if (!body.temp_token || !body.birth_date) {  
      return new Response(  
        JSON.stringify({ error: 'Missing required fields' }),  
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }  
      )  
    }  
  
    // Validar formato de fecha  
    const birthDateRegex = /^\d{4}-\d{2}-\d{2}$/  
    if (!birthDateRegex.test(body.birth_date)) {  
      return new Response(  
        JSON.stringify({ error: 'Invalid birth_date format. Use YYYY-MM-DD' }),  
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }  
      )  
    }  
  
    const supabaseClient = createClient(  
      Deno.env.get('SUPABASE_URL') ?? '',  
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',  
      { auth: { autoRefreshToken: false, persistSession: false } }  
    )  
  
    // Obtener registro temporal completo  
    const { data: tempData, error: tempError } = await supabaseClient  
      .from('temp_registrations')  
      .select('*')  
      .eq('temp_token', body.temp_token)  
      .single()  
  
    if (tempError || !tempData) {  
      return new Response(  
        JSON.stringify({ error: 'Invalid or expired temporary token' }),  
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }  
      )  
    }  
  
    if (new Date(tempData.expires_at) < new Date()) {  
      return new Response(  
        JSON.stringify({ error: 'Temporary registration expired' }),  
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }  
      )  
    }  

    if (!tempData.gender) {  
      return new Response(  
        JSON.stringify({ error: 'Missing required gender' }),  
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }  
      )  
    }  
  
    if (tempData.is_google_user) {  
      // Para usuarios de Google, solo actualizar perfil  
      // TODO: Implementar actualización de perfil de Google  
      return new Response(  
        JSON.stringify({ error: 'Google user profile update not implemented yet' }),  
        { status: 501, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }  
      )  
    } else {  
      // Registro normal - crear usuario en Supabase Auth  
      const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({  
        email: tempData.email,  
        password: tempData.password,  
        email_confirm: true,  
        user_metadata: {  
          first_name: tempData.first_name,  
          last_name: tempData.last_name,  
          gender: tempData.gender  
        }  
      })  
  
      if (authError || !authData.user) {  
        console.error('Auth creation error:', authError)  
        return new Response(  
          JSON.stringify({ error: 'Failed to create user', details: authError?.message }),  
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }  
        )  
      }  
  
      // Crear registro en tabla users  
      const { error: userError } = await supabaseClient  
        .from('users')  
        .upsert(  
            {  
            id: authData.user.id,  
            email: tempData.email,  
            first_name: tempData.first_name,  
            last_name: tempData.last_name,  
            birth_date: body.birth_date,  
            gender: tempData.gender
            },  
            {  
            onConflict: 'id'  // Maneja duplicados  
            }  
        )
  
      if (userError) {  
        console.error('User table error:', userError)  
        // Rollback: eliminar usuario de Auth  
        await supabaseClient.auth.admin.deleteUser(authData.user.id)  
        return new Response(  
          JSON.stringify({ error: 'Failed to create user record' }),  
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }  
        )  
      }  
  
      // Crear perfil básico  
      await supabaseClient  
        .from('profiles')  
        .insert({ id: authData.user.id, gender: tempData.gender })  
  
      // Generar sesión  
      const anonClient = createClient(  
        Deno.env.get('SUPABASE_URL') ?? '',  
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',  
        { auth: { autoRefreshToken: false, persistSession: false } }  
      )  
  
      const { data: signInData, error: signInError } = await anonClient.auth.signInWithPassword({  
        email: tempData.email,  
        password: tempData.password  
      })  
  
      if (signInError || !signInData.session || !signInData.user) {  
        return new Response(  
          JSON.stringify({ error: 'User created but failed to generate session' }),  
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }  
        )  
      }  
  
      const response: AuthResponse = {  
        access_token: signInData.session.access_token,  
        token_type: 'bearer',  
        expires_in: 3600,  
        refresh_token: signInData.session.refresh_token ?? '',  
        user: {  
          id: signInData.user.id,  
          email: signInData.user.email!,  
          first_name: tempData.first_name,  
          last_name: tempData.last_name,  
          birth_date: body.birth_date,  
          gender: tempData.gender,  
          created_at: signInData.user.created_at  
        }  
      }  
  
      // Limpiar registro temporal  
      await supabaseClient  
        .from('temp_registrations')  
        .delete()  
        .eq('temp_token', body.temp_token)  
  
      return new Response(  
        JSON.stringify(response),  
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }  
      )  
    }  
  
  } catch (error) {  
    console.error('Phase3 registration error:', error)  
    return new Response(  
      JSON.stringify({ error: 'Internal server error' }),  
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }  
    )  
  }  
}  
  
Deno.serve(handler)

