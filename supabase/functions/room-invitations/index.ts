// supabase/functions/room-invitations/index.ts

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { withAuth, getUserId } from '../_shared/auth.ts';
import type { JWTPayload } from '../_shared/types.ts';

const INVITE_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const INVITE_CODE_LENGTH = 8;
const MAX_GENERATION_ATTEMPTS = 5;

function generateInviteCode(): string {
  const bytes = new Uint8Array(INVITE_CODE_LENGTH);
  crypto.getRandomValues(bytes);
  let code = '';
  for (let i = 0; i < bytes.length; i += 1) {
    const index = bytes[i] % INVITE_CODE_ALPHABET.length;
    code += INVITE_CODE_ALPHABET[index];
  }
  return code;
}

async function isRoomOwner(roomId: string, ownerId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('rooms')
    .select('owner_id')
    .eq('id', roomId)
    .single();

  if (error || !data?.owner_id) return false;
  return data.owner_id === ownerId;
}

async function isCommonArea(roomId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('room_extras')
    .select('category')
    .eq('room_id', roomId)
    .limit(1);

  if (error) return false;
  const row = Array.isArray(data) ? data[0] : null;
  return row?.category === 'area_comun';
}

async function hasAcceptedAssignment(roomId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('room_assignments')
    .select('id')
    .eq('room_id', roomId)
    .eq('status', 'accepted')
    .limit(1);

  if (error) return false;
  return (data ?? []).length > 0;
}

serve(
  withAuth(async (req: Request, payload: JWTPayload): Promise<Response> => {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = getUserId(payload);
    const body = await req.json();
    const roomId = body?.room_id as string | undefined;
    const expiresInHours = Number(body?.expires_in_hours ?? 0);

    if (!roomId) {
      return new Response(JSON.stringify({ error: 'room_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!(await isRoomOwner(roomId, userId))) {
      return new Response(JSON.stringify({ error: 'Room not found or unauthorized' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (await isCommonArea(roomId)) {
      return new Response(JSON.stringify({ error: 'Invitations only apply to rooms' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (await hasAcceptedAssignment(roomId)) {
      return new Response(JSON.stringify({ error: 'Room already assigned' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const expiresAt =
      Number.isFinite(expiresInHours) && expiresInHours > 0
        ? new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString()
        : null;

    let invite = null;
    for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt += 1) {
      const code = generateInviteCode();
      const { data, error } = await supabaseAdmin
        .from('room_invitations')
        .insert({
          room_id: roomId,
          owner_id: userId,
          code,
          expires_at: expiresAt,
        })
        .select('id, room_id, owner_id, code, expires_at, created_at')
        .single();

      if (!error && data) {
        invite = data;
        break;
      }

      const message = error?.message ?? '';
      if (!message.toLowerCase().includes('duplicate')) {
        return new Response(JSON.stringify({ error: 'Failed to create invitation' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    if (!invite) {
      return new Response(JSON.stringify({ error: 'Failed to generate invitation code' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({ data: invite }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  })
);
