// supabase/functions/profiles/recommendations.ts  
  
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'  
import { corsHeaders } from '../_shared/cors.ts'  
import { withAuth, getUserId } from '../_shared/auth.ts'  
import {     
  Profile,     
  RecommendationResponse,     
  RoomRecommendation,    
  JWTPayload     
} from '../_shared/types.ts'  
  
/**    
 * Edge Function para generar recomendaciones de perfiles en HomiMatch    
 * Calcula compatibilidad entre perfiles basándose en información básica    
 * Para el swipe interface de descubrimiento de perfiles    
 */  
  
// Crear cliente de Supabase  
const supabaseClient = createClient(  
  Deno.env.get('SUPABASE_URL') ?? '',  
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''  
)  
  
/**    
 * Calcula score de compatibilidad entre dos perfiles (0-1)    
 */  
function calculateProfileCompatibilityScore(    
  seekerProfile: Profile,     
  targetProfile: Profile    
): number {  
  let score = 0  
    
  // Compatibilidad de género (50% peso)  
  if (seekerProfile.gender && targetProfile.gender) {  
    score += seekerProfile.gender === targetProfile.gender ? 0.5 : 0.2  
  }  
    
  // Compatibilidad de ocupación (30% peso)  
  if (seekerProfile.occupation && targetProfile.occupation) {  
    score += seekerProfile.occupation === targetProfile.occupation ? 0.3 : 0.1  
  }  
    
  // Compatibilidad de hábitos (20% peso)  
  if (seekerProfile.smoker !== undefined && targetProfile.smoker !== undefined) {  
    score += seekerProfile.smoker === targetProfile.smoker ? 0.2 : 0.05  
  }  
    
  return Math.min(1, Math.max(0, score))  
}  
  
/**    
 * Genera razones del match basadas en compatibilidad de perfiles    
 */  
function generateProfileMatchReasons(    
  seekerProfile: Profile,     
  targetProfile: Profile    
): string[] {  
  const reasons: string[] = []  
    
  // Género compatible  
  if (seekerProfile.gender && targetProfile.gender &&   
      seekerProfile.gender === targetProfile.gender) {  
    reasons.push(`Mismo género: ${targetProfile.gender}`)  
  }  
    
  // Ocupación en común  
  if (seekerProfile.occupation && targetProfile.occupation &&   
      seekerProfile.occupation === targetProfile.occupation) {  
    reasons.push(`Misma ocupación: ${targetProfile.occupation}`)  
  }  
    
  // Hábitos compatibles  
  if (seekerProfile.smoker !== undefined && targetProfile.smoker !== undefined) {  
    if (seekerProfile.smoker === targetProfile.smoker) {  
      reasons.push(seekerProfile.smoker ? 'Ambos son fumadores' : 'Ninguno fuma')  
    } else {  
      reasons.push('Diferentes hábitos de fumar')  
    }  
  }  
    
  // Mascotas compatibles  
  if (seekerProfile.has_pets !== undefined && targetProfile.has_pets !== undefined) {  
    if (seekerProfile.has_pets === targetProfile.has_pets) {  
      reasons.push(seekerProfile.has_pets ? 'Ambos tienen mascotas' : 'Ninguno tiene mascotas')  
    }  
  }  
    
  return reasons  
}  
  
/**    
 * Handler principal con autenticación    
 */  
const handler = withAuth(async (req: Request, payload: JWTPayload): Promise<Response> => {  
  const userId = getUserId(payload)  
  
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
  
    // Obtener perfil del usuario  
    const { data: seekerProfile, error: seekerError } = await supabaseClient  
      .from('profiles')  
      .select('*')  
      .eq('id', userId) // Cambiado de user_id a id  
      .single()  
  
    if (seekerError || !seekerProfile) {  
      return new Response(  
        JSON.stringify({ error: 'Profile not found' }),  
        {     
          status: 404,     
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }  
        }  
      )  
    }  
  
    // Parsear filtros opcionales del body  
    const body: { filters?: { gender?: string } } = await req.json()  
    const filters = body.filters || {}  
  
    // Construir query para obtener otros perfiles  
    let query = supabaseClient  
      .from('profiles')  
      .select('*')  
      .neq('id', userId) // Excluir propio perfil  
  
    // Aplicar filtros (simplificados)  
    if (filters.gender) {  
      query = query.eq('gender', filters.gender)  
    }  
  
    const { data: profiles, error: profilesError } = await query  
  
    if (profilesError) {  
      console.error('Error fetching profiles:', profilesError)  
      return new Response(  
        JSON.stringify({ error: 'Failed to fetch profiles' }),  
        {     
          status: 500,     
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }  
        }  
      )  
    }  
  
    // Calcular recomendaciones  
    const recommendations: RoomRecommendation[] = []  
        
    for (const profile of profiles || []) {  
      const compatibilityScore = calculateProfileCompatibilityScore(  
        seekerProfile,     
        profile  
      )  
  
      // Solo incluir recomendaciones con score mínimo  
      const matchReasons = generateProfileMatchReasons(  
        seekerProfile,     
        profile  
      )  
  
      recommendations.push({  
        profile: profile,  
        compatibility_score: compatibilityScore,  
        match_reasons: matchReasons  
      })  
    }  
  
    // Ordenar por score de compatibilidad (descendente)  
    recommendations.sort((a, b) => b.compatibility_score - a.compatibility_score)  
  
    const response: RecommendationResponse = {  
      recommendations  
    }  
  
    return new Response(  
      JSON.stringify(response),  
      {     
        status: 200,     
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }  
      }  
    )  
  
  } catch (error) {  
    console.error('Profile recommendations function error:', error)  
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
