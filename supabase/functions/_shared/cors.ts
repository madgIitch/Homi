// supabase/functions/_shared/cors.ts  
  
/**  
 * Configura los headers CORS para las Edge Functions de Supabase  
 * Compatible con React Native y desarrollo web  
 */  
  
export const corsHeaders = {  
  'Access-Control-Allow-Origin': '*', // En producción, especificar dominios de la app  
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',  
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE, PATCH',  
  'Access-Control-Max-Age': '86400',  
}  
  
/**  
 * Maneja solicitudes preflight OPTIONS  
 */  
export function handleCORS(req: Request): Response | null {  
  if (req.method === 'OPTIONS') {  
    return new Response('ok', { headers: corsHeaders })  
  }  
  return null  
}  
  
/**  
 * Aplica headers CORS a una respuesta existente  
 */  
export function applyCORS(response: Response): Response {  
  const newHeaders = new Headers(response.headers)  
    
  Object.entries(corsHeaders).forEach(([key, value]) => {  
    newHeaders.set(key, value)  
  })  
    
  return new Response(response.body, {  
    status: response.status,  
    statusText: response.statusText,  
    headers: newHeaders,  
  })  
}  
  
/**  
 * Configuración específica para desarrollo vs producción  
 */  
export const getCORSConfig = () => {  
  const isDev = Deno.env.get('DENO_DEPLOYMENT_ID') === undefined  
    
  return {  
    origin: isDev ? '*' : ['https://tuapp.com', 'exp://tuapp.expo'],  
    credentials: true,  
    allowedHeaders: 'authorization, x-client-info, apikey, content-type',  
    methods: 'POST, GET, OPTIONS, PUT, DELETE, PATCH',  
  }  
}