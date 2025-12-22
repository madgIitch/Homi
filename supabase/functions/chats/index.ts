// supabase/functions/chats/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { withAuth, getUserId } from '../_shared/auth.ts';
import { Chat, Message, ApiResponse, JWTPayload } from '../_shared/types.ts';

/**
 * Edge Function para gestion de chats en HomiMatch
 * Maneja operaciones CRUD para chats y sus mensajes
 */

const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

interface MatchWithProfiles {
  id: string;
  user_a_id: string;
  user_b_id: string;
  status: string;
  user_a: { id: string; user_id: string };
  user_b: { id: string; user_id: string };
}

interface MessageValidationData {
  body?: string;
}

async function getUserMatchIds(userId: string): Promise<string[]> {
  const { data, error } = await supabaseClient
    .from('matches')
    .select('id')
    .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`);

  if (error || !data) {
    return [];
  }

  return data.map((row) => row.id);
}

async function getUserChats(userId: string): Promise<Chat[]> {
  const matchIds = await getUserMatchIds(userId);
  if (matchIds.length === 0) {
    return [];
  }

  const { data, error } = await supabaseClient
    .from('chats')
    .select(
      `
      *,
      match:matches(
        *,
        user_a:profiles!matches_user_a_id_fkey(*, users!profiles_id_fkey(birth_date)),
        user_b:profiles!matches_user_b_id_fkey(*, users!profiles_id_fkey(birth_date))
      )
    `
    )
    .in('match_id', matchIds)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch chats: ${error.message}`);
  }

  return data as Chat[];
}

async function getChatByMatchId(
  matchId: string,
  userId: string
): Promise<Chat | null> {
  const { data, error } = await supabaseClient
    .from('chats')
    .select(
      `
      *,
      match:matches(
        *,
        user_a:profiles!matches_user_a_id_fkey(*, users!profiles_id_fkey(birth_date)),
        user_b:profiles!matches_user_b_id_fkey(*, users!profiles_id_fkey(birth_date))
      )
    `
    )
    .eq('match_id', matchId)
    .single();

  if (error || !data) {
    return null;
  }

  const match = data.match as MatchWithProfiles;
  const userAId = match.user_a_id;
  const userBId = match.user_b_id;

  if (userId !== userAId && userId !== userBId) {
    throw new Error('Unauthorized: You can only access chats you participate in');
  }

  return data as Chat;
}

async function getChatById(chatId: string, userId: string): Promise<Chat | null> {
  const { data, error } = await supabaseClient
    .from('chats')
    .select(
      `
      *,
      match:matches(
        *,
        user_a:profiles!matches_user_a_id_fkey(*, users!profiles_id_fkey(birth_date)),
        user_b:profiles!matches_user_b_id_fkey(*, users!profiles_id_fkey(birth_date))
      )
    `
    )
    .eq('id', chatId)
    .single();

  if (error || !data) {
    return null;
  }

  const match = data.match as MatchWithProfiles;
  const userAId = match.user_a_id;
  const userBId = match.user_b_id;

  if (userId !== userAId && userId !== userBId) {
    throw new Error('Unauthorized: You can only access chats you participate in');
  }

  return data as Chat;
}

async function createChat(matchId: string): Promise<Chat> {
  const { data, error } = await supabaseClient
    .from('chats')
    .insert({ match_id: matchId })
    .select(
      `
      *,
      match:matches(
        *,
        user_a:profiles!matches_user_a_id_fkey(*, users!profiles_id_fkey(birth_date)),
        user_b:profiles!matches_user_b_id_fkey(*, users!profiles_id_fkey(birth_date))
      )
    `
    )
    .single();

  if (error) {
    throw new Error(`Failed to create chat: ${error.message}`);
  }

  return data as Chat;
}

