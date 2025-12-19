// supabase/functions/room-extras/index.ts

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { withAuth, getUserId } from '../_shared/auth.ts';
import type { JWTPayload } from '../_shared/types.ts';

interface RoomExtrasRow {
  id: string;
  room_id: string;
  category?: string | null;
  room_type?: string | null;
  common_area_type?: string | null;
  common_area_custom?: string | null;
  photos: string[];
  created_at: string;
  updated_at: string;
}

async function signedUrlForPath(path: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin.storage
    .from('room-photos')
    .createSignedUrl(path, 60 * 60);

  if (error || !data?.signedUrl) {
    console.error('[room-extras] Signed URL error:', error);
    return null;
  }

  return data.signedUrl;
}

async function getRoomExtras(roomIds: string[]): Promise<RoomExtrasRow[]> {
  const { data, error } = await supabaseAdmin
    .from('room_extras')
    .select('*')
    .in('room_id', roomIds);

  if (error || !data) {
    return [];
  }

  return data as RoomExtrasRow[];
}

async function getExistingRoomIds(roomIds: string[]): Promise<string[]> {
  const { data, error } = await supabaseAdmin
    .from('rooms')
    .select('id')
    .in('id', roomIds);

  if (error || !data) {
    return [];
  }

  return data.map((row) => row.id);
}

async function ensureRoomOwnership(roomId: string, userId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('rooms')
    .select('id, owner_id')
    .eq('id', roomId)
    .single();

  if (error || !data) {
    return false;
  }

  return data.owner_id === userId;
}

serve(
  withAuth(async (req: Request, payload: JWTPayload): Promise<Response> => {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }

    const userId = getUserId(payload);
    const url = new URL(req.url);

    if (req.method === 'GET') {
      const roomId = url.searchParams.get('room_id');
      const roomIdsParam = url.searchParams.get('room_ids');

      const roomIds = roomId
        ? [roomId]
        : roomIdsParam
        ? roomIdsParam.split(',').map((id) => id.trim()).filter(Boolean)
        : [];

      if (roomIds.length === 0) {
        return new Response(JSON.stringify({ error: 'room_id is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const existingIds = await getExistingRoomIds(roomIds);
      if (existingIds.length === 0) {
        return new Response(JSON.stringify({ data: [] }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const rows = await getRoomExtras(existingIds);
      const data = await Promise.all(
        rows.map(async (row) => ({
          ...row,
          photos: await Promise.all(
            (row.photos || []).map(async (path) => ({
              path,
              signedUrl: (await signedUrlForPath(path)) ?? '',
            }))
          ),
        }))
      );

      return new Response(JSON.stringify({ data }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'POST' || req.method === 'PUT') {
      const body = await req.json();
      const roomId = body?.room_id as string | undefined;

      if (!roomId) {
        return new Response(JSON.stringify({ error: 'room_id is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const isOwner = await ensureRoomOwnership(roomId, userId);
      if (!isOwner) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const payloadData = {
        room_id: roomId,
        category: body.category ?? null,
        room_type: body.room_type ?? null,
        common_area_type: body.common_area_type ?? null,
        common_area_custom: body.common_area_custom ?? null,
        photos: Array.isArray(body.photos) ? body.photos : [],
      };

      const { data, error } = await supabaseAdmin
        .from('room_extras')
        .upsert(payloadData, { onConflict: 'room_id' })
        .select()
        .single();

      if (error || !data) {
        console.error('[room-extras] Upsert error:', error);
        return new Response(JSON.stringify({ error: 'Error saving extras' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const responseData = {
        ...(data as RoomExtrasRow),
        photos: await Promise.all(
          (data as RoomExtrasRow).photos.map(async (path) => ({
            path,
            signedUrl: (await signedUrlForPath(path)) ?? '',
          }))
        ),
      };

      return new Response(JSON.stringify({ data: responseData }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  })
);
