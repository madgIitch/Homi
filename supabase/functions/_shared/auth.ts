// supabase/functions/_shared/auth.ts  

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'  
import { corsHeaders } from './cors.ts'  
import { JWTPayload } from './types.ts'
  
/**    
 * Cliente de Supabase para Edge Functions    
 */  
export function createSupabaseClient(req?: Request) {  
  return createClient(  
    Deno.env.get('SUPABASE_URL') ?? '',  
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',  
    {  
      global: {  
        headers: req?.headers.get('Authorization')   
          ? { Authorization: req.headers.get('Authorization')! }   
          : {},  
      },  
    }  
  )  
}  
  
/**    
 * Valida el token JWT de Supabase y extrae el payload    
 */  
export async function validateJWT(req: Request): Promise<JWTPayload | null> {  
  try {  
    const authHeader = req.headers.get('Authorization')  
    if (!authHeader || !authHeader.startsWith('Bearer ')) {  
      return null  
    }  
  
    const token = authHeader.replace('Bearer ', '')  
    const supabaseClient = createSupabaseClient(req)  
        
    // Verificar el token con Supabase  
    const { data: { user }, error } = await supabaseClient.auth.getUser(token)  
        
    if (error || !user) {  
      console.error('Error validating token:', error)  
      return null  
    }  
  
    return {  
      aud: 'authenticated',  
      exp: Math.floor(Date.now() / 1000) + 3600,  
      sub: user.id,  
      email: user.email || '',  
      phone: user.phone,  
      app_metadata: user.app_metadata,  
      user_metadata: user.user_metadata,  
      role: user.role || 'authenticated'  
    }  
  } catch (error) {  
    console.error('JWT validation error:', error)  
    return null  
  }  
}  
  
/**    
 * Middleware de autenticación para Edge Functions    
 */  
export function withAuth(handler: (req: Request, payload: JWTPayload) => Promise<Response>) {  
  return async (req: Request): Promise<Response> => {  
    // Manejar CORS preflight  
    if (req.method === 'OPTIONS') {  
      return new Response('ok', { headers: corsHeaders })  
    }  
  
    const payload = await validateJWT(req)  
        
    if (!payload) {  
      return new Response(  
        JSON.stringify({ error: 'Unauthorized' }),  
        {     
          status: 401,     
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }  
        }  
      )  
    }  
  
    return handler(req, payload)  
  }  
}  
  
/**    
 * Obtiene el ID del usuario autenticado    
 */  
export function getUserId(payload: JWTPayload): string {  
  return payload.sub  
}  
  
/**    
 * Respuesta de error de autenticación estandarizada    
 */  
export function authErrorResponse(message: string = 'Unauthorized', status: number = 401): Response {  
  return new Response(  
    JSON.stringify({ error: message }),  
    {     
      status,     
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }  
    }  
  )  
}  
  
/**    
 * Verifica si el usuario puede acceder a un recurso específico    
 */  
export function canAccessResource(  
  payload: JWTPayload,     
  resourceOwnerId: string,     
  allowAdmin: boolean = false  
): boolean {  
  const userId = getUserId(payload)  
      
  // El usuario puede acceder a sus propios recursos  
  if (userId === resourceOwnerId) {  
    return true  
  }  
      
  // Admin puede acceder a todos los recursos (si está permitido)  
  if (allowAdmin && payload.app_metadata?.role === 'admin') {  
    return true  
  }  
      
  return false  
}  
  
/**    
 * Middleware para verificar propietario de recurso    
 */  
export function withResourceOwner(  
  resourceOwnerId: string,  
  handler: (req: Request, payload: JWTPayload) => Promise<Response>,  
  allowAdmin: boolean = false  
) {  
  return async (req: Request, payload: JWTPayload): Promise<Response> => {
    if (!canAccessResource(payload, resourceOwnerId, allowAdmin)) {  
      return authErrorResponse('Forbidden: You can only access your own resources', 403)  
    }  
          
    return await handler(req, payload)  
  }  
}