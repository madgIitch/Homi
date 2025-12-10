// supabase/functions/interests/index.ts  
  
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'  
import { corsHeaders, handleCORS } from '../_shared/cors.ts'  
import { withAuth, getUserId, canAccessResource } from '../_shared/auth.ts'  
import {   
  Interes,   
  InteresCreateRequest,   
  ApiResponse,   
  JWTPayload   
} from '../_shared/types.ts'  
  
/**  
 * Edge Function para gestión de intereses en HomiMatch  
 * Maneja operaciones de like/unlike entre perfiles y habitaciones  
 */  
  
// Crear cliente de Supabase  
const supabaseClient = createClient(  
  Deno.env.get('SUPABASE_URL') ?? '',  
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''  
)  
  
/**  
 * Obtener perfil del usuario autenticado  
 */  
async function getUserProfile(userId: string): Promise<string | null> {  
  const { data, error } = await supabaseClient  
    .from('profiles')  
    .select('id')  
    .eq('user_id', userId)  
    .single()  
    
  if (error || !data) {  
    return null  
  }  
    
  return data.id  
}  
  
/**  
 * Obtener intereses del usuario (likes que ha dado)  
 */  
async function getUserInterests(profileId: string): Promise<Interes[]> {  
  const { data, error } = await supabaseClient  
    .from('intereses')  
    .select(`  
      *,  
      habitacion:habitaciones(*, piso:pisos(*))  
    `)  
    .eq('profile_id', profileId)  
    .order('created_at', { ascending: false })  
    
  if (error) {  
    throw new Error(`Failed to fetch interests: ${error.message}`)  
  }  
    
  return data as Interes[]  
}  
  
/**  
 * Obtener intereses recibidos (likes a habitaciones del usuario)  
 */  
async function getReceivedInterests(userId: string): Promise<Interes[]> {  
  const { data, error } = await supabaseClient  
    .from('intereses')  
    .select(`  
      *,  
      profile:profiles(*),  
      habitacion:habitaciones(*, piso:pisos(*))  
    `)  
    .eq('habitacion.owner_id', userId)  
    .order('created_at', { ascending: false })  
    
  if (error) {  
    throw new Error(`Failed to fetch received interests: ${error.message}`)  
  }  
    
  return data as Interes[]  
}  
  
/**  
 * Crear nuevo interés (like)  
 */  
async function createInterest(interestData: InteresCreateRequest): Promise<Interes> {  
  const { data, error } = await supabaseClient  
    .from('intereses')  
    .insert(interestData)  
    .select(`  
      *,  
      habitacion:habitaciones(*, piso:pisos(*))  
    `)  
    .single()  
    
  if (error) {  
    throw new Error(`Failed to create interest: ${error.message}`)  
  }  
    
  return data as Interes[]  
}  
  
/**  
 * Eliminar interés (unlike)  
 */  
async function deleteInterest(profileId: string, habitacionId: string): Promise<void> {  
  const { error } = await supabaseClient  
    .from('intereses')  
    .delete()  
    .eq('profile_id', profileId)  
    .eq('habitacion_id', habitacionId)  
    
  if (error) {  
    throw new Error(`Failed to delete interest: ${error.message}`)  
  }  
}  
  
/**  
 * Verificar si ya existe un interés  
 */  
async function checkExistingInterest(profileId: string, habitacionId: string): Promise<boolean> {  
  const { data, error } = await supabaseClient  
    .from('intereses')  
    .select('id')  
    .eq('profile_id', profileId)  
    .eq('habitacion_id', habitacionId)  
    .single()  
    
  return !error && data !== null  
}  
  
/**  
 * Validar datos de interés  
 */  
function validateInterestData(data: any): { isValid: boolean; errors: string[] } {  
  const errors: string[] = []  
    
  if (!data.profile_id || typeof data.profile_id !== 'string') {  
    errors.push('Profile ID is required')  
  }  
    
  if (!data.habitacion_id || typeof data.habitacion_id !== 'string') {  
    errors.push('Habitacion ID is required')  
  }  
    
  return {  
    isValid: errors.length === 0,  
    errors  
  }  
}  
  
/**  
 * Handler principal con autenticación  
 */  
