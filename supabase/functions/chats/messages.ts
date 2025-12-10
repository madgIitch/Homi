// supabase/functions/chats/messages.ts  
  
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'  
import { corsHeaders, handleCORS } from '../_shared/cors.ts'  
import { withAuth, getUserId } from '../_shared/auth.ts'  
import {     
  Chat,     
  Message,     
  ApiResponse,     
  JWTPayload,    
  MessageCreateRequest    
} from '../_shared/types.ts'  
  
/**    
 * Edge Function para gestión de chats en HomiMatch    
 * Maneja operaciones CRUD para chats y sus mensajes    
 */  
  
// Crear cliente de Supabase  
const supabaseClient = createClient(  
  Deno.env.get('SUPABASE_URL') ?? '',  
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''  
)  
  
/**    
 * Obtener chats del usuario (a través de matches)    
 */  
async function getUserChats(userId: string): Promise<Chat[]> {  
  const { data, error } = await supabaseClient  
    .from('chats')  
    .select(`  
      *,  
      match:matches(  
        *,  
        user_a:profiles!matches_user_a_id_fkey(*),  
        user_b:profiles!matches_user_b_id_fkey(*)  
      )  
    `)  
    .or(`match.user_a_id.eq.${userId},match.user_b_id.eq.${userId}`)  
    .order('created_at', { ascending: false })  
      
  if (error) {  
    throw new Error(`Failed to fetch chats: ${error.message}`)  
  }  
      
  return data as Chat[]  
}  
  
/**    
 * Obtener chat específico por match_id    
 */  
async function getChatByMatchId(matchId: string, userId: string): Promise<Chat | null> {  
  const { data, error } = await supabaseClient  
    .from('chats')  
    .select(`  
      *,  
      match:matches(  
        *,  
        user_a:profiles!matches_user_a_id_fkey(*),  
        user_b:profiles!matches_user_b_id_fkey(*)  
      )  
    `)  
    .eq('match_id', matchId)  
    .single()  
      
  if (error || !data) {  
    return null  
  }  
      
  // Verificar que el usuario es parte del match  
  const match = data.match as any  
  const userAId = match.user_a_id  
  const userBId = match.user_b_id  
      
  if (userId !== userAId && userId !== userBId) {  
    throw new Error('Unauthorized: You can only access chats you participate in')  
  }  
      
  return data as Chat  
}  
  
/**    
 * Crear nuevo chat (cuando se crea un match)    
 */  
async function createChat(matchId: string): Promise<Chat> {  
  const { data, error } = await supabaseClient  
    .from('chats')  
    .insert({ match_id: matchId })  
    .select(`  
      *,  
      match:matches(  
        *,  
        user_a:profiles!matches_user_a_id_fkey(*),  
        user_b:profiles!matches_user_b_id_fkey(*)  
      )  
    `)  
    .single()  
      
  if (error) {  
    throw new Error(`Failed to create chat: ${error.message}`)  
  }  
      
  return data as Chat  
}  
  
/**    
 * Obtener mensajes de un chat    
 */  
async function getChatMessages(chatId: string, userId: string): Promise<Message[]> {  
  // Primero verificar que el usuario tiene acceso al chat  
  const { data: chat, error: chatError } = await supabaseClient  
    .from('chats')  
    .select(`  
      *,  
      match:matches(  
        *,  
        user_a:profiles!matches_user_a_id_fkey(*),  
        user_b:profiles!matches_user_b_id_fkey(*)  
      )  
    `)  
    .eq('id', chatId)  
    .single()  
      
  if (chatError || !chat) {  
    throw new Error('Chat not found')  
  }  
      
  // Verificar acceso  
  const match = chat.match as any  
  const userAId = match.user_a_id  
  const userBId = match.user_b_id  
      
  if (userId !== userAId && userId !== userBId) {  
    throw new Error('Unauthorized: You can only access chats you participate in')  
  }  
      
  // Obtener mensajes  
  const { data, error } = await supabaseClient  
    .from('messages')  
    .select(`  
      *,  
      sender:profiles!messages_sender_id_fkey(*)  
    `)  
    .eq('chat_id', chatId)  
    .order('created_at', { ascending: true })  
      
  if (error) {  
    throw new Error(`Failed to fetch messages: ${error.message}`)  
  }  
      
  return data as Message[]  
}  
  
/**    
 * Enviar mensaje en un chat    
 */  
async function sendMessage(chatId: string, senderId: string, body: string): Promise<Message> {  
  const { data, error } = await supabaseClient  
    .from('messages')  
    .insert({  
      chat_id: chatId,  
      sender_id: senderId,  
      body: body  
    })  
    .select(`  
      *,  
      sender:profiles!messages_sender_id_fkey(*)  
    `)  
    .single()  
      
  if (error) {  
    throw new Error(`Failed to send message: ${error.message}`)  
  }  
      
  // Actualizar timestamp del chat  
  await supabaseClient  
    .from('chats')  
    .update({ updated_at: new Date().toISOString() })  
    .eq('id', chatId)  
      
  return data as Message  
}  
  
