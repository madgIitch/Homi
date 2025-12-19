// supabase/functions/room-photos/index.ts

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { withAuth, getUserId } from '../_shared/auth.ts';
import type { JWTPayload } from '../_shared/types.ts';

interface RoomRow {
  id: string;
  owner_id: string;
}

async function signedUrlForPath(path: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin.storage
    .from('room-photos')
    .createSignedUrl(path, 60 * 60);

  if (error || !data?.signedUrl) {
    console.error('[room-photos] Signed URL error:', error);
    return null;
  }

  return data.signedUrl;
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

  return (data as RoomRow).owner_id === userId;
}

serve(
  withAuth(async (req: Request, payload: JWTPayload): Promise<Response> => {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }

    const userId = getUserId(payload);

    if (req.method === 'POST') {
      const contentType = req.headers.get('content-type') || '';
      if (!contentType.toLowerCase().includes('multipart/form-data')) {
        return new Response(
          JSON.stringify({
            error: 'Invalid content type. Expected multipart/form-data',
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const formData = await req.formData();
      const file = formData.get('photo');
      const roomId = formData.get('room_id');

      if (!roomId || typeof roomId !== 'string') {
        return new Response(JSON.stringify({ error: 'room_id is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!file || !(file instanceof File)) {
        return new Response(
          JSON.stringify({
            error: 'No file provided or invalid field name (expected "photo")',
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const isOwner = await ensureRoomOwnership(roomId, userId);
      if (!isOwner) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const fileExt = file.name.split('.').pop() || 'jpg';
      const mimeType = file.type || 'image/jpeg';
      const filePath = `${roomId}/photos/${Date.now()}.${fileExt}`;

      const arrayBuffer = await file.arrayBuffer();
      const fileBytes = new Uint8Array(arrayBuffer);

      const { error: uploadError } = await supabaseAdmin.storage
        .from('room-photos')
        .upload(filePath, fileBytes, {
          contentType: mimeType,
          upsert: true,
        });

      if (uploadError) {
        console.error('[room-photos] Upload error:', uploadError);
        return new Response(JSON.stringify({ error: 'Error uploading file' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const signedUrl = await signedUrlForPath(filePath);

      return new Response(
        JSON.stringify({
          data: {
            path: filePath,
            signedUrl: signedUrl ?? '',
          },
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  })
);
