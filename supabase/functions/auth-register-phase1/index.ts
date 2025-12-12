// supabase/functions/auth-register-phase1/index.ts  
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'  
import { corsHeaders, handleCORS } from '../_shared/cors.ts'  
import { Phase1Request, TempRegistrationResponse } from '../_shared/types.ts'  
  
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
  
    const body: Phase1Request = await req.json()  
      
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
  
    // Generar token temporal único  
    const tempToken = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`  
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 horas  
  
    // Guardar en tabla temporal  
    const { error } = await supabaseClient  
      .from('temp_registrations')  
      .insert({  
        temp_token: tempToken,  
        email: body.email,  
        password: body.password,  
        is_google_user: body.is_google_user || false,  
        expires_at: expiresAt.toISOString()  
      })  
  
    if (error) {  
      console.error('Error saving temp registration:', error)  
      return new Response(  
        JSON.stringify({ error: 'Failed to save temporary registration' }),  
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }  
      )  
    }  
  
    const response: TempRegistrationResponse = {  
      temp_token: tempToken,  
      email: body.email,  
      expires_at: expiresAt.toISOString()  
    }  
  
    return new Response(  
      JSON.stringify(response),  
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }  
    )  
  
  } catch (error) {  
    console.error('Phase1 registration error:', error)  
    return new Response(  
      JSON.stringify({ error: 'Internal server error' }),  
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }  
    )  
  }  
}  
  
Deno.serve(handler)