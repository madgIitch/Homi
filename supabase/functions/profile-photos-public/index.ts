// supabase/functions/profile-photos-public/index.ts

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { withAuth } from '../_shared/auth.ts';
import type { JWTPayload } from '../_shared/types.ts';

interface ProfilePhotoRow {
  id: string;
  profile_id: string;
  path: string;
  position: number;
  is_primary: boolean;
  created_at: string;
}

async function signedUrlForPath(path: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin.storage
    .from('avatars')
    .createSignedUrl(path, 60 * 60);

  if (error || !data?.signedUrl) {
    console.error('[profile-photos-public] Signed URL error:', error);
    return null;
  }

  return data.signedUrl;
}

async function listPhotos(profileId: string): Promise<ProfilePhotoRow[]> {
  const { data, error } = await supabaseAdmin
    .from('profile_photos')
    .select('*')
    .eq('profile_id', profileId)
    .order('is_primary', { ascending: false })
    .order('position', { ascending: true })
    .order('created_at', { ascending: true });

  if (error || !data) {
    return [];
  }

  return data as ProfilePhotoRow[];
}

serve(
  withAuth(async (req: Request, _payload: JWTPayload): Promise<Response> => {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }

    if (req.method !== 'GET') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    const profileId = url.searchParams.get('profile_id');

    if (!profileId) {
      return new Response(JSON.stringify({ error: 'Missing profile_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const rows = await listPhotos(profileId);
    const data = await Promise.all(
      rows.map(async (row) => ({
        ...row,
        signedUrl: (await signedUrlForPath(row.path)) ?? '',
      }))
    );

    return new Response(JSON.stringify({ data }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  })
);
