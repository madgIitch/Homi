// supabase/functions/swipes/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { withAuth, getUserId } from '../_shared/auth.ts';
import { ApiResponse, JWTPayload } from '../_shared/types.ts';

const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const isValidDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

const getToday = () => new Date().toISOString().slice(0, 10);

const getSwipeCount = async (userId: string, date: string): Promise<number> => {
  const { data, error } = await supabaseClient
    .from('swipe_limits')
    .select('count')
    .eq('user_id', userId)
    .eq('swipe_date', date)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch swipe count: ${error.message}`);
  }

  return data?.count ?? 0;
};

const incrementSwipeCount = async (userId: string, date: string): Promise<number> => {
  const { data, error } = await supabaseClient.rpc('increment_swipe_count', {
    p_user_id: userId,
    p_swipe_date: date,
  });

  if (error) {
    throw new Error(`Failed to increment swipe count: ${error.message}`);
  }

  return typeof data === 'number' ? data : 0;
};

const handler = withAuth(async (req: Request, payload: JWTPayload): Promise<Response> => {
  const userId = getUserId(payload);
  const url = new URL(req.url);
  const method = req.method;

  try {
    if (method === 'GET') {
      const dateParam = url.searchParams.get('date');
      const date = dateParam && isValidDate(dateParam) ? dateParam : getToday();
      const count = await getSwipeCount(userId, date);
      const response: ApiResponse<{ count: number; date: string }> = {
        data: { count, date },
      };
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (method === 'POST') {
      const date = getToday();
      const count = await incrementSwipeCount(userId, date);
      const response: ApiResponse<{ count: number; date: string }> = {
        data: { count, date },
      };
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Swipes function error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

Deno.serve(handler);
