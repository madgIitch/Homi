// supabase/functions/profiles/recommendations.ts  
  
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'  
import { corsHeaders, handleCORS } from '../_shared/cors.ts'  
import { withAuth, getUserId } from '../_shared/auth.ts'  
import {   
  Profile,   
  RecommendationResponse,   
  RoomRecommendation,  
  JWTPayload,  
  LifestyleHabits,  
  ProfileFilters  
} from '../_shared/types.ts'  
  
/**  
 * Edge Function para generar recomendaciones de perfiles en HomiMatch  
 * Calcula compatibilidad entre perfiles basándose en preferencias y estilo de vida  
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
  let factors = 0  
  
  // Compatibilidad de presupuesto (30% peso)  
  if (seekerProfile.budget_min && seekerProfile.budget_max &&   
      targetProfile.budget_min && targetProfile.budget_max) {  
    // Si ambos buscan, verifican que sus rangos sean compatibles  
    const seekerRange = seekerProfile.budget_max - seekerProfile.budget_min  
    const targetRange = targetProfile.budget_max - targetProfile.budget_min  
    const overlap = Math.min(seekerProfile.budget_max, targetProfile.budget_max) -   
                   Math.max(seekerProfile.budget_min, targetProfile.budget_min)  
      
    if (overlap > 0) {  
      score += (overlap / Math.max(seekerRange, targetRange)) * 0.3  
    }  
    factors++  
  }  
  
  // Compatibilidad de zonas (25% peso)  
  if (seekerProfile.preferred_zones && targetProfile.preferred_zones) {  
    const commonZones = seekerProfile.preferred_zones.filter(zone =>   
      targetProfile.preferred_zones!.includes(zone)  
    )  
    const totalZones = new Set([...seekerProfile.preferred_zones, ...targetProfile.preferred_zones]).size  
    score += (commonZones.length / totalZones) * 0.25  
    factors++  
  }  
  
  // Compatibilidad de intereses (20% peso)  
  if (seekerProfile.interests && targetProfile.interests) {  
    const commonInterests = seekerProfile.interests.filter(interest =>   
      targetProfile.interests!.includes(interest)  
    )  
    const totalInterests = new Set([...seekerProfile.interests, ...targetProfile.interests]).size  
    score += (commonInterests.length / totalInterests) * 0.2  
    factors++  
  }  
  
  // Compatibilidad de estilo de vida (25% peso)  
  const lifestyleScore = calculateLifestyleCompatibility(  
    seekerProfile.lifestyle_habits,   
    targetProfile.lifestyle_habits  
  )  
  score += lifestyleScore * 0.25  
  factors++  
  
  // Compatibilidad de ciudad/universidad (bonus points)  
  if (seekerProfile.city === targetProfile.city) {  
    score += 0.1  
  }  
    
  if (seekerProfile.university === targetProfile.university) {  
    score += 0.1  
  }  
  
  return Math.min(1, Math.max(0, score))  
}  
  
/**  
 * Calcula compatibilidad de estilo de vida entre perfiles  
 */  
function calculateLifestyleCompatibility(habits1: LifestyleHabits, habits2: LifestyleHabits): number {  
  let score = 0  
  let factors = 0  
  
  // Limpieza  
  if (habits1.cleanliness && habits2.cleanliness) {  
    const cleanlinessLevels = { 'very_clean': 4, 'clean': 3, 'moderate': 2, 'messy': 1 }  
    const diff = Math.abs(cleanlinessLevels[habits1.cleanliness] - cleanlinessLevels[habits2.cleanliness])  
    score += Math.max(0, 1 - (diff / 3))  
    factors++  
  }  
  
  // Fumar  
  if (habits1.smoking !== undefined && habits2.smoking !== undefined) {  
    score += habits1.smoking === habits2.smoking ? 1 : 0.3  
    factors++  
  }  
  
  // Mascotas  
  if (habits1.pets !== undefined && habits2.pets !== undefined) {  
    score += habits1.pets === habits2.pets ? 1 : 0.5  
    factors++  
  }  
  
  // Invitados  
  if (habits1.guests && habits2.guests) {  
    const guestLevels = { 'never': 1, 'rarely': 2, 'occasional': 3, 'frequently': 4 }  
    const diff = Math.abs(guestLevels[habits1.guests] - guestLevels[habits2.guests])  
    score += Math.max(0, 1 - (diff / 3))  
    factors++  
  }  
  
  // Teletrabajo  
  if (habits1.remote_work !== undefined && habits2.remote_work !== undefined) {  
    score += habits1.remote_work === habits2.remote_work ? 1 : 0.7  
    factors++  
  }  
  
  // Nivel de ruido  
  if (habits1.noise_level && habits2.noise_level) {  
    const noiseLevels = { 'quiet': 1, 'moderate': 2, 'noisy': 3 }  
    const diff = Math.abs(noiseLevels[habits1.noise_level] - noiseLevels[habits2.noise_level])  
    score += Math.max(0, 1 - (diff / 2))  
    factors++  
  }  
  
  // Hábitos de fiesta  
  if (habits1.party_habits && habits2.party_habits) {  
    const partyLevels = { 'never': 1, 'occasionally': 2, 'regularly': 3 }  
    const diff = Math.abs(partyLevels[habits1.party_habits] - partyLevels[habits2.party_habits])  
    score += Math.max(0, 1 - (diff / 2))  
    factors++  
  }  
  
  return factors > 0 ? score / factors : 0  
}  
  
