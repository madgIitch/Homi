// supabase/functions/rooms/index.ts  
  
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'  
import { corsHeaders } from '../_shared/cors.ts'  
import { withAuth, getUserId } from '../_shared/auth.ts'  
import {     
  Flat,     
  Room,     
  FlatCreateRequest,     
  RoomCreateRequest,    
  ApiResponse,     
  JWTPayload,    
} from '../_shared/types.ts'  
  
/**    
 * Edge Function para gestión de flats y rooms en HomiMatch    
 * Maneja CRUD operations para propiedades y listados de habitaciones    
 */  
  
// Crear cliente de Supabase  
const supabaseClient = createClient(  
  Deno.env.get('SUPABASE_URL') ?? '',  
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''  
)  
  
/**    
 * Obtener flats del usuario autenticado    
 */  
async function getUserFlats(userId: string): Promise<Flat[]> {  
  const { data, error } = await supabaseClient  
    .from('flats')  
    .select('*')  
    .eq('owner_id', userId)  
    .order('created_at', { ascending: false })  
      
  if (error) {  
    throw new Error(`Failed to fetch flats: ${error.message}`)  
  }  
      
  return data as Flat[]  
}  
  
/**    
 * Obtener rooms del usuario autenticado    
 */  
async function getUserRooms(userId: string): Promise<Room[]> {  
  const { data, error } = await supabaseClient  
    .from('rooms')  
    .select(`  
      *,  
      flat:flats(*)  
    `)  
    .eq('owner_id', userId)  
    .order('created_at', { ascending: false })  
      
  if (error) {  
    throw new Error(`Failed to fetch rooms: ${error.message}`)  
  }  
      
  return data as Room[]  
}  
  
/**    
 * Crear nuevo flat    
 */  
async function createFlat(flatData: FlatCreateRequest): Promise<Flat> {  
  const { data, error } = await supabaseClient  
    .from('flats')  
    .insert(flatData)  
    .select()  
    .single()  
      
  if (error) {  
    throw new Error(`Failed to create flat: ${error.message}`)  
  }  
      
  return data as Flat  
}  
  
/**    
 * Crear nuevo room    
 */  
async function createRoom(roomData: RoomCreateRequest): Promise<Room> {  
  const { data, error } = await supabaseClient  
    .from('rooms')  
    .insert(roomData)  
    .select(`  
      *,  
      flat:flats(*)  
    `)  
    .single()  
      
  if (error) {  
    throw new Error(`Failed to create room: ${error.message}`)  
  }  
      
  return data as Room  
}  
  
/**    
 * Actualizar flat existente    
 */  
async function updateFlat(flatId: string, userId: string, updates: Partial<Flat>): Promise<Flat> {  
  // Verificar que el usuario es el propietario  
  const { data: existingFlat, error: fetchError } = await supabaseClient  
    .from('flats')  
    .select('*')  
    .eq('id', flatId)  
    .single()  
      
  if (fetchError || !existingFlat) {  
    throw new Error('Flat not found')  
  }  
      
  if (existingFlat.owner_id !== userId) {  
    throw new Error('Unauthorized: You can only update your own flats')  
  }  
  
  const { data, error } = await supabaseClient  
    .from('flats')  
    .update(updates)  
    .eq('id', flatId)  
    .select()  
    .single()  
      
  if (error) {  
    throw new Error(`Failed to update flat: ${error.message}`)  
  }  
      
  return data as Flat  
}  
  
/**    
 * Actualizar room existente    
 */  
async function updateRoom(roomId: string, userId: string, updates: Partial<Room>): Promise<Room> {  
  // Verificar que el usuario es el propietario  
  const { data: existingRoom, error: fetchError } = await supabaseClient  
    .from('rooms')  
    .select('*')  
    .eq('id', roomId)  
    .single()  
      
  if (fetchError || !existingRoom) {  
    throw new Error('Room not found')  
  }  
      
  if (existingRoom.owner_id !== userId) {  
    throw new Error('Unauthorized: You can only update your own rooms')  
  }  
  
  const { data, error } = await supabaseClient  
    .from('rooms')  
    .update(updates)  
    .eq('id', roomId)  
    .select(`  
      *,  
      flat:flats(*)  
    `)  
    .single()  
      
  if (error) {  
    throw new Error(`Failed to update room: ${error.message}`)  
  }  
      
  return data as Room  
}  
  
/**    
 * Validar datos de flat    
 */  
