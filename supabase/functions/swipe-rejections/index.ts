// supabase/functions/swipe-rejections/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { withAuth, getUserId } from '../_shared/auth.ts';
import { ApiResponse, JWTPayload } from '../_shared/types.ts';

const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

interface SwipeRejection {
  id: string;
  user_id: string;
  rejected_profile_id: string;
  created_at: string;
}

interface SwipeRejectionCreate {
  rejected_profile_id?: string;
}

function validateRejection(
  data: SwipeRejectionCreate,
  userId: string
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.rejected_profile_id || typeof data.rejected_profile_id !== 'string') {
    errors.push('rejected_profile_id is required');
  }

  if (data.rejected_profile_id === userId) {
    errors.push('Cannot reject yourself');
  }

  return { isValid: errors.length === 0, errors };
}

async function getUserRejections(userId: string): Promise<SwipeRejection[]> {
  const { data, error } = await supabaseClient
    .from('swipe_rejections')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch rejections: ${error.message}`);
  }

  return data as SwipeRejection[];
}

async function createRejection(
  userId: string,
  rejectedProfileId: string
): Promise<SwipeRejection> {
  const { data, error } = await supabaseClient
    .from('swipe_rejections')
    .insert({
      user_id: userId,
      rejected_profile_id: rejectedProfileId,
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(`Failed to create rejection: ${error.message}`);
  }

  return data as SwipeRejection;
}

const handler = withAuth(
  async (req: Request, payload: JWTPayload): Promise<Response> => {
    const userId = getUserId(payload);
    const method = req.method;

    try {
      if (method === 'GET') {
        const rejections = await getUserRejections(userId);
        const response: ApiResponse<SwipeRejection[]> = { data: rejections };
        return new Response(JSON.stringify(response), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (method === 'POST') {
        const body = (await req.json()) as SwipeRejectionCreate;
        const validation = validateRejection(body, userId);
        if (!validation.isValid) {
          return new Response(
            JSON.stringify({ error: 'Validation failed', details: validation.errors }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        const rejection = await createRejection(userId, body.rejected_profile_id!);
        const response: ApiResponse<SwipeRejection> = { data: rejection };
        return new Response(JSON.stringify(response), {
          status: 201,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Swipe rejections error:', error);
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
