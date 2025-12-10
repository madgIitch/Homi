// supabase/functions/rooms/index.ts  
  
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'  
import { corsHeaders, handleCORS } from '../_shared/cors.ts'  
import { withAuth, getUserId, canAccessResource } from '../_shared/auth.ts'  
import {   
  Piso,   
  Habitacion,   
  PisoCreateRequest,   
  HabitacionCreateRequest,  
  ApiResponse,   
  JWTPayload,  
  RoomFilters  
} from '../_shared/types.ts'  
  
/**  
 * Edge Function para gestión de pisos y habitaciones en HomiMatch  
 * Maneja CRUD operations para propiedades y listados de habitaciones  
 */  
  
// Crear cliente de Supabase  
const supabaseClient = createClient(  
  Deno.env.get('SUPABASE_URL') ?? '',  
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''  
)  
  
/**  
 * Obtener pisos del usuario autenticado  
 */  
async function getUserPisos(userId: string): Promise<Piso[]> {  
  const { data, error } = await supabaseClient  
    .from('pisos')  
    .select('*')  
    .eq('owner_id', userId)  
    .order('created_at', { ascending: false })  
    
  if (error) {  
    throw new Error(`Failed to fetch pisos: ${error.message}`)  
  }  
    
  return data as Piso[]  
}  
  
/**  
 * Obtener habitaciones del usuario autenticado  
 */  
async function getUserHabitaciones(userId: string): Promise<Habitacion[]> {  
  const { data, error } = await supabaseClient  
    .from('habitaciones')  
    .select(`  
      *,  
      piso:pisos(*)  
    `)  
    .eq('owner_id', userId)  
    .order('created_at', { ascending: false })  
    
  if (error) {  
    throw new Error(`Failed to fetch habitaciones: ${error.message}`)  
  }  
    
  return data as Habitacion[]  
}  
  
/**  
 * Crear nuevo piso  
 */  
async function createPiso(pisoData: PisoCreateRequest): Promise<Piso> {  
  const { data, error } = await supabaseClient  
    .from('pisos')  
    .insert(pisoData)  
    .select()  
    .single()  
    
  if (error) {  
    throw new Error(`Failed to create piso: ${error.message}`)  
  }  
    
  return data as Piso  
}  
  
/**  
 * Crear nueva habitación  
 */  
async function createHabitacion(habitacionData: HabitacionCreateRequest): Promise<Habitacion> {  
  const { data, error } = await supabaseClient  
    .from('habitaciones')  
    .insert(habitacionData)  
    .select(`  
      *,  
      piso:pisos(*)  
    `)  
    .single()  
    
  if (error) {  
    throw new Error(`Failed to create habitacion: ${error.message}`)  
  }  
    
  return data as Habitacion  
}  
  
/**  
 * Actualizar piso existente  
 */  
async function updatePiso(pisoId: string, userId: string, updates: Partial<Piso>): Promise<Piso> {  
  // Verificar que el usuario es el propietario  
  const { data: existingPiso, error: fetchError } = await supabaseClient  
    .from('pisos')  
    .select('*')  
    .eq('id', pisoId)  
    .single()  
    
  if (fetchError || !existingPiso) {  
    throw new Error('Piso not found')  
  }  
    
  if (!canAccessResource({ sub: userId } as JWTPayload, existingPiso.owner_id)) {  
    throw new Error('Unauthorized: You can only update your own pisos')  
  }  
  
  const { data, error } = await supabaseClient  
    .from('pisos')  
    .update(updates)  
    .eq('id', pisoId)  
    .select()  
    .single()  
    
  if (error) {  
    throw new Error(`Failed to update piso: ${error.message}`)  
  }  
    
  return data as Piso  
}  
  
/**  
 * Actualizar habitación existente  
 */  
async function updateHabitacion(habitacionId: string, userId: string, updates: Partial<Habitacion>): Promise<Habitacion> {  
  // Verificar que el usuario es el propietario  
  const { data: existingHabitacion, error: fetchError } = await supabaseClient  
    .from('habitaciones')  
    .select('*')  
    .eq('id', habitacionId)  
    .single()  
    
  if (fetchError || !existingHabitacion) {  
    throw new Error('Habitacion not found')  
  }  
    
  if (!canAccessResource({ sub: userId } as JWTPayload, existingHabitacion.owner_id)) {  
    throw new Error('Unauthorized: You can only update your own habitaciones')  
  }  
  
  const { data, error } = await supabaseClient  
    .from('habitaciones')  
    .update(updates)  
    .eq('id', habitacionId)  
    .select(`  
      *,  
      piso:pisos(*)  
    `)  
    .single()  
    
  if (error) {  
    throw new Error(`Failed to update habitacion: ${error.message}`)  
  }  
    
  return data as Habitacion  
}  
  