function validateFlatData(data: any): { isValid: boolean; errors: string[] } {  
  const errors: string[] = []  
      
  if (!data.address || typeof data.address !== 'string' || data.address.trim().length < 5) {  
    errors.push('Address must be at least 5 characters long')  
  }  
      
  if (!data.city || typeof data.city !== 'string' || data.city.trim().length < 2) {  
    errors.push('City is required')  
  }  
      
  if (data.total_rooms && (typeof data.total_rooms !== 'number' || data.total_rooms < 1 || data.total_rooms > 20)) {  
    errors.push('Total rooms must be between 1 and 20')  
  }  
      
  return {  
    isValid: errors.length === 0,  
    errors  
  }  
}  
  
/**    
 * Validar datos de room    
 */  
function validateRoomData(data: any): { isValid: boolean; errors: string[] } {  
  const errors: string[] = []  
      
  if (!data.flat_id || typeof data.flat_id !== 'string') {  
    errors.push('Flat ID is required')  
  }  
      
  if (!data.price_per_month || typeof data.price_per_month !== 'number' || data.price_per_month < 0) {  
    errors.push('Price per month must be a positive number')  
  }  
      
  if (!data.available_from) {  
    errors.push('Available from date is required')  
  }  
      
  if (data.size_m2 && (typeof data.size_m2 !== 'number' || data.size_m2 < 5)) {  
    errors.push('Size m2 must be at least 5')  
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
  const pathParts = url.pathname.split('/')  
  
  try {  
    // GET - Obtener flats y rooms del usuario  
    if (method === 'GET') {  
      const type = url.searchParams.get('type') // 'flats' or 'rooms'  
          
      if (type === 'flats') {  
        const flats = await getUserFlats(userId)  
        const response: ApiResponse<Flat[]> = { data: flats }  
        return new Response(  
          JSON.stringify(response),  
          {     
            status: 200,     
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }  
          }  
        )  
      }  
          
      if (type === 'rooms' || !type) {  
        const rooms = await getUserRooms(userId)  
        const response: ApiResponse<Room[]> = { data: rooms }  
        return new Response(  
          JSON.stringify(response),  
          {     
            status: 200,     
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }  
          }  
        )  
      }  
    }  
  
    // POST - Crear nuevo flat o room  
    if (method === 'POST') {  
      const body = await req.json()  
      const type = url.searchParams.get('type') // 'flat' or 'room'  
          
      if (type === 'flat') {  
        const flatData: FlatCreateRequest = {  
          ...body,  
          owner_id: userId // Forzar el owner_id del token  
        }  
  
        const validation = validateFlatData(flatData)  
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
  
        const flat = await createFlat(flatData)  
        const response: ApiResponse<Flat> = { data: flat }  
            
        return new Response(  
          JSON.stringify(response),  
          {     
            status: 201,     
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }  
          }  
        )  
      }  
          
      if (type === 'room') {  
        const roomData: RoomCreateRequest = {  
          ...body,  
          owner_id: userId // Forzar el owner_id del token  
        }  
  
        const validation = validateRoomData(roomData)  
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
  
        const room = await createRoom(roomData)  
        const response: ApiResponse<Room> = { data: room }  
            
        return new Response(  
          JSON.stringify(response),  
          {     
            status: 201,     
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }  
          }  
        )  
      }  
    }  
  
    // PATCH - Actualizar flat o room existente  
    if (method === 'PATCH') {  
      const resourceId = pathParts[pathParts.length - 1]  
      const type = url.searchParams.get('type') // 'flat' or 'room'  
      const updates = await req.json()  
          
      // No permitir cambiar owner_id  
      delete updates.owner_id  
      delete updates.id  
      delete updates.created_at  
          
      if (type === 'flat') {  
        const validation = validateFlatData(updates)  
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
  
        const updatedFlat = await updateFlat(resourceId, userId, updates)  
        const response: ApiResponse<Flat> = { data: updatedFlat }  
            
        return new Response(  
          JSON.stringify(response),  
          {     
            status: 200,     
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }  
          }  
        )  
      }  
          
      if (type === 'room') {  
        const validation = validateRoomData(updates)  
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
  
        const updatedRoom = await updateRoom(resourceId, userId, updates)  
        const response: ApiResponse<Room> = { data: updatedRoom }  
            
        return new Response(  
          JSON.stringify(response),  
          {     
            status: 200,     
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }  
          }  
        )  
      }  
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
    console.error('Rooms function error:', error)  
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