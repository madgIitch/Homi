// supabase/functions/stripe-webhook/index.ts

import Stripe from 'https://esm.sh/stripe@14.0.0?target=deno';
import { corsHeaders } from '../_shared/cors.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});


type UserRow = {
  id: string;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  subscription_status?: string | null;
  subscription_current_period_end?: string | null;
  subscription_current_period_start?: string | null;
  subscription_cancel_at_period_end?: boolean | null;
  subscription_interval?: string | null;
  subscription_interval_count?: number | null;
  is_premium?: boolean | null;
};

type HistoryPayload = {
  stripe_subscription_id: string;
  status: string;
  plan_id: string;
  amount: number;
  currency: string;
};

const parseCurrency = (value?: string | null) =>
  (value ?? 'eur').toLowerCase();

const priceToAmount = (unitAmount?: number | null) =>
  typeof unitAmount === 'number' ? unitAmount / 100 : 0;

const subscriptionToHistory = (subscription: Stripe.Subscription): HistoryPayload => {
  const price = subscription.items?.data?.[0]?.price ?? null;
  return {
    stripe_subscription_id: subscription.id,
    status: subscription.status,
    plan_id: price?.id ?? 'unknown',
    amount: priceToAmount(price?.unit_amount ?? null),
    currency: parseCurrency(price?.currency ?? 'eur'),
  };
};

const invoiceToHistory = (
  invoice: Stripe.Invoice,
  fallbackSubscriptionId: string
): HistoryPayload => {
  const price = invoice.lines?.data?.[0]?.price ?? null;
  return {
    stripe_subscription_id: fallbackSubscriptionId,
    status: invoice.status ?? 'past_due',
    plan_id: price?.id ?? 'unknown',
    amount: priceToAmount(price?.unit_amount ?? invoice.amount_due ?? null),
    currency: parseCurrency(price?.currency ?? invoice.currency ?? 'eur'),
  };
};

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
  const itemEnd =
    subscription.items?.data?.[0]?.current_period_end ?? null;
  return itemEnd ?? null;
};

