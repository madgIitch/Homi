// supabase/functions/matches/recommendations.ts  
  
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'  
import { corsHeaders } from '../_shared/cors.ts'  
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
 * Obtener matches del usuario (como user_a o como user_b)    
 */  
async function getUserMatches(userId: string): Promise<Match[]> {  
  const { data, error } = await supabaseClient  
    .from('matches')  
    .select(`  
      *,  
      user_a:profiles!matches_user_a_id_fkey(*),  
      user_b:profiles!matches_user_b_id_fkey(*)  
    `)  
    .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)  
    .order('matched_at', { ascending: false })  
      
  if (error) {  
    throw new Error(`Failed to fetch matches: ${error.message}`)  
  }  
      
  return data as Match[]  
}  
  
/**    
 * Crear nuevo match (cuando hay interés mutuo)    
 */  
async function createMatch(matchData: {  
  user_a_id: string,  
  user_b_id: string  
}): Promise<Match> {  
  const { data, error } = await supabaseClient  
    .from('matches')  
    .insert(matchData)  
    .select(`  
      *,  
      user_a:profiles!matches_user_a_id_fkey(*),  
      user_b:profiles!matches_user_b_id_fkey(*)  
    `)  
    .single()  
      
  if (error) {  
    throw new Error(`Failed to create match: ${error.message}`)  
  }  
      
  return data as Match  
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
      user_a:profiles!matches_user_a_id_fkey(*),  
      user_b:profiles!matches_user_b_id_fkey(*)  
    `)  
    .eq('id', matchId)  
    .single()  
      
  if (fetchError || !existingMatch) {  
    throw new Error('Match not found')  
  }  
      
  const userAId = existingMatch.user_a_id  
  const userBId = existingMatch.user_b_id  
      
  if (userId !== userAId && userId !== userBId) {  
    throw new Error('Unauthorized: You can only update matches you participate in')  
  }  
  
  const { data, error } = await supabaseClient  
    .from('matches')  
    .update(updates)  
    .eq('id', matchId)  
    .select(`  
      *,  
      user_a:profiles!matches_user_a_id_fkey(*),  
      user_b:profiles!matches_user_b_id_fkey(*)  
    `)  
    .single()  
      
  if (error) {  
    throw new Error(`Failed to update match: ${error.message}`)  
  }  
      
  return data as Match  
}  
  
/**    
 * Validar datos de match    
 */  
function validateMatchData(data: any): { isValid: boolean; errors: string[] } {  
  const errors: string[] = []  
      
  if (!data.user_a_id || typeof data.user_a_id !== 'string') {  
    errors.push('User A ID is required')  
  }  
      
  if (!data.user_b_id || typeof data.user_b_id !== 'string') {  
    errors.push('User B ID is required')  
  }  
      
  if (data.user_a_id === data.user_b_id) {  
    errors.push('User A and User B cannot be the same')  
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
 * Verificar si ya existe un match (en cualquier dirección)    
 */  
async function checkExistingMatch(userAId: string, userBId: string): Promise<boolean> {  
  const { data, error } = await supabaseClient  
    .from('matches')  
    .select('id')  
    .or(`(user_a_id.eq.${userAId},user_b_id.eq.${userBId}),(user_a_id.eq.${userBId},user_b_id.eq.${userAId})`)  
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
          
      const matchData = {  
        user_a_id: userId,  
        user_b_id: body.user_b_id  
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
  
      // Verificar si ya existe el match  
      const existing = await checkExistingMatch(matchData.user_a_id, matchData.user_b_id)  
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