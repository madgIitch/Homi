// supabase/functions/auth-register-phase2/index.ts  
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'  
import { corsHeaders, handleCORS } from '../_shared/cors.ts'  
import { Phase2Request } from '../_shared/types.ts'  
  
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
  
    const body: Phase2Request = await req.json()  
      
    if (!body.temp_token || !body.first_name || !body.last_name || !body.gender) {  
      return new Response(  
        JSON.stringify({ error: 'Missing required fields' }),  
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }  
      )  
    }  
  
    const supabaseClient = createClient(  
      Deno.env.get('SUPABASE_URL') ?? '',  
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',  
      { auth: { autoRefreshToken: false, persistSession: false } }  
    )  
  
    // Verificar y obtener registro temporal  
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
  
    // Verificar si no ha expirado  
    if (new Date(tempData.expires_at) < new Date()) {  
      return new Response(  
        JSON.stringify({ error: 'Temporary registration expired' }),  
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }  
      )  
    }  
  
    // Actualizar registro temporal con nombre  
    const { error: updateError } = await supabaseClient  
      .from('temp_registrations')  
      .update({  
        first_name: body.first_name,  
        last_name: body.last_name,  
        gender: body.gender  
      })  
      .eq('temp_token', body.temp_token)  
  
    if (updateError) {  
      console.error('Error updating temp registration:', updateError)  
      return new Response(  
        JSON.stringify({ error: 'Failed to update registration' }),  
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }  
      )  
    }  
  
    return new Response(  
      JSON.stringify({ message: 'Phase 2 completed successfully' }),  
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }  
    )  
  
  } catch (error) {  
    console.error('Phase2 registration error:', error)  
    return new Response(  
      JSON.stringify({ error: 'Internal server error' }),  
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }  
    )  
  }  
}  
  
Deno.serve(handler)
