// supabase/functions/profiles/index.ts  
  
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'  
import { corsHeaders } from '../_shared/cors.ts'  
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
  
interface ProfileValidationData {  
  id?: string  
  display_name?: string  
  avatar_url?: string  
  bio?: string  
  gender?: string  
  occupation?: string  
  smoker?: boolean  
  has_pets?: boolean  
  social_links?: Record<string, unknown>  
}  

/**    
 * Obtener perfil del usuario autenticado    
 */  
async function getProfile(userId: string): Promise<Profile | null> {  
  const { data, error } = await supabaseClient  
    .from('profiles')  
    .select('*')  
    .eq('id', userId) // Cambiado de user_id a id  
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
    .eq('id', userId) // Cambiado de user_id a id  
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
function validateProfileData(data: ProfileValidationData): { isValid: boolean; errors: string[] } {  
  const errors: string[] = []  
      
  // Validar display_name (antes name)  
  if (data.display_name && typeof data.display_name !== 'string') {  
    errors.push('Display name must be a string')  
  }  
      
  // Validar bio  
  if (data.bio && typeof data.bio !== 'string') {  
    errors.push('Bio must be a string')  
  }  
      
  // Validar gender  
  if (data.gender && !['male', 'female', 'other'].includes(data.gender)) {  
    errors.push('Invalid gender value')  
  }  
      
  // Validar occupation  
  if (data.occupation && typeof data.occupation !== 'string') {  
    errors.push('Occupation must be a string')  
  }  
      
  // Validar smoker (boolean)  
  if (data.smoker !== undefined && typeof data.smoker !== 'boolean') {  
    errors.push('Smoker must be a boolean')  
  }  
      
  // Validar has_pets (boolean)  
  if (data.has_pets !== undefined && typeof data.has_pets !== 'boolean') {  
    errors.push('Has pets must be a boolean')  
  }  
      
  // Validar social_links (JSON object)  
  if (data.social_links && typeof data.social_links !== 'object') {  
    errors.push('Social links must be a JSON object')  
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
      body.id = userId // Cambiado de user_id a id  
  
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
          
      // No permitir cambiar id  
      delete updates.id  
      delete updates.updated_at  
  
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