const handler = withAuth(async (req: Request, payload: JWTPayload): Promise<Response> => {  
  const userId = getUserId(payload)  
  const url = new URL(req.url)  
  const method = req.method  
  const type = url.searchParams.get('type') // 'given' or 'received'  
  
  try {  
    // GET - Obtener intereses  
    if (method === 'GET') {  
      if (type === 'received') {  
        // Intereses recibidos (para landlords)  
        const interests = await getReceivedInterests(userId)  
        const response: ApiResponse<Interes[]> = { data: interests }  
        return new Response(  
          JSON.stringify(response),  
          {   
            status: 200,   
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }  
          }  
        )  
      } else {  
        // Intereses dados (para seekers)  
        const profileId = await getUserProfile(userId)  
        if (!profileId) {  
          return new Response(  
            JSON.stringify({ error: 'Profile not found' }),  
            {   
              status: 404,   
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }  
            }  
          )  
        }  
  
        const interests = await getUserInterests(profileId)  
        const response: ApiResponse<Interes[]> = { data: interests }  
        return new Response(  
          JSON.stringify(response),  
          {   
            status: 200,   
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }  
          }  
        )  
      }  
    }  
  
    // POST - Crear nuevo interés (like)  
    if (method === 'POST') {  
      const body: InteresCreateRequest = await req.json()  
        
      // Obtener profile_id del usuario autenticado  
      const profileId = await getUserProfile(userId)  
      if (!profileId) {  
        return new Response(  
          JSON.stringify({ error: 'Profile not found' }),  
          {   
            status: 404,   
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }  
          }  
        )  
      }  
  
      body.profile_id = profileId // Forzar el profile_id del token  
  
      const validation = validateInterestData(body)  
      if (!validation.isValid) {  
        return new Response(  
          JSON.stringify({   
            error: 'Validation failed',   
            details: validation.errors   
          }),  
          {   
            status: 400,   
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }  
          }  
        )  
      }  
  
      // Verificar que no sea propia habitación  
      const { data: habitacion } = await supabaseClient  
        .from('habitaciones')  
        .select('owner_id')  
        .eq('id', body.habitacion_id)  
        .single()  
  
      if (habitacion?.owner_id === userId) {  
        return new Response(  
          JSON.stringify({ error: 'Cannot like your own room' }),  
          {   
            status: 400,   
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }  
          }  
        )  
      }  
  
      // Verificar si ya existe el interés  
      const existing = await checkExistingInterest(body.profile_id, body.habitacion_id)  
      if (existing) {  
        return new Response(  
          JSON.stringify({ error: 'Interest already exists' }),  
          {   
            status: 409,   
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }  
          }  
        )  
      }  
  
      const interest = await createInterest(body)  
      const response: ApiResponse<Interes> = { data: interest }  
        
      return new Response(  
        JSON.stringify(response),  
        {   
          status: 201,   
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }  
        }  
      )  
    }  
  
    // DELETE - Eliminar interés (unlike)  
    if (method === 'DELETE') {  
      const habitacionId = url.searchParams.get('habitacion_id')  
        
      if (!habitacionId) {  
        return new Response(  
          JSON.stringify({ error: 'habitacion_id parameter is required' }),  
          {   
            status: 400,   
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }  
          }  
        )  
      }  
  
      const profileId = await getUserProfile(userId)  
      if (!profileId) {  
        return new Response(  
          JSON.stringify({ error: 'Profile not found' }),  
          {   
            status: 404,   
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }  
          }  
        )  
      }  
  
      await deleteInterest(profileId, habitacionId)  
        
      return new Response(  
        JSON.stringify({ message: 'Interest deleted successfully' }),  
        {   
          status: 200,   
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }  
        }  
      )  
    }  
  
    // Método no permitido  
    return new Response(  
      JSON.stringify({ error: 'Method not allowed' }),  
      {   
        status: 405,   
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }  
      }  
    )  
  
  } catch (error) {  
    console.error('Interests function error:', error)  
    return new Response(  
      JSON.stringify({   
        error: 'Internal server error',  
        details: error.message  
      }),  
      {   
        status: 500,   
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }  
      }  
    )  
  }  
})  
  
// Exportar handler para Deno  
Deno.serve(handler)