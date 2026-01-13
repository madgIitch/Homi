// supabase/functions/push-new-message/index.ts
import { corsHeaders } from '../_shared/cors.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';

interface WebhookPayload<T> {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  schema: string;
  record: T | null;
  old_record: T | null;
}

interface MessageRecord {
  id: string;
  chat_id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

interface PushTokenRow {
  token: string;
  provider: string;
  platform: string;
}

const FCM_SERVICE_ACCOUNT_JSON = Deno.env.get('FCM_SERVICE_ACCOUNT_JSON') ?? '';
const WEBHOOK_SECRET = Deno.env.get('PUSH_WEBHOOK_SECRET') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';

interface SenderProfile {
  avatar_url?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  users?: {
    first_name?: string | null;
    last_name?: string | null;
  } | null;
}

const truncate = (value: string, max: number) =>
  value.length > max ? `${value.slice(0, max - 3)}...` : value;

const buildProfileName = (profile?: SenderProfile | null) => {
  const firstName = profile?.users?.first_name ?? profile?.first_name ?? '';
  const lastName = profile?.users?.last_name ?? profile?.last_name ?? '';
  return [firstName, lastName].map((value) => value.trim()).filter(Boolean).join(' ');
};

const base64UrlEncode = (input: Uint8Array) => {
  let binary = '';
  input.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(new RegExp('=+$'), '');
};

const pemToArrayBuffer = (pem: string) => {
  const cleaned = pem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s+/g, '');
  const binary = atob(cleaned);
  const buffer = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    buffer[i] = binary.charCodeAt(i);
  }
  return buffer.buffer;
};

const signJwt = async (payload: Record<string, unknown>, privateKey: string) => {
  const header = { alg: 'RS256', typ: 'JWT' };
  const encoder = new TextEncoder();
  const headerEncoded = base64UrlEncode(encoder.encode(JSON.stringify(header)));
  const payloadEncoded = base64UrlEncode(encoder.encode(JSON.stringify(payload)));
  const data = `${headerEncoded}.${payloadEncoded}`;

  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(privateKey),
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    encoder.encode(data)
  );
  const signatureEncoded = base64UrlEncode(new Uint8Array(signature));
  return `${data}.${signatureEncoded}`;
};

const getAccessToken = async (serviceAccount: {
  client_email: string;
  private_key: string;
  token_uri: string;
}) => {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: serviceAccount.token_uri,
    iat: now,
    exp: now + 3600,
  };

  const assertion = await signJwt(payload, serviceAccount.private_key);
  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion,
  });

  const response = await fetch(serviceAccount.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`FCM token error: ${JSON.stringify(data)}`);
  }

  return data.access_token as string;
};

const sendFcmV1 = async (
  token: string,
  payload: Record<string, unknown>,
  accessToken: string,
  projectId: string
) => {
  const response = await fetch(
    `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          token,
          notification: payload.notification,
          data: payload.data,
        },
      }),
    }
  );

  const body = await response.text();
  return { ok: response.ok, status: response.status, body };
};

Deno.serve(async (req: Request) => {
  let stage = 'start';
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (WEBHOOK_SECRET) {
    const secret = req.headers.get('x-webhook-secret') ?? '';
    if (secret !== WEBHOOK_SECRET) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  try {
    const payload = (await req.json()) as WebhookPayload<MessageRecord>;
    const record = payload.record;
    stage = 'payload_parsed';

    if (!record || payload.type !== 'INSERT') {
      return new Response(JSON.stringify({ status: 'ignored' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    stage = 'fetch_chat';
    const { data: chat, error: chatError } = await supabaseAdmin
      .from('chats')
      .select('match_id')
      .eq('id', record.chat_id)
      .single();

    if (chatError || !chat?.match_id) {
      return new Response(
        JSON.stringify({ error: 'Chat match not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    stage = 'fetch_match';
    const { data: match, error: matchError } = await supabaseAdmin
      .from('matches')
      .select('user_a_id, user_b_id')
      .eq('id', chat.match_id)
      .single();

    if (matchError || !match) {
      return new Response(
        JSON.stringify({ error: 'Match not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const userA = match.user_a_id as string;
    const userB = match.user_b_id as string;
    const recipientId =
      record.sender_id === userA ? userB : record.sender_id === userB ? userA : '';

    if (!recipientId) {
      return new Response(JSON.stringify({ status: 'ignored' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    stage = 'fetch_sender_profile';
    const { data: senderProfile } = await supabaseAdmin
      .from('profiles')
      .select('avatar_url, users!profiles_id_fkey(first_name, last_name)')
      .eq('id', record.sender_id)
      .single();

    const senderName =
      buildProfileName(senderProfile as SenderProfile | null) || 'Nuevo mensaje';
    const senderAvatar =
      (senderProfile as SenderProfile | null)?.avatar_url ?? null;
    const senderAvatarUrl =
      senderAvatar && senderAvatar.startsWith('http')
        ? senderAvatar
        : senderAvatar && SUPABASE_URL
        ? `${SUPABASE_URL}/storage/v1/object/public/avatars/${senderAvatar}`
        : null;

    stage = 'fetch_tokens';
    const { data: tokens, error: tokenError } = await supabaseAdmin
      .from('push_tokens')
      .select('token, provider, platform')
      .eq('user_id', recipientId);

    if (tokenError) {
      return new Response(JSON.stringify({ error: tokenError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const fcmTokens = (tokens ?? []).filter(
      (row: PushTokenRow) => row.provider === 'fcm'
    );

    if (fcmTokens.length === 0) {
      return new Response(JSON.stringify({ status: 'no_tokens' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!FCM_SERVICE_ACCOUNT_JSON) {
      return new Response(
        JSON.stringify({
          status: 'skipped',
          reason: 'missing_fcm_service_account',
          tokens: fcmTokens.length,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    stage = 'prepare_payload';
    const messageBody = truncate(record.body ?? '', 120);
    const payloadToSend = {
      notification: {
        title: senderName,
        body: messageBody || 'Tienes un nuevo mensaje',
      },
      data: {
        chat_id: String(record.chat_id),
        sender_id: String(record.sender_id),
        message_id: String(record.id),
        sender_name: String(senderName),
        sender_avatar_url: senderAvatarUrl ?? '',
        message_body: messageBody || '',
        type: 'new_message',
      },
    };

    stage = 'parse_service_account';
    const serviceAccount = JSON.parse(FCM_SERVICE_ACCOUNT_JSON) as {
      client_email: string;
      private_key: string;
      token_uri: string;
      project_id: string;
    };
    stage = 'get_access_token';
    const accessToken = await getAccessToken(serviceAccount);
    const projectId = serviceAccount.project_id;

    stage = 'send_fcm';
    const results = await Promise.all(
      fcmTokens.map((row) =>
        sendFcmV1(row.token, payloadToSend, accessToken, projectId)
      )
    );

    return new Response(
      JSON.stringify({
        status: 'sent',
        success: results.filter((r) => r.ok).length,
        failures: results.filter((r) => !r.ok).length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[push-new-message] error:', { stage, message });
    return new Response(JSON.stringify({ error: message, stage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
