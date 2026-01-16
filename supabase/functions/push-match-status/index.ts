// supabase/functions/push-match-status/index.ts
import { corsHeaders } from '../_shared/cors.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';

interface WebhookPayload<T> {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  schema: string;
  record: T | null;
  old_record: T | null;
}

interface MatchRecord {
  id: string;
  user_a_id: string;
  user_b_id: string;
  status: string | null;
}

interface PushTokenRow {
  user_id: string;
  token: string;
  provider: string;
}

interface ProfileRow {
  id: string;
  avatar_url?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  users?: {
    first_name?: string | null;
    last_name?: string | null;
  } | null;
}

const FCM_SERVICE_ACCOUNT_JSON = Deno.env.get('FCM_SERVICE_ACCOUNT_JSON') ?? '';
const WEBHOOK_SECRET = Deno.env.get('PUSH_WEBHOOK_SECRET') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';

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

const resolveAvatarUrl = (avatarUrl?: string | null) => {
  if (!avatarUrl) return null;
  if (avatarUrl.startsWith('http')) return avatarUrl;
  if (!SUPABASE_URL) return null;
  return `${SUPABASE_URL}/storage/v1/object/public/avatars/${avatarUrl}`;
};

const buildProfileName = (profile?: ProfileRow | null) => {
  const firstName = profile?.users?.first_name ?? profile?.first_name ?? '';
  const lastName = profile?.users?.last_name ?? profile?.last_name ?? '';
  return [firstName, lastName].map((value) => value.trim()).filter(Boolean).join(' ');
};

const statusContent = (status: string, otherName: string) => {
  switch (status) {
    case 'accepted':
      return {
        title: `Match con ${otherName}`,
        body: 'Tu match ha sido confirmado.',
      };
    case 'rejected':
      return {
        title: `Match con ${otherName}`,
        body: 'Este match ha sido rechazado.',
      };
    case 'room_offer':
      return {
        title: `Oferta de habitacion`,
        body: `${otherName} te ha hecho una oferta.`,
      };
    case 'room_assigned':
      return {
        title: 'Habitacion asignada',
        body: `${otherName} ha asignado una habitacion.`,
      };
    case 'room_declined':
      return {
        title: 'Oferta rechazada',
        body: `${otherName} rechazo la oferta.`,
      };
    case 'unmatched':
      return {
        title: 'Match eliminado',
        body: 'Ya no puedes enviar mensajes a esta persona.',
      };
    default:
      return {
        title: `Nuevo match con ${otherName}`,
        body: 'Ya puedes chatear.',
      };
  }
};

Deno.serve(async (req: Request) => {
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
    const payload = (await req.json()) as WebhookPayload<MatchRecord>;
    const record = payload.record;
    if (!record) {
      return new Response(JSON.stringify({ status: 'ignored' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const status = record.status ?? 'pending';
    const oldStatus = payload.old_record?.status ?? null;

    if (payload.type === 'UPDATE' && oldStatus === status) {
      return new Response(JSON.stringify({ status: 'ignored' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (status === 'pending') {
      return new Response(JSON.stringify({ status: 'ignored' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userIds = [record.user_a_id, record.user_b_id];
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, avatar_url, users!profiles_id_fkey(first_name, last_name)')
      .in('id', userIds);

    const profileMap = new Map<string, ProfileRow>();
    (profiles ?? []).forEach((row) => {
      profileMap.set(row.id, row as ProfileRow);
    });

    const { data: tokens, error: tokenError } = await supabaseAdmin
      .from('push_tokens')
      .select('user_id, token, provider')
      .in('user_id', userIds);

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

    const serviceAccount = JSON.parse(FCM_SERVICE_ACCOUNT_JSON) as {
      client_email: string;
      private_key: string;
      token_uri: string;
      project_id: string;
    };
    const accessToken = await getAccessToken(serviceAccount);
    const projectId = serviceAccount.project_id;

    let success = 0;
    let failures = 0;

    for (const recipientId of userIds) {
      const otherId =
        recipientId === record.user_a_id
          ? record.user_b_id
          : record.user_a_id;
      const otherProfile = profileMap.get(otherId);
      const otherName = buildProfileName(otherProfile) || 'HomiMatch';
      const otherAvatarUrl = resolveAvatarUrl(otherProfile?.avatar_url ?? null);
      const { title, body } = statusContent(status, otherName);

      const dataPayload = {
        type: 'match_status',
        match_id: String(record.id),
        status: String(status),
        other_user_id: String(otherId),
        other_name: String(otherName),
        other_avatar_url: otherAvatarUrl ?? '',
      };

      const recipientTokens = fcmTokens.filter(
        (row) => row.user_id === recipientId
      );

      const results = await Promise.all(
        recipientTokens.map((row) =>
          sendFcmV1(
            row.token,
            {
              notification: { title, body },
              data: dataPayload,
            },
            accessToken,
            projectId
          )
        )
      );

      success += results.filter((r) => r.ok).length;
      failures += results.filter((r) => !r.ok).length;
    }

    return new Response(
      JSON.stringify({
        status: 'sent',
        success,
        failures,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[push-match-status] error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
