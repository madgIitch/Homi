// supabase/functions/interests/index.ts  
  
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'  
import { corsHeaders } from '../_shared/cors.ts'  
import { withAuth, getUserId } from '../_shared/auth.ts'  
import {     
  RoomInterest,     
  RoomInterestCreateRequest,     
  ApiResponse,     
  JWTPayload     
} from '../_shared/types.ts'  
  
/**    
 * Edge Function para gestión de intereses en HomiMatch    
 * Maneja operaciones de like/unlike entre usuarios y habitaciones    
 */  
  
// Crear cliente de Supabase  
const supabaseClient = createClient(  
  Deno.env.get('SUPABASE_URL') ?? '',  
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''  
)  
  
interface InterestValidationData {  
  room_id: string  
  message?: string  
} 

/**    
 * Obtener intereses del usuario (likes que ha dado)    
 */  
async function getUserInterests(userId: string): Promise<RoomInterest[]> {  
  const { data, error } = await supabaseClient  
    .from('room_interests')  
    .select(`  
      *,  
      room:rooms(*, flat:flats(*))  
    `)  
    .eq('user_id', userId)  
    .order('created_at', { ascending: false })  
      
  if (error) {  
    throw new Error(`Failed to fetch interests: ${error.message}`)  
  }  
      
  return data as RoomInterest[]  
}  
  
/**    
 * Obtener intereses recibidos (likes a habitaciones del usuario)    
 */  
async function getReceivedInterests(userId: string): Promise<RoomInterest[]> {  
  const { data, error } = await supabaseClient  
    .from('room_interests')  
    .select(`  
      *,  
      user:profiles(*),  
      room:rooms(*, flat:flats(*))  
    `)  
    .eq('room.owner_id', userId)  
    .order('created_at', { ascending: false })  
      
  if (error) {  
    throw new Error(`Failed to fetch received interests: ${error.message}`)  
  }  
      
  return data as RoomInterest[]  
}  
  
/**    
 * Crear nuevo interés (like)    
 */  
async function createInterest(interestData: RoomInterestCreateRequest): Promise<RoomInterest> {  
  const { data, error } = await supabaseClient  
    .from('room_interests')  
    .insert(interestData)  
    .select(`  
      *,  
      room:rooms(*, flat:flats(*))  
    `)  
    .single()  
      
  if (error) {  
    throw new Error(`Failed to create interest: ${error.message}`)  
  }  
      
  return data as RoomInterest  
}  
  
/**    
 * Eliminar interés (unlike)    
 */  
async function deleteInterest(userId: string, roomId: string): Promise<void> {  
  const { error } = await supabaseClient  
    .from('room_interests')  
    .delete()  
    .eq('user_id', userId)  
    .eq('room_id', roomId)  
      
  if (error) {  
    throw new Error(`Failed to delete interest: ${error.message}`)  
  }  
}  
  
/**    
 * Verificar si ya existe un interés    
 */  
async function checkExistingInterest(userId: string, roomId: string): Promise<boolean> {  
  const { data, error } = await supabaseClient  
    .from('room_interests')  
    .select('id')  
    .eq('user_id', userId)  
    .eq('room_id', roomId)  
    .single()  
      
  return !error && data !== null  
}  
  
/**    
 * Validar datos de interés    
 */  
function validateInterestData(data: InterestValidationData): { isValid: boolean; errors: string[] } {  
  const errors: string[] = []  
      
  if (!data.room_id || typeof data.room_id !== 'string') {  
    errors.push('Room ID is required')  
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
        const response: ApiResponse<RoomInterest[]> = { data: interests }  
        return new Response(  
          JSON.stringify(response),  
          {     
            status: 200,     
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }  
          }  
        )  
      } else {  
        // Intereses dados (para seekers)  
        const interests = await getUserInterests(userId)  
        const response: ApiResponse<RoomInterest[]> = { data: interests }  
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
      const body: RoomInterestCreateRequest = await req.json()  
          
      // Forzar el user_id del token  
      body.user_id = userId  
  
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
      const { data: room } = await supabaseClient  
        .from('rooms')  
        .select('owner_id')  
        .eq('id', body.room_id)  
        .single()  
  
      if (room?.owner_id === userId) {  
        return new Response(  
          JSON.stringify({ error: 'Cannot like your own room' }),  
          {     
            status: 400,     
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }  
          }  
        )  
      }  
  
      // Verificar si ya existe el interés  
      const existing = await checkExistingInterest(body.user_id, body.room_id)  
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
      const response: ApiResponse<RoomInterest> = { data: interest }  
          
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
      const roomId = url.searchParams.get('room_id')  
          
      if (!roomId) {  
        return new Response(  
          JSON.stringify({ error: 'room_id parameter is required' }),  
          {     
            status: 400,     
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }  
          }  
        )  
      }  
  
      await deleteInterest(userId, roomId)  
          
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
})  
  
// Exportar handler para Deno  
Deno.serve(handler)