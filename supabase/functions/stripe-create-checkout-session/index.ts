// supabase/functions/stripe-create-checkout-session/index.ts

import Stripe from 'https://esm.sh/stripe@14.0.0?target=deno';
import { corsHeaders } from '../_shared/cors.ts';
import { withAuth, getUserId } from '../_shared/auth.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';
import type { JWTPayload } from '../_shared/types.ts';

type CheckoutRequest = {
  priceId: string;
  successUrl: string;
  cancelUrl: string;
};

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY') ?? '';

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const handler = withAuth(async (req: Request, payload: JWTPayload): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!STRIPE_SECRET_KEY) {
    return new Response(JSON.stringify({ error: 'Stripe secret key missing' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body: CheckoutRequest;
  try {
    body = await req.json();
  } catch (error) {
    console.error('[stripe-create-checkout-session] Invalid JSON:', error);
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { priceId, successUrl, cancelUrl } = body ?? {};
  if (
    typeof priceId !== 'string' ||
    typeof successUrl !== 'string' ||
    typeof cancelUrl !== 'string'
  ) {
    return new Response(JSON.stringify({ error: 'Invalid input' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const userId = getUserId(payload);
  console.log('[stripe-create-checkout-session] userId:', userId);

  try {
    const { data: userRow, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, stripe_customer_id')
      .eq('id', userId)
      .single();

    if (userError || !userRow) {
      console.error('[stripe-create-checkout-session] User not found:', userError);
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let customerId = userRow.stripe_customer_id as string | null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userRow.email ?? payload.email,
        metadata: { userId },
      });
      customerId = customer.id;

      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({ stripe_customer_id: customerId })
        .eq('id', userId);

      if (updateError) {
        console.error('[stripe-create-checkout-session] Failed to save customer:', updateError);
      }
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId ?? undefined,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      metadata: { userId },
      subscription_data: {
        metadata: { userId },
      },
    });

    return new Response(
      JSON.stringify({ sessionId: session.id, url: session.url }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[stripe-create-checkout-session] Error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: 'Failed to create checkout session', details: message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

Deno.serve(handler);
