// supabase/functions/stripe-subscription-status/index.ts

import Stripe from 'https://esm.sh/stripe@14.0.0?target=deno';
import { corsHeaders } from '../_shared/cors.ts';
import { withAuth, getUserId } from '../_shared/auth.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';
import type { JWTPayload } from '../_shared/types.ts';

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
const stripe = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    })
  : null;

const statusToPremium = (status: string) =>
  status === 'active' || status === 'trialing';

const toISOStringFromUnix = (seconds?: number | null) => {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds)) {
    return null;
  }
  const date = new Date(seconds * 1000);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const getSubscriptionPeriodEnd = (subscription: Stripe.Subscription) => {
  const topLevel = (subscription as any).current_period_end as number | null | undefined;
  if (typeof topLevel === 'number') return topLevel;
  const itemEnd = subscription.items?.data?.[0]?.current_period_end ?? null;
  return itemEnd ?? null;
};

const getSubscriptionPeriodStart = (subscription: Stripe.Subscription) => {
  const topLevel = (subscription as any).current_period_start as number | null | undefined;
  if (typeof topLevel === 'number') return topLevel;
  const itemStart = subscription.items?.data?.[0]?.current_period_start ?? null;
  return itemStart ?? null;
};

const getSubscriptionInterval = (subscription: Stripe.Subscription) => {
  const recurring = subscription.items?.data?.[0]?.price?.recurring ?? null;
  return recurring?.interval ?? null;
};

const getSubscriptionIntervalCount = (subscription: Stripe.Subscription) => {
  const recurring = subscription.items?.data?.[0]?.price?.recurring ?? null;
  return recurring?.interval_count ?? null;
};

const handler = withAuth(async (req: Request, payload: JWTPayload): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const userId = getUserId(payload);
  console.log('[stripe-subscription-status] userId:', userId);

  try {
    const { data: userRow, error } = await supabaseAdmin
      .from('users')
      .select(
        'stripe_customer_id, stripe_subscription_id, subscription_status, subscription_current_period_end, subscription_current_period_start, subscription_cancel_at_period_end, subscription_interval, subscription_interval_count, is_premium'
      )
      .eq('id', userId)
      .single();

    if (error || !userRow) {
      console.error('[stripe-subscription-status] User not found:', error);
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let responsePayload = {
      isPremium: Boolean(userRow.is_premium),
      status: userRow.subscription_status ?? null,
      currentPeriodEnd: userRow.subscription_current_period_end ?? null,
      currentPeriodStart: userRow.subscription_current_period_start ?? null,
      cancelAtPeriodEnd: userRow.subscription_cancel_at_period_end ?? false,
      interval: userRow.subscription_interval ?? null,
      intervalCount: userRow.subscription_interval_count ?? null,
      customerId: userRow.stripe_customer_id ?? null,
      subscriptionId: userRow.stripe_subscription_id ?? null,
    };

    if (stripe && userRow.stripe_subscription_id) {
      try {
        const subscription = await stripe.subscriptions.retrieve(
          userRow.stripe_subscription_id,
          { expand: ['items.data.price'] }
        );

        const refreshed = {
          subscription_status: subscription.status,
          subscription_current_period_end: toISOStringFromUnix(
            getSubscriptionPeriodEnd(subscription)
          ),
          subscription_current_period_start: toISOStringFromUnix(
            getSubscriptionPeriodStart(subscription)
          ),
          subscription_cancel_at_period_end: subscription.cancel_at_period_end ?? false,
          subscription_interval: getSubscriptionInterval(subscription),
          subscription_interval_count: getSubscriptionIntervalCount(subscription),
          is_premium: statusToPremium(subscription.status),
        };

        await supabaseAdmin
          .from('users')
          .update(refreshed)
          .eq('id', userId);

        responsePayload = {
          ...responsePayload,
          isPremium: Boolean(refreshed.is_premium),
          status: refreshed.subscription_status ?? null,
          currentPeriodEnd: refreshed.subscription_current_period_end ?? null,
          currentPeriodStart: refreshed.subscription_current_period_start ?? null,
          cancelAtPeriodEnd: refreshed.subscription_cancel_at_period_end ?? false,
          interval: refreshed.subscription_interval ?? null,
          intervalCount: refreshed.subscription_interval_count ?? null,
        };
      } catch (error) {
        console.warn('[stripe-subscription-status] Stripe refresh failed:', error);
      }
    }

    return new Response(JSON.stringify(responsePayload), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[stripe-subscription-status] Error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: 'Failed to load subscription status', details: message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

Deno.serve(handler);