async function getChatMessages(
  chatId: string,
  userId: string
): Promise<Message[]> {
  const { data: chat, error: chatError } = await supabaseClient
    .from('chats')
    .select(
      `
      *,
      match:matches(
        *,
        user_a:profiles!matches_user_a_id_fkey(*, users!profiles_id_fkey(birth_date)),
        user_b:profiles!matches_user_b_id_fkey(*, users!profiles_id_fkey(birth_date))
      )
    `
    )
    .eq('id', chatId)
    .single();

  if (chatError || !chat) {
    throw new Error('Chat not found');
  }

  const match = chat.match as MatchWithProfiles;
  const userAId = match.user_a_id;
  const userBId = match.user_b_id;

  if (userId !== userAId && userId !== userBId) {
    throw new Error('Unauthorized: You can only access chats you participate in');
  }

  const { data, error } = await supabaseClient
    .from('messages')
    .select(
      `
      *,
      sender:profiles!messages_sender_id_fkey(*, users!profiles_id_fkey(birth_date))
    `
    )
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch messages: ${error.message}`);
  }

  return data as Message[];
}

async function sendMessage(
  chatId: string,
  senderId: string,
  body: string
): Promise<Message> {
  const { data, error } = await supabaseClient
    .from('messages')
    .insert({
      chat_id: chatId,
      sender_id: senderId,
      body: body,
    })
    .select(
      `
      *,
      sender:profiles!messages_sender_id_fkey(*, users!profiles_id_fkey(birth_date))
    `
    )
    .single();

  if (error) {
    throw new Error(`Failed to send message: ${error.message}`);
  }

  await supabaseClient
    .from('chats')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', chatId);

  return data as Message;
}

async function markMessagesAsRead(chatId: string, userId: string): Promise<void> {
  await supabaseClient
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('chat_id', chatId)
    .neq('sender_id', userId)
    .is('read_at', null);
}

function validateMessageData(
  data: MessageValidationData
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.body || typeof data.body !== 'string' || data.body.trim().length === 0) {
    errors.push('Message body is required and cannot be empty');
  }

  if (data.body && data.body.length > 1000) {
    errors.push('Message body cannot exceed 1000 characters');
  }

  return { isValid: errors.length === 0, errors };
}

const handler = withAuth(
  async (req: Request, payload: JWTPayload): Promise<Response> => {
    const userId = getUserId(payload);
    const url = new URL(req.url);
    const method = req.method;
    const pathParts = url.pathname.split('/');

    try {
      if (method === 'GET') {
        const chatId = url.searchParams.get('chat_id');
        const matchId = url.searchParams.get('match_id');
        const detailId = url.searchParams.get('detail_id');

        if (chatId) {
          const messages = await getChatMessages(chatId, userId);
          const response: ApiResponse<Message[]> = { data: messages };
          return new Response(JSON.stringify(response), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (detailId) {
          const chat = await getChatById(detailId, userId);
          if (!chat) {
            return new Response(JSON.stringify({ error: 'Chat not found' }), {
              status: 404,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          const response: ApiResponse<Chat> = { data: chat };
          return new Response(JSON.stringify(response), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (matchId) {
          const chat = await getChatByMatchId(matchId, userId);
          if (!chat) {
            return new Response(JSON.stringify({ error: 'Chat not found' }), {
              status: 404,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          const response: ApiResponse<Chat> = { data: chat };
          return new Response(JSON.stringify(response), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const chats = await getUserChats(userId);
        const response: ApiResponse<Chat[]> = { data: chats };
        return new Response(JSON.stringify(response), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (method === 'POST') {
        const body = await req.json();
        const type = url.searchParams.get('type');

        if (type === 'chat') {
          if (!body.match_id) {
            return new Response(JSON.stringify({ error: 'match_id is required' }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          const chat = await createChat(body.match_id);
          const response: ApiResponse<Chat> = { data: chat };
          return new Response(JSON.stringify(response), {
            status: 201,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (type === 'message') {
          const validation = validateMessageData(body);
          if (!validation.isValid) {
            return new Response(
              JSON.stringify({
                error: 'Validation failed',
                details: validation.errors,
              }),
              {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              }
            );
          }

          await getChatMessages(body.chat_id, userId);
          const message = await sendMessage(body.chat_id, userId, body.body);
          const response: ApiResponse<Message> = { data: message };
          return new Response(JSON.stringify(response), {
            status: 201,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      if (method === 'PATCH') {
        const chatId = url.searchParams.get('chat_id');

        if (!chatId) {
          return new Response(
            JSON.stringify({ error: 'chat_id parameter is required' }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        await markMessagesAsRead(chatId, userId);
        return new Response(JSON.stringify({ message: 'Messages marked as read' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (method === 'DELETE') {
        const chatId = pathParts[pathParts.length - 1];

        const chat = await getChatByMatchId(chatId, userId);
        if (!chat) {
          return new Response(JSON.stringify({ error: 'Chat not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        await supabaseClient.from('messages').delete().eq('chat_id', chatId);
        await supabaseClient.from('chats').delete().eq('id', chatId);

        return new Response(JSON.stringify({ message: 'Chat deleted successfully' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Chat function error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return new Response(
        JSON.stringify({
          error: 'Internal server error',
          details: errorMessage,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  }
);

Deno.serve(handler);