/**    
 * Marcar mensajes como leídos    
 */  
async function markMessagesAsRead(chatId: string, userId: string): Promise<void> {  
  await supabaseClient  
    .from('messages')  
    .update({ read_at: new Date().toISOString() })  
    .eq('chat_id', chatId)  
    .neq('sender_id', userId)  
    .is('read_at', null)  
}  
  
/**    
 * Validar datos de mensaje    
 */  
function validateMessageData(data: any): { isValid: boolean; errors: string[] } {  
  const errors: string[] = []  
      
  if (!data.body || typeof data.body !== 'string' || data.body.trim().length === 0) {  
    errors.push('Message body is required and cannot be empty')  
  }  
      
  if (data.body && data.body.length > 1000) {  
    errors.push('Message body cannot exceed 1000 characters')  
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
    // GET - Obtener chats o mensajes  
    if (method === 'GET') {  
      const chatId = url.searchParams.get('chat_id')  
      const matchId = url.searchParams.get('match_id')  
          
      if (chatId) {  
        // Obtener mensajes de un chat específico  
        const messages = await getChatMessages(chatId, userId)  
        const response: ApiResponse<Message[]> = { data: messages }  
        return new Response(  
          JSON.stringify(response),  
          {     
            status: 200,     
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }  
          }  
        )  
      } else if (matchId) {  
        // Obtener chat específico por match_id  
        const chat = await getChatByMatchId(matchId, userId)  
        if (!chat) {  
          return new Response(  
            JSON.stringify({ error: 'Chat not found' }),  
            {     
              status: 404,     
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }  
            }  
          )  
        }  
        const response: ApiResponse<Chat> = { data: chat }  
        return new Response(  
          JSON.stringify(response),  
          {     
            status: 200,     
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }  
          }  
        )  
      } else {  
        // Obtener todos los chats del usuario  
        const chats = await getUserChats(userId)  
        const response: ApiResponse<Chat[]> = { data: chats }  
        return new Response(  
          JSON.stringify(response),  
          {     
            status: 200,     
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }  
          }  
        )  
      }  
    }  
  
    // POST - Crear chat o enviar mensaje  
    if (method === 'POST') {  
      const body = await req.json()  
      const type = url.searchParams.get('type') // 'chat' or 'message'  
          
      if (type === 'chat') {  
        // Crear nuevo chat (generalmente llamado desde matches/index.ts)  
        if (!body.match_id) {  
          return new Response(  
            JSON.stringify({ error: 'match_id is required' }),  
            {     
              status: 400,     
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }  
            }  
          )  
        }  
  
        const chat = await createChat(body.match_id)  
        const response: ApiResponse<Chat> = { data: chat }  
            
        return new Response(  
          JSON.stringify(response),  
          {     
            status: 201,     
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }  
          }  
        )  
      }  
          
      if (type === 'message') {  
        // Enviar mensaje  
        const validation = validateMessageData(body)  
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
  
        // Verificar acceso al chat  
        await getChatMessages(body.chat_id, userId)  
            
        const message = await sendMessage(body.chat_id, userId, body.body)  
        const response: ApiResponse<Message> = { data: message }  
            
        return new Response(  
          JSON.stringify(response),  
          {     
            status: 201,     
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }  
          }  
        )  
      }  
    }  
  
    // PATCH - Marcar mensajes como leídos  
    if (method === 'PATCH') {  
      const chatId = url.searchParams.get('chat_id')  
          
      if (!chatId) {  
        return new Response(  
          JSON.stringify({ error: 'chat_id parameter is required' }),  
          {     
            status: 400,     
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }  
          }  
        )  
      }  
  
      await markMessagesAsRead(chatId, userId)  
          
      return new Response(  
        JSON.stringify({ message: 'Messages marked as read' }),  
        {     
          status: 200,     
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }  
        }  
      )  
    }  
  
    // DELETE - Eliminar chat (opcional)  
    if (method === 'DELETE') {  
      const chatId = pathParts[pathParts.length - 1]  
          
      // Verificar acceso y eliminar chat  
      const chat = await getChatByMatchId(chatId, userId)  
      if (!chat) {  
        return new Response(  
          JSON.stringify({ error: 'Chat not found' }),  
          {     
            status: 404,     
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }  
          }  
        )  
      }  
  
      // Eliminar mensajes y chat  
      await supabaseClient  
        .from('messages')  
        .delete()  
        .eq('chat_id', chatId)  
          
      await supabaseClient  
        .from('chats')  
        .delete()  
        .eq('id', chatId)  
          
      return new Response(  
        JSON.stringify({ message: 'Chat deleted successfully' }),  
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
    console.error('Chat function error:', error)  
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