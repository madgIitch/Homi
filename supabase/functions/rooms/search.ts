// supabase/functions/rooms/search.ts  
  
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'  
import { corsHeaders } from '../_shared/cors.ts'  
import { withAuth } from '../_shared/auth.ts'  
import {       
  Room,       
  RoomFilters,       
  PaginatedResponse,    
  JWTPayload       
} from '../_shared/types.ts'  
  
/**      
 * Edge Function para búsqueda de rooms en HomiMatch      
 * Permite buscar rooms disponibles con filtros básicos      
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
    .from('rooms')  
    .select(`  
      *,  
      flat:flats(*),  
      owner:profiles!rooms_owner_id_fkey(*)  
    `)  
    .eq('is_available', true)  
  
  // Aplicar filtros  
  if (filters.city) {  
    query = query.eq('flat.city', filters.city)  
  }  
  
  if (filters.price_min) {  
    query = query.gte('price_per_month', filters.price_min)  
  }  
  
  if (filters.price_max) {  
    query = query.lte('price_per_month', filters.price_max)  
  }  
  
  if (filters.available_from) {  
    query = query.lte('available_from', filters.available_from)  
  }  
  
  return query  
}  
  
/**      
 * Ordena resultados por relevancia      
 */  
function sortByRelevance(rooms: Room[], filters: RoomFilters): Room[] {  
  return rooms.sort((a, b) => {  
    let scoreA = 0  
    let scoreB = 0  
  
    // Priorizar precios más bajos si hay presupuesto máximo  
    if (filters.price_max) {  
      scoreA += (filters.price_max - a.price_per_month) / filters.price_max * 0.5  
      scoreB += (filters.price_max - b.price_per_month) / filters.price_max * 0.5  
    }  
  
    // Priorizar disponibilidad más cercana  
    const today = new Date()  
    const daysA = Math.abs(new Date(a.available_from).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)  
    const daysB = Math.abs(new Date(b.available_from).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)  
    scoreA += Math.max(0, (30 - daysA) / 30) * 0.3  
    scoreB += Math.max(0, (30 - daysB) / 30) * 0.3  
  
    // Priorizar tamaño mayor  
    if (a.size_m2 && b.size_m2) {  
      scoreA += (a.size_m2 / 100) * 0.2  
      scoreB += (b.size_m2 / 100) * 0.2  
    }  
  
    return scoreB - scoreA  
  })  
}  
  
/**      
 * Handler principal con autenticación opcional      
 */  
const handler = withAuth(async (req: Request, _payload: JWTPayload): Promise<Response> => {  
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
    let countQuery = supabaseClient  
      .from('rooms')  
      .select('*', { count: 'exact', head: true })  
      .eq('is_available', true)  
  
    // Aplicar mismos filtros que en buildSearchQuery  
    if (filters.city) {  
      countQuery = countQuery.eq('flat.city', filters.city)  
    }  
  
    if (filters.price_min) {  
      countQuery = countQuery.gte('price_per_month', filters.price_min)  
    }  
  
    if (filters.price_max) {  
      countQuery = countQuery.lte('price_per_month', filters.price_max)  
    }  
  
    if (filters.available_from) {  
      countQuery = countQuery.lte('available_from', filters.available_from)  
    }  
  
    const { count, error: countError } = await countQuery  
  
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
    const sortedRooms = sortByRelevance(rooms as Room[], filters)  
  
    // Construir respuesta paginada  
    const total_pages = Math.ceil((count || 0) / per_page)  
    const response: PaginatedResponse<Room> = {  
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