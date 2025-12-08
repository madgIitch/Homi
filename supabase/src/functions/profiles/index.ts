// supabase/functions/profiles/index.ts  
  
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'  
import { corsHeaders, handleCORS } from '../_shared/cors.ts'  
import { withAuth, getUserId } from '../_shared/auth.ts'  
import {   
  Profile,   
  ProfileCreateRequest,   
  ApiResponse,   
  JWTPayload   
} from '../_shared/types.ts'  
  
/**  
 * Edge Function para gestión de perfiles en HomiMatch  
 * Maneja CRUD operations para perfiles de usuario  
 */  
  
// Crear cliente de Supabase  
const supabaseClient = createClient(  
  Deno.env.get('SUPABASE_URL') ?? '',  
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''  
)  
  
/**  
 * Obtener perfil del usuario autenticado  
 */  
async function getProfile(userId: string): Promise<Profile | null> {  
  const { data, error } = await supabaseClient  
    .from('profiles')  
    .select('*')  
    .eq('user_id', userId)  
    .single()  
    
  if (error || !data) {  
    return null  
  }  
    
  return data as Profile  
}  
  
/**  
 * Crear nuevo perfil  
 */  
async function createProfile(profileData: ProfileCreateRequest): Promise<Profile> {  
  const { data, error } = await supabaseClient  
    .from('profiles')  
    .insert(profileData)  
    .select()  
    .single()  
    
  if (error) {  
    throw new Error(`Failed to create profile: ${error.message}`)  
  }  
    
  return data as Profile  
}  
  
/**  
 * Actualizar perfil existente  
 */  
async function updateProfile(userId: string, updates: Partial<Profile>): Promise<Profile> {  
  const { data, error } = await supabaseClient  
    .from('profiles')  
    .update(updates)  
    .eq('user_id', userId)  
    .select()  
    .single()  
    
  if (error) {  
    throw new Error(`Failed to update profile: ${error.message}`)  
  }  
    
  return data as Profile  
}  
  
/**  
 * Validar datos de perfil  
 */  
function validateProfileData(data: any): { isValid: boolean; errors: string[] } {  
  const errors: string[] = []  
    
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length < 2) {  
    errors.push('Name must be at least 2 characters long')  
  }  
    
  if (data.age && (typeof data.age !== 'number' || data.age < 18 || data.age > 100)) {  
    errors.push('Age must be between 18 and 100')  
  }  
    
  if (data.budget_min && data.budget_max && data.budget_min > data.budget_max) {  
    errors.push('Budget minimum cannot be greater than maximum')  
  }  
    
  if (data.schedule && !['morning', 'afternoon', 'night', 'flexible'].includes(data.schedule)) {  
    errors.push('Invalid schedule value')  
  }  
    
  if (data.gender && !['male', 'female', 'other', 'prefer_not_to_say'].includes(data.gender)) {  
    errors.push('Invalid gender value')  
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
  
  try {  
    // GET - Obtener perfil del usuario  
    if (method === 'GET') {  
      const profile = await getProfile(userId)  
        
      if (!profile) {  
        return new Response(  
          JSON.stringify({ error: 'Profile not found' }),  
          {   
            status: 404,   
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }  
          }  
        )  
      }  
  
      const response: ApiResponse<Profile> = { data: profile }  
      return new Response(  
        JSON.stringify(response),  
        {   
          status: 200,   
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }  
        }  
      )  
    }  
  
    // POST - Crear nuevo perfil  
    if (method === 'POST') {  
      // Verificar si el perfil ya existe  
      const existingProfile = await getProfile(userId)  
      if (existingProfile) {  
        return new Response(  
          JSON.stringify({ error: 'Profile already exists' }),  
          {   
            status: 409,   
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }  
          }  
        )  
      }  
  
      const body: ProfileCreateRequest = await req.json()  
      body.user_id = userId // Forzar el user_id del token  
  
      const validation = validateProfileData(body)  
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
  
      const profile = await createProfile(body)  
      const response: ApiResponse<Profile> = { data: profile }  
        
      return new Response(  
        JSON.stringify(response),  
        {   
          status: 201,   
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }  
        }  
      )  
    }  
  
    // PATCH - Actualizar perfil existente  
    if (method === 'PATCH') {  
      const existingProfile = await getProfile(userId)  
      if (!existingProfile) {  
        return new Response(  
          JSON.stringify({ error: 'Profile not found' }),  
          {   
            status: 404,   
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }  
          }  
        )  
      }  
  
      const updates = await req.json()  
        
      // No permitir cambiar user_id  
      delete updates.user_id  
      delete updates.id  
      delete updates.created_at  
  
      const validation = validateProfileData({ ...existingProfile, ...updates })  
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
  
      const updatedProfile = await updateProfile(userId, updates)  
      const response: ApiResponse<Profile> = { data: updatedProfile }  
        
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
    console.error('Profile function error:', error)  
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