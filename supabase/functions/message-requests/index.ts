// supabase/functions/message-requests/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { withAuth, getUserId } from '../_shared/auth.ts';
import { ApiResponse, JWTPayload } from '../_shared/types.ts';

type RequestBody = {
  recipient_id?: string;
  body?: string;
};

type MatchRow = {
  id: string;
  status: string;
  user_a_id: string;
  user_b_id: string;
};

const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const READABLE_MATCH_STATUSES = [
  'pending',
  'accepted',
  'room_offer',
  'room_assigned',
  'room_declined',
  'unmatched',
];

const BLOCKED_MATCH_STATUSES = ['rejected', 'unmatched'];
const WEEKLY_LIMIT = 3;

const getWeekStart = (date: Date) => {
  const utcDate = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
  const day = utcDate.getUTCDay();
  const daysSinceMonday = (day + 6) % 7;
  utcDate.setUTCDate(utcDate.getUTCDate() - daysSinceMonday);
  return utcDate.toISOString().slice(0, 10);
};

const validateRequest = (payload: RequestBody): string | null => {
  if (!payload.recipient_id || typeof payload.recipient_id !== 'string') {
    return 'recipient_id is required';
  }
  if (!payload.body || typeof payload.body !== 'string') {
    return 'body is required';
  }
  if (payload.body.trim().length === 0) {
    return 'body cannot be empty';
  }
  if (payload.body.length > 1000) {
    return 'body cannot exceed 1000 characters';
  }
  return null;
};

const handler = withAuth(
  async (req: Request, payload: JWTPayload): Promise<Response> => {
    const userId = getUserId(payload);

    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    try {
      const body = (await req.json()) as RequestBody;
      const validationError = validateRequest(body);
      if (validationError) {
        return new Response(JSON.stringify({ error: validationError }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const recipientId = body.recipient_id!.trim();
      const messageBody = body.body!.trim();

      if (recipientId === userId) {
        return new Response(JSON.stringify({ error: 'No puedes enviarte mensajes' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: senderProfile, error: senderError } = await supabaseClient
        .from('profiles')
        .select('id, is_searchable, is_premium')
        .eq('id', userId)
        .single();

      if (senderError || !senderProfile) {
        return new Response(JSON.stringify({ error: 'Perfil no encontrado' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (senderProfile.is_searchable === false) {
        return new Response(JSON.stringify({ error: 'Tu perfil no esta activo' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const isPremium = senderProfile.is_premium === true;
      const currentWeekStart = getWeekStart(new Date());
      const { data: limitRow } = await supabaseClient
        .from('message_request_limits')
        .select('weekly_count, week_start, used_trial')
        .eq('user_id', userId)
        .maybeSingle();

      let weeklyCount = limitRow?.weekly_count ?? 0;
      const storedWeek = limitRow?.week_start ?? null;
      const usedTrial = limitRow?.used_trial === true;

      if (storedWeek !== currentWeekStart) {
        weeklyCount = 0;
      }

      if (isPremium) {
        if (weeklyCount >= WEEKLY_LIMIT) {
          return new Response(
            JSON.stringify({ error: 'Limite semanal de solicitudes alcanzado' }),
            {
              status: 403,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }
      } else if (usedTrial) {
        return new Response(JSON.stringify({ error: 'Ya usaste tu envio de prueba' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: matchRow, error: matchError } = await supabaseClient
        .from('matches')
        .select('id, status, user_a_id, user_b_id')
        .or(
          `and(user_a_id.eq.${userId},user_b_id.eq.${recipientId}),and(user_a_id.eq.${recipientId},user_b_id.eq.${userId})`
        )
        .maybeSingle();

      if (matchError) {
        throw new Error(`Failed to fetch match: ${matchError.message}`);
      }

      let matchId = '';
      let matchStatus = '';

      if (matchRow) {
        const existingMatch = matchRow as MatchRow;
        matchId = existingMatch.id;
        matchStatus = existingMatch.status;

        if (BLOCKED_MATCH_STATUSES.includes(matchStatus)) {
          return new Response(
            JSON.stringify({ error: 'No puedes enviar solicitud a esta persona' }),
            {
              status: 409,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        if (matchStatus === 'pending') {
          if (existingMatch.user_a_id === userId) {
            return new Response(
              JSON.stringify({ error: 'Ya tienes una solicitud activa' }),
              {
                status: 409,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              }
            );
          }

          const { data: updatedMatch, error: updateError } = await supabaseClient
            .from('matches')
            .update({ status: 'accepted' })
            .eq('id', matchId)
            .select('id, status')
            .single();

          if (updateError || !updatedMatch) {
            throw new Error('Failed to accept pending match');
          }

          matchStatus = updatedMatch.status;
        }
      } else {
        const { data: createdMatch, error: createError } = await supabaseClient
          .from('matches')
          .insert({
            user_a_id: userId,
            user_b_id: recipientId,
            status: 'pending',
          })
          .select('id, status')
          .single();

        if (createError || !createdMatch) {
          throw new Error('Failed to create match');
        }

        matchId = createdMatch.id;
        matchStatus = createdMatch.status;
      }

      if (!READABLE_MATCH_STATUSES.includes(matchStatus)) {
        return new Response(
          JSON.stringify({ error: 'No puedes enviar solicitud a esta persona' }),
          {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const { data: existingChat, error: chatError } = await supabaseClient
        .from('chats')
        .select('id')
        .eq('match_id', matchId)
        .maybeSingle();

      if (chatError) {
        throw new Error(`Failed to fetch chat: ${chatError.message}`);
      }

      let chatId = existingChat?.id as string | undefined;

      if (!chatId) {
        const { data: createdChat, error: createChatError } = await supabaseClient
          .from('chats')
          .insert({ match_id: matchId })
          .select('id')
          .single();

        if (createChatError || !createdChat) {
          throw new Error('Failed to create chat');
        }

        chatId = createdChat.id;
      }

      const { data: message, error: messageError } = await supabaseClient
        .from('messages')
        .insert({
          chat_id: chatId,
          sender_id: userId,
          body: messageBody,
        })
        .select('id')
        .single();

      if (messageError || !message) {
        throw new Error('Failed to create message');
      }

      await supabaseClient
        .from('chats')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', chatId);

      await supabaseClient.from('message_request_limits').upsert(
        {
          user_id: userId,
          weekly_count: isPremium ? weeklyCount + 1 : weeklyCount,
          week_start: currentWeekStart,
          used_trial: isPremium ? usedTrial : true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

      const response: ApiResponse<{
        match_id: string;
        chat_id: string;
        status: string;
      }> = {
        data: { match_id: matchId, chat_id: chatId, status: matchStatus },
      };

      return new Response(JSON.stringify(response), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[message-requests] error:', message);
      return new Response(
        JSON.stringify({ error: 'Internal server error', details: message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  }
);

Deno.serve(handler);