const getSubscriptionPeriodStart = (subscription: Stripe.Subscription) => {
  const topLevel = (subscription as any).current_period_start as number | null | undefined;
  if (typeof topLevel === 'number') return topLevel;
  const itemStart =
    subscription.items?.data?.[0]?.current_period_start ?? null;
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

async function findUserByIdentifiers(options: {
  userId?: string | null;
  subscriptionId?: string | null;
  customerId?: string | null;
}): Promise<UserRow | null> {
  const { userId, subscriptionId, customerId } = options;

  if (userId) {
    const { data } = await supabaseAdmin
      .from('users')
      .select(
        'id, stripe_customer_id, stripe_subscription_id, subscription_status, subscription_current_period_end, subscription_current_period_start, subscription_cancel_at_period_end, subscription_interval, subscription_interval_count, is_premium'
      )
      .eq('id', userId)
      .single();
    return data as UserRow | null;
  }

  if (subscriptionId) {
    const { data } = await supabaseAdmin
      .from('users')
      .select(
        'id, stripe_customer_id, stripe_subscription_id, subscription_status, subscription_current_period_end, subscription_current_period_start, subscription_cancel_at_period_end, subscription_interval, subscription_interval_count, is_premium'
      )
      .eq('stripe_subscription_id', subscriptionId)
      .single();
    if (data) {
      return data as UserRow;
    }
  }

  if (customerId) {
    const { data } = await supabaseAdmin
      .from('users')
      .select(
        'id, stripe_customer_id, stripe_subscription_id, subscription_status, subscription_current_period_end, subscription_current_period_start, subscription_cancel_at_period_end, subscription_interval, subscription_interval_count, is_premium'
      )
      .eq('stripe_customer_id', customerId)
      .single();
    return data as UserRow | null;
  }

  return null;
}

async function updateUserAndHistory(
  userId: string,
  updates: Partial<UserRow>,
  history: HistoryPayload
): Promise<void> {
  const { data: previous, error: readError } = await supabaseAdmin
    .from('users')
    .select(
      'stripe_customer_id, stripe_subscription_id, subscription_status, subscription_current_period_end, subscription_current_period_start, subscription_cancel_at_period_end, subscription_interval, subscription_interval_count, is_premium'
    )
    .eq('id', userId)
    .single();

  if (readError || !previous) {
    throw new Error('Failed to load current user state');
  }

  const { error: updateError } = await supabaseAdmin
    .from('users')
    .update(updates)
    .eq('id', userId);

  if (updateError) {
    throw new Error(`Failed to update user: ${updateError.message}`);
  }

  if (typeof updates.is_premium === 'boolean') {
    const { error: profileUpdateError } = await supabaseAdmin
      .from('profiles')
      .update({ is_premium: updates.is_premium })
      .eq('id', userId);

    if (profileUpdateError) {
      throw new Error(`Failed to update profile: ${profileUpdateError.message}`);
    }
  }

  const { error: historyError } = await supabaseAdmin
    .from('subscription_history')
    .insert({
      user_id: userId,
      stripe_subscription_id: history.stripe_subscription_id,
      status: history.status,
      plan_id: history.plan_id,
      amount: history.amount,
      currency: history.currency,
    });

  if (historyError) {
    console.error('[stripe-webhook] History insert failed, rolling back:', historyError);
    await supabaseAdmin
      .from('users')
      .update({
        stripe_customer_id: previous.stripe_customer_id ?? null,
        stripe_subscription_id: previous.stripe_subscription_id ?? null,
        subscription_status: previous.subscription_status ?? null,
        subscription_current_period_end: previous.subscription_current_period_end ?? null,
        subscription_current_period_start: previous.subscription_current_period_start ?? null,
        subscription_cancel_at_period_end: previous.subscription_cancel_at_period_end ?? false,
        subscription_interval: previous.subscription_interval ?? null,
        subscription_interval_count: previous.subscription_interval_count ?? null,
        is_premium: previous.is_premium ?? false,
      })
      .eq('id', userId);
    await supabaseAdmin
      .from('profiles')
      .update({ is_premium: previous.is_premium ?? false })
      .eq('id', userId);
    throw new Error(`Failed to insert subscription history: ${historyError.message}`);
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const subscriptionId =
    typeof session.subscription === 'string' ? session.subscription : null;
  const customerId =
    typeof session.customer === 'string' ? session.customer : null;
  const userId = session.metadata?.userId ?? null;

  if (!subscriptionId || !customerId) {
    console.log('[stripe-webhook] checkout.session.completed missing IDs');
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const user = await findUserByIdentifiers({
    userId,
    subscriptionId,
    customerId,
  });

  if (!user) {
    console.log('[stripe-webhook] No user found for checkout session', {
      userId,
      subscriptionId,
      customerId,
    });
    return;
  }

  const updates: Partial<UserRow> = {
    stripe_customer_id: customerId,
    stripe_subscription_id: subscriptionId,
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

  await updateUserAndHistory(
    user.id,
    updates,
    subscriptionToHistory(subscription)
  );
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId =
    typeof subscription.customer === 'string' ? subscription.customer : null;

  const user = await findUserByIdentifiers({
    subscriptionId: subscription.id,
    customerId,
  });

  if (!user) {
    console.log('[stripe-webhook] No user found for subscription update', {
      subscriptionId: subscription.id,
      customerId,
    });
    return;
  }

  const updates: Partial<UserRow> = {
    stripe_customer_id: customerId ?? user.stripe_customer_id ?? null,
    stripe_subscription_id: subscription.id,
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

  await updateUserAndHistory(
    user.id,
    updates,
    subscriptionToHistory(subscription)
  );
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId =
    typeof subscription.customer === 'string' ? subscription.customer : null;

  const user = await findUserByIdentifiers({
    subscriptionId: subscription.id,
    customerId,
  });

  if (!user) {
    console.log('[stripe-webhook] No user found for subscription delete', {
      subscriptionId: subscription.id,
      customerId,
    });
    return;
  }

  const updates: Partial<UserRow> = {
    subscription_status: 'canceled',
    subscription_current_period_end: toISOStringFromUnix(
      getSubscriptionPeriodEnd(subscription)
    ),
    subscription_current_period_start: toISOStringFromUnix(
      getSubscriptionPeriodStart(subscription)
    ),
    subscription_cancel_at_period_end: false,
    subscription_interval: getSubscriptionInterval(subscription),
    subscription_interval_count: getSubscriptionIntervalCount(subscription),
    is_premium: false,
  };

  await updateUserAndHistory(
    user.id,
    updates,
    subscriptionToHistory({
      ...subscription,
      status: 'canceled',
    } as Stripe.Subscription)
  );
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const customerId =
    typeof invoice.customer === 'string' ? invoice.customer : null;
  const subscriptionId =
    typeof invoice.subscription === 'string' ? invoice.subscription : null;

  if (!subscriptionId) {
    console.log('[stripe-webhook] invoice.payment_failed missing subscription');
    return;
  }

  const user = await findUserByIdentifiers({
    subscriptionId,
    customerId,
  });

  if (!user) {
    console.log('[stripe-webhook] No user found for payment failure', {
      subscriptionId,
      customerId,
    });
    return;
  }

  const updates: Partial<UserRow> = {
    subscription_status: 'past_due',
    is_premium: false,
  };

  await updateUserAndHistory(
    user.id,
    updates,
    invoiceToHistory(invoice, subscriptionId)
  );
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId =
    typeof invoice.customer === 'string' ? invoice.customer : null;
  const subscriptionId =
    typeof invoice.subscription === 'string' ? invoice.subscription : null;

  if (!subscriptionId) {
    console.log('[stripe-webhook] invoice.payment_succeeded missing subscription');
    return;
  }

  const user = await findUserByIdentifiers({
    subscriptionId,
    customerId,
  });

  if (!user) {
    console.log('[stripe-webhook] No user found for payment success', {
      subscriptionId,
      customerId,
    });
    return;
  }

  const updates: Partial<UserRow> = {
    subscription_status: 'active',
    is_premium: true,
  };

  await updateUserAndHistory(
    user.id,
    updates,
    invoiceToHistory(invoice, subscriptionId)
  );
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
    return new Response(JSON.stringify({ error: 'Stripe webhook config missing' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const signature = req.headers.get('Stripe-Signature');
  if (!signature) {
    return new Response(JSON.stringify({ error: 'Missing Stripe signature' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let event: Stripe.Event;
  let rawBody = '';
  try {
    rawBody = await req.text();
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    console.error('[stripe-webhook] Signature verification failed:', error);
    return new Response(JSON.stringify({ error: 'Invalid signature' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  console.log('[stripe-webhook] event:', event.type);

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
      default:
        console.log('[stripe-webhook] Unhandled event type:', event.type);
    }
  } catch (error) {
    console.error('[stripe-webhook] Processing error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: 'Webhook processing failed', details: message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
};

Deno.serve(handler);