/**  
 * Validar datos de piso  
 */  
function validatePisoData(data: any): { isValid: boolean; errors: string[] } {  
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
    
  if (data.square_meters && (typeof data.square_meters !== 'number' || data.square_meters < 10)) {  
    errors.push('Square meters must be at least 10')  
  }  
    
  return {  
    isValid: errors.length === 0,  
    errors  
  }  
}  
  
/**  
 * Validar datos de habitación  
 */  
function validateHabitacionData(data: any): { isValid: boolean; errors: string[] } {  
  const errors: string[] = []  
    
  if (!data.piso_id || typeof data.piso_id !== 'string') {  
    errors.push('Piso ID is required')  
  }  
    
  if (!data.price || typeof data.price !== 'number' || data.price < 0) {  
    errors.push('Price must be a positive number')  
  }  
    
  if (!data.available_from) {  
    errors.push('Available from date is required')  
  }  
    
  if (data.square_meters && (typeof data.square_meters !== 'number' || data.square_meters < 5)) {  
    errors.push('Square meters must be at least 5')  
  }  
    
  if (data.room_type && !['single', 'double', 'shared'].includes(data.room_type)) {  
    errors.push('Invalid room type')  
  }  
    
  if (data.current_roommates && (typeof data.current_roommates !== 'number' || data.current_roommates < 0)) {  
    errors.push('Current roommates must be a non-negative number')  
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
    // GET - Obtener pisos y habitaciones del usuario  
    if (method === 'GET') {  
      const type = url.searchParams.get('type') // 'pisos' or 'habitaciones'  
        
      if (type === 'pisos') {  
        const pisos = await getUserPisos(userId)  
        const response: ApiResponse<Piso[]> = { data: pisos }  
        return new Response(  
          JSON.stringify(response),  
          {   
            status: 200,   
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }  
          }  
        )  
      }  
        
      if (type === 'habitaciones' || !type) {  
        const habitaciones = await getUserHabitaciones(userId)  
        const response: ApiResponse<Habitacion[]> = { data: habitaciones }  
        return new Response(  
          JSON.stringify(response),  
          {   
            status: 200,   
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }  
          }  
        )  
      }  
    }  
  
    // POST - Crear nuevo piso o habitación  
    if (method === 'POST') {  
      const body = await req.json()  
      const type = url.searchParams.get('type') // 'piso' or 'habitacion'  
        
      if (type === 'piso') {  
        const pisoData: PisoCreateRequest = {  
          ...body,  
          owner_id: userId // Forzar el owner_id del token  
        }  
  
        const validation = validatePisoData(pisoData)  
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
  
        const piso = await createPiso(pisoData)  
        const response: ApiResponse<Piso> = { data: piso }  
          
        return new Response(  
          JSON.stringify(response),  
          {   
            status: 201,   
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }  
          }  
        )  
      }  
        
      if (type === 'habitacion') {  
        const habitacionData: HabitacionCreateRequest = {  
          ...body,  
          owner_id: userId // Forzar el owner_id del token  
        }  
  
        const validation = validateHabitacionData(habitacionData)  
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
  
        const habitacion = await createHabitacion(habitacionData)  
        const response: ApiResponse<Habitacion> = { data: habitacion }  
          
        return new Response(  
          JSON.stringify(response),  
          {   
            status: 201,   
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }  
          }  
        )  
      }  
    }  
  
    // PATCH - Actualizar piso o habitación existente  
    if (method === 'PATCH') {  
      const resourceId = pathParts[pathParts.length - 1]  
      const type = url.searchParams.get('type') // 'piso' or 'habitacion'  
      const updates = await req.json()  
        
      // No permitir cambiar owner_id  
      delete updates.owner_id  
      delete updates.id  
      delete updates.created_at  
        
      if (type === 'piso') {  
        const validation = validatePisoData(updates)  
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
  
        const updatedPiso = await updatePiso(resourceId, userId, updates)  
        const response: ApiResponse<Piso> = { data: updatedPiso }  
          
        return new Response(  
          JSON.stringify(response),  
          {   
            status: 200,   
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }  
          }  
        )  
      }  
        
      if (type === 'habitacion') {  
        const validation = validateHabitacionData(updates)  
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
  
        const updatedHabitacion = await updateHabitacion(resourceId, userId, updates)  
        const response: ApiResponse<Habitacion> = { data: updatedHabitacion }  
          
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