/**  
 * Genera razones del match basadas en compatibilidad de perfiles  
 */  
function generateProfileMatchReasons(  
  seekerProfile: Profile,   
  targetProfile: Profile  
): string[] {  
  const reasons: string[] = []  
  
  // Presupuesto compatible  
  if (seekerProfile.budget_min && seekerProfile.budget_max &&   
      targetProfile.budget_min && targetProfile.budget_max) {  
    const overlap = Math.min(seekerProfile.budget_max, targetProfile.budget_max) -   
                   Math.max(seekerProfile.budget_min, targetProfile.budget_min)  
    if (overlap > 0) {  
      reasons.push('Presupuestos compatibles')  
    }  
  }  
  
  // Zonas en común  
  if (seekerProfile.preferred_zones && targetProfile.preferred_zones) {  
    const commonZones = seekerProfile.preferred_zones.filter(zone =>   
      targetProfile.preferred_zones!.includes(zone)  
    )  
    if (commonZones.length > 0) {  
      reasons.push(`Mismas zonas: ${commonZones.slice(0, 2).join(', ')}`)  
    }  
  }  
  
  // Intereses en común  
  if (seekerProfile.interests && targetProfile.interests) {  
    const commonInterests = seekerProfile.interests.filter(interest =>   
      targetProfile.interests!.includes(interest)  
    )  
    if (commonInterests.length > 0) {  
      reasons.push(`Intereses en común: ${commonInterests.slice(0, 3).join(', ')}`)  
    }  
  }  
  
  // Estilo de vida similar  
  const lifestyleScore = calculateLifestyleCompatibility(  
    seekerProfile.lifestyle_habits,   
    targetProfile.lifestyle_habits  
  )  
  if (lifestyleScore > 0.7) {  
    reasons.push('Estilo de vida muy compatible')  
  }  
  
  // Universidad en común  
  if (seekerProfile.university && targetProfile.university &&   
      seekerProfile.university === targetProfile.university) {  
    reasons.push(`Misma universidad: ${seekerProfile.university}`)  
  }  
  
  // Ciudad en común  
  if (seekerProfile.city && targetProfile.city &&   
      seekerProfile.city === targetProfile.city) {  
    reasons.push(`Misma ciudad: ${seekerProfile.city}`)  
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
      .eq('user_id', userId)  
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
    const body: { filters?: ProfileFilters } = await req.json()  
    const filters = body.filters || {}  
  
    // Construir query para obtener otros perfiles  
    let query = supabaseClient  
      .from('profiles')  
      .select('*')  
      .neq('user_id', userId) // Excluir propio perfil  
  
    // Aplicar filtros  
    if (filters.age_min) {  
      query = query.gte('age', filters.age_min)  
    }  
    if (filters.age_max) {  
      query = query.lte('age', filters.age_max)  
    }  
    if (filters.gender) {  
      query = query.eq('gender', filters.gender)  
    }  
    if (filters.city) {  
      query = query.eq('city', filters.city)  
    }  
    if (filters.university) {  
      query = query.eq('university', filters.university)  
    }  
    if (filters.budget_min) {  
      query = query.gte('budget_min', filters.budget_min)  
    }  
    if (filters.budget_max) {  
      query = query.lte('budget_max', filters.budget_max)  
    }  
    if (filters.preferred_zones && filters.preferred_zones.length > 0) {  
      query = query.contains('preferred_zones', filters.preferred_zones)  
    }  
    if (filters.interests && filters.interests.length > 0) {  
      query = query.contains('interests', filters.interests)  
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
      if (compatibilityScore >= 0.3) {  
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
    }  
  
    // Ordenar por score de compatibilidad (descendente)  
    recommendations.sort((a, b) => b.compatibility_score - a.compatibility_score)  
  
    // Limitar a 20 recomendaciones para swipe interface  
    const limitedRecommendations = recommendations.slice(0, 20)  
  
    const response: RecommendationResponse = {  
      recommendations: limitedRecommendations  
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