// supabase/functions/profile-photos/index.ts

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { withAuth, getUserId } from '../_shared/auth.ts';
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
    console.error('[profile-photos] Signed URL error:', error);
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
  withAuth(async (req: Request, payload: JWTPayload): Promise<Response> => {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }

    const profileId = getUserId(payload);

    if (req.method === 'GET') {
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
    }

    if (req.method === 'POST') {
      const existing = await listPhotos(profileId);
      if (existing.length >= 10) {
        return new Response(
          JSON.stringify({ error: 'Max photos reached (10)' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

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

      const fileExt = file.name.split('.').pop() || 'jpg';
      const mimeType = file.type || 'image/jpeg';
      const filePath = `${profileId}/photos/${Date.now()}.${fileExt}`;

      const arrayBuffer = await file.arrayBuffer();
      const fileBytes = new Uint8Array(arrayBuffer);

      const { error: uploadError } = await supabaseAdmin.storage
        .from('avatars')
        .upload(filePath, fileBytes, {
          contentType: mimeType,
          upsert: true,
        });

      if (uploadError) {
        console.error('[profile-photos] Upload error:', uploadError);
        return new Response(JSON.stringify({ error: 'Error uploading file' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const isPrimary = existing.length === 0;
      const nextPosition =
        existing.length === 0
          ? 1
          : Math.max(...existing.map((photo) => photo.position || 0)) + 1;

      const { data: inserted, error: insertError } = await supabaseAdmin
        .from('profile_photos')
        .insert({
          profile_id: profileId,
          path: filePath,
          position: nextPosition,
          is_primary: isPrimary,
        })
        .select()
        .single();

      if (insertError || !inserted) {
        console.error('[profile-photos] Insert error:', insertError);
        return new Response(JSON.stringify({ error: 'Error saving photo' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (isPrimary) {
        await supabaseAdmin
          .from('profiles')
          .update({ avatar_url: filePath })
          .eq('id', profileId);
      }

      const signedUrl = await signedUrlForPath(filePath);
      const responseData = {
        ...(inserted as ProfilePhotoRow),
        signedUrl: signedUrl ?? '',
      };

      return new Response(JSON.stringify({ data: responseData }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'PATCH') {
      const body = await req.json();
      const photoId = body?.id as string | undefined;

      if (!photoId) {
        return new Response(JSON.stringify({ error: 'Missing id' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: photo, error: photoError } = await supabaseAdmin
        .from('profile_photos')
        .select('*')
        .eq('id', photoId)
        .eq('profile_id', profileId)
        .single();

      if (photoError || !photo) {
        return new Response(JSON.stringify({ error: 'Photo not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      await supabaseAdmin
        .from('profile_photos')
        .update({ is_primary: false })
        .eq('profile_id', profileId);

      const { data: updated, error: updateError } = await supabaseAdmin
        .from('profile_photos')
        .update({ is_primary: true })
        .eq('id', photoId)
        .select()
        .single();

      if (updateError || !updated) {
        return new Response(
          JSON.stringify({ error: 'Error setting primary photo' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      await supabaseAdmin
        .from('profiles')
        .update({ avatar_url: (updated as ProfilePhotoRow).path })
        .eq('id', profileId);

      const signedUrl = await signedUrlForPath((updated as ProfilePhotoRow).path);
      const responseData = {
        ...(updated as ProfilePhotoRow),
        signedUrl: signedUrl ?? '',
      };

      return new Response(JSON.stringify({ data: responseData }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'DELETE') {
      let body: Record<string, unknown> | null = null;
      try {
        body = await req.json();
      } catch {
        body = null;
      }
      const photoId = (body?.id as string | undefined) ?? undefined;

      if (!photoId) {
        return new Response(JSON.stringify({ error: 'Missing id' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: photo, error: photoError } = await supabaseAdmin
        .from('profile_photos')
        .select('*')
        .eq('id', photoId)
        .eq('profile_id', profileId)
        .single();

      if (photoError || !photo) {
        return new Response(JSON.stringify({ error: 'Photo not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { error: storageError } = await supabaseAdmin.storage
        .from('avatars')
        .remove([photo.path]);

      if (storageError) {
        console.error('[profile-photos] Delete storage error:', storageError);
        return new Response(JSON.stringify({ error: 'Error deleting photo' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { error: deleteError } = await supabaseAdmin
        .from('profile_photos')
        .delete()
        .eq('id', photoId);

      if (deleteError) {
        console.error('[profile-photos] Delete row error:', deleteError);
        return new Response(JSON.stringify({ error: 'Error deleting photo' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if ((photo as ProfilePhotoRow).is_primary) {
        const remaining = await listPhotos(profileId);
        if (remaining.length > 0) {
          await supabaseAdmin
            .from('profile_photos')
            .update({ is_primary: false })
            .eq('profile_id', profileId);

          const nextPrimary = remaining[0];
          await supabaseAdmin
            .from('profile_photos')
            .update({ is_primary: true })
            .eq('id', nextPrimary.id);

          await supabaseAdmin
            .from('profiles')
            .update({ avatar_url: nextPrimary.path })
            .eq('id', profileId);
        } else {
          await supabaseAdmin
            .from('profiles')
            .update({ avatar_url: null })
            .eq('id', profileId);
        }
      }

      return new Response(JSON.stringify({ success: true }), {
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
