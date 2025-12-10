// supabase/functions/matches/index.ts  
  
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'  
import { corsHeaders, handleCORS } from '../_shared/cors.ts'  
import { withAuth, getUserId } from '../_shared/auth.ts'  
import {   
  Match,   
  ApiResponse,   
  JWTPayload   
} from '../_shared/types.ts'  
  
/**  
 * Edge Function para gestión de matches en HomiMatch  
 * Maneja operaciones CRUD para matches entre usuarios  
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
 * Obtener matches del usuario (como seeker o como room owner)  
 */  
async function getUserMatches(userId: string): Promise<Match[]> {  
  const { data, error } = await supabaseClient  
    .from('matches')  
    .select(`  
      *,  
      seeker_profile:profiles!matches_seeker_profile_id_fkey(*),  
      habitacion:habitaciones(*, piso:pisos(*), owner:profiles!habitaciones_owner_id_fkey(*))  
    `)  
    .or(`seeker_profile.user_id.eq.${userId},habitacion.owner_id.eq.${userId}`)  
    .order('created_at', { ascending: false })  
    
  if (error) {  
    throw new Error(`Failed to fetch matches: ${error.message}`)  
  }  
    
  return data as Match[]  
}  
  
/**  
 * Crear nuevo match (cuando hay interés mutuo)  
 */  
async function createMatch(matchData: {  
  seeker_profile_id: string,  
  habitacion_id: string  
}): Promise<Match> {  
  const { data, error } = await supabaseClient  
    .from('matches')  
    .insert(matchData)  
    .select(`  
      *,  
      seeker_profile:profiles!matches_seeker_profile_id_fkey(*),  
      habitacion:habitaciones(*, piso:pisos(*), owner:profiles!habitaciones_owner_id_fkey(*))  
    `)  
    .single()  
    
  if (error) {  
    throw new Error(`Failed to create match: ${error.message}`)  
  }  
    
  return data as Match[]  
}  
  
/**  
 * Actualizar estado de un match existente  
 */  
async function updateMatch(matchId: string, userId: string, updates: Partial<Match>): Promise<Match> {  
  // Verificar que el usuario es parte del match  
  const { data: existingMatch, error: fetchError } = await supabaseClient  
    .from('matches')  
    .select(`  
      *,  
      seeker_profile:profiles!matches_seeker_profile_id_fkey(*),  
      habitacion:habitaciones(*)  
    `)  
    .eq('id', matchId)  
    .single()  
    
  if (fetchError || !existingMatch) {  
    throw new Error('Match not found')  
  }  
    
  const seekerUserId = existingMatch.seeker_profile.user_id  
  const roomOwnerId = existingMatch.habitacion.owner_id  
    
  if (userId !== seekerUserId && userId !== roomOwnerId) {  
    throw new Error('Unauthorized: You can only update matches you participate in')  
  }  
  
  const { data, error } = await supabaseClient  
    .from('matches')  
    .update(updates)  
    .eq('id', matchId)  
    .select(`  
      *,  
      seeker_profile:profiles!matches_seeker_profile_id_fkey(*),  
      habitacion:habitaciones(*, piso:pisos(*), owner:profiles!habitaciones_owner_id_fkey(*))  
    `)  
    .single()  
    
  if (error) {  
    throw new Error(`Failed to update match: ${error.message}`)  
  }  
    
  return data as Match[]  
}  
  
/**  
 * Validar datos de match  
 */  
function validateMatchData(data: any): { isValid: boolean; errors: string[] } {  
  const errors: string[] = []  
    
  if (!data.seeker_profile_id || typeof data.seeker_profile_id !== 'string') {  
    errors.push('Seeker profile ID is required')  
  }  
    
  if (!data.habitacion_id || typeof data.habitacion_id !== 'string') {  
    errors.push('Habitacion ID is required')  
  }  
    
  if (data.status && !['pending', 'accepted', 'rejected'].includes(data.status)) {  
    errors.push('Invalid status value')  
  }  
    
  return {  
    isValid: errors.length === 0,  
    errors  
  }  
}  
  
/**  
 * Verificar si ya existe un match  
 */  
async function checkExistingMatch(seekerProfileId: string, habitacionId: string): Promise<boolean> {  
  const { data, error } = await supabaseClient  
    .from('matches')  
    .select('id')  
    .eq('seeker_profile_id', seekerProfileId)  
    .eq('habitacion_id', habitacionId)  
    .single()  
    
  return !error && data !== null  
}  
  
/**  
 * Handler principal con autenticación  
 */  
const handler = withAuth(async (req: Request, payload: JWTPayload): Promise<Response> => {  
  const userId = getUserId(payload)  
  const url = new URL(req.url)  
  const method = req.method  
  
  try {  
    // GET - Obtener matches del usuario  
    if (method === 'GET') {  
      const matches = await getUserMatches(userId)  
      const response: ApiResponse<Match[]> = { data: matches }  
      return new Response(  
        JSON.stringify(response),  
        {   
          status: 200,   
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }  
        }  
      )  
    }  
  
    // POST - Crear nuevo match  
    if (method === 'POST') {  
      const body = await req.json()  
        
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
  
      const matchData = {  
        seeker_profile_id: profileId,  
        habitacion_id: body.habitacion_id  
      }  
  
      const validation = validateMatchData(matchData)  
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
          JSON.stringify({ error: 'Cannot create match with your own room' }),  
          {   
            status: 400,   
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }  
          }  
        )  
      }  
  
      // Verificar si ya existe el match  
      const existing = await checkExistingMatch(matchData.seeker_profile_id, matchData.habitacion_id)  
      if (existing) {  
        return new Response(  
          JSON.stringify({ error: 'Match already exists' }),  
          {   
            status: 409,   
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }  
          }  
        )  
      }  
  
      const match = await createMatch(matchData)  
      const response: ApiResponse<Match> = { data: match }  
        
      return new Response(  
        JSON.stringify(response),  
        {   
          status: 201,   
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }  
        }  
      )  
    }  
  
    // PATCH - Actualizar estado de un match  
    if (method === 'PATCH') {  
      const matchId = url.searchParams.get('id')  
        
      if (!matchId) {  
        return new Response(  
          JSON.stringify({ error: 'Match ID parameter is required' }),  
          {   
            status: 400,   
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }  
          }  
        )  
      }  
  
      const updates = await req.json()  
        
      // Solo permitir actualizar el status  
      if (updates.status && !['pending', 'accepted', 'rejected'].includes(updates.status)) {  
        return new Response(  
          JSON.stringify({ error: 'Invalid status value' }),  
          {   
            status: 400,   
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }  
          }  
        )  
      }  
  
      const updatedMatch = await updateMatch(matchId, userId, updates)  
      const response: ApiResponse<Match> = { data: updatedMatch }  
        
      return new Response(  
        JSON.stringify(response),  
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
    console.error('Matches function error:', error)  
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