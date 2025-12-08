// supabase/functions/rooms/search.ts  
  
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'  
import { corsHeaders, handleCORS } from '../_shared/cors.ts'  
import { withAuth } from '../_shared/auth.ts'  
import {   
  Habitacion,   
  RoomFilters,   
  PaginatedResponse,   
  ApiResponse,  
  JWTPayload   
} from '../_shared/types.ts'  
  
/**  
 * Edge Function para búsqueda de habitaciones en HomiMatch  
 * Permite buscar habitaciones disponibles con filtros avanzados  
 */  
  
// Crear cliente de Supabase  
const supabaseClient = createClient(  
  Deno.env.get('SUPABASE_URL') ?? '',  
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''  
)  
  
/**  
 * Construye query dinámica basada en filtros  
 */  
function buildSearchQuery(filters: RoomFilters) {  
  let query = supabaseClient  
    .from('habitaciones')  
    .select(`  
      *,  
      piso:pisos(*),  
      owner:profiles!habitaciones_owner_id_fkey(*)  
    `)  
    .eq('is_available', true)  
  
  // Aplicar filtros  
  if (filters.city) {  
    query = query.eq('piso.city', filters.city)  
  }  
  
  if (filters.price_min) {  
    query = query.gte('price', filters.price_min)  
  }  
  
  if (filters.price_max) {  
    query = query.lte('price', filters.price_max)  
  }  
  
  if (filters.zones && filters.zones.length > 0) {  
    query = query.in('piso.neighborhood', filters.zones)  
  }  
  
  if (filters.room_type) {  
    query = query.eq('room_type', filters.room_type)  
  }  
  
  if (filters.private_bathroom !== undefined) {  
    query = query.eq('private_bathroom', filters.private_bathroom)  
  }  
  
  if (filters.expenses_included !== undefined) {  
    query = query.eq('expenses_included', filters.expenses_included)  
  }  
  
  if (filters.available_from) {  
    query = query.lte('available_from', filters.available_from)  
  }  
  
  if (filters.max_roommates) {  
    query = query.lte('current_roommates', filters.max_roommates)  
  }  
  
  return query  
}  
  
/**  
 * Calcula distancia entre dos coordenadas (para futura implementación geográfica)  
 */  
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {  
  const R = 6371 // Radio de la Tierra en km  
  const dLat = (lat2 - lat1) * Math.PI / 180  
  const dLon = (lon2 - lon1) * Math.PI / 180  
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +  
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *  
    Math.sin(dLon/2) * Math.sin(dLon/2)  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))  
  return R * c  
}  
  
/**  
 * Ordena resultados por relevancia  
 */  
function sortByRelevance(rooms: Habitacion[], filters: RoomFilters): Habitacion[] {  
  return rooms.sort((a, b) => {  
    let scoreA = 0  
    let scoreB = 0  
  
    // Priorizar precios más bajos si hay presupuesto máximo  
    if (filters.price_max) {  
      scoreA += (filters.price_max - a.price) / filters.price_max * 0.3  
      scoreB += (filters.price_max - b.price) / filters.price_max * 0.3  
    }  
  
    // Priorizar habitaciones con menos compañeros  
    scoreA += (5 - a.current_roommates) / 5 * 0.2  
    scoreB += (5 - b.current_roommates) / 5 * 0.2  
  
    // Priorizar disponibilidad más cercana  
    const today = new Date()  
    const daysA = Math.abs(new Date(a.available_from).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)  
    const daysB = Math.abs(new Date(b.available_from).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)  
    scoreA += Math.max(0, (30 - daysA) / 30) * 0.2  
    scoreB += Math.max(0, (30 - daysB) / 30) * 0.2  
  
    // Priorizar habitaciones con baño propio  
    if (filters.private_bathroom === undefined) {  
      scoreA += a.private_bathroom ? 0.3 : 0  
      scoreB += b.private_bathroom ? 0.3 : 0  
    }  
  
    return scoreB - scoreA  
  })  
}  
  
/**  
 * Handler principal con autenticación opcional  
 */  
const handler = withAuth(async (req: Request, payload: JWTPayload): Promise<Response> => {  
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
  
    // Parsear request body  
    const body = await req.json()  
    const filters: RoomFilters = body.filters || {}  
    const page = body.page || 1  
    const per_page = Math.min(body.per_page || 20, 50) // Máximo 50 resultados  
  
    // Validar filtros  
    if (filters.price_min && filters.price_max && filters.price_min > filters.price_max) {  
      return new Response(  
        JSON.stringify({   
          error: 'Validation failed',  
          details: 'price_min cannot be greater than price_max'  
        }),  
        {   
          status: 400,   
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }  
        }  
      )  
    }  
  
    // Construir y ejecutar query  
    let query = buildSearchQuery(filters)  
  
    // Obtener conteo total para paginación  
    const { count, error: countError } = await query  
    .select('*', { count: 'exact', head: true })  
  
    if (countError) {  
      console.error('Count error:', countError)  
      return new Response(  
        JSON.stringify({ error: 'Failed to count results' }),  
        {   
          status: 500,   
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }  
        }  
      )  
    }  
  
    // Aplicar paginación y ordenamiento  
    const offset = (page - 1) * per_page  
    query = buildSearchQuery(filters)  
      .order('created_at', { ascending: false })  
      .range(offset, offset + per_page - 1)  
  
    const { data: rooms, error: roomsError } = await query  
  
    if (roomsError) {  
      console.error('Search error:', roomsError)  
      return new Response(  
        JSON.stringify({ error: 'Failed to search rooms' }),  
        {   
          status: 500,   
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }  
        }  
      )  
    }  
  
    // Ordenar por relevancia  
    const sortedRooms = sortByRelevance(rooms as Habitacion[], filters)  
  
    // Construir respuesta paginada  
    const total_pages = Math.ceil((count || 0) / per_page)  
    const response: PaginatedResponse<Habitacion> = {  
      data: sortedRooms,  
      count: count || 0,  
      page,  
      per_page,  
      total_pages  
    }  
  
    return new Response(  
      JSON.stringify(response),  
      {   
        status: 200,   
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }  
      }  
    )  
  
  } catch (error) {  
    console.error('Room search function error:', error)  
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