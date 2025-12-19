// supabase/functions/profiles-recommendations/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { withAuth, getUserId } from '../_shared/auth.ts';
import type {
  Profile,
  RecommendationResponse,
  RoomRecommendation,
  JWTPayload,
} from '../_shared/types.ts';

/**
 * Edge Function para generar recomendaciones de perfiles en HomiMatch.
 * Devuelve todos los perfiles (menos el propio) para el swipe.
 */

const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

function extractAvatarPath(avatarUrl: string): string | null {
  if (!avatarUrl) return null;
  if (!avatarUrl.startsWith('http')) return avatarUrl;

  try {
    const url = new URL(avatarUrl);
    const pathname = url.pathname;
    const prefixes = [
      '/storage/v1/object/sign/avatars/',
      '/storage/v1/object/public/avatars/',
      '/storage/v1/object/avatars/',
    ];

    for (const prefix of prefixes) {
      const index = pathname.indexOf(prefix);
      if (index !== -1) {
        return pathname.substring(index + prefix.length);
      }
    }
  } catch (error) {
    console.error('[profiles-recommendations] Failed to parse avatar_url:', error);
  }

  return null;
}

async function getSignedAvatarUrl(avatarUrl: string): Promise<string | null> {
  const path = extractAvatarPath(avatarUrl);
  if (!path) return null;

  const { data, error } = await supabaseClient.storage
    .from('avatars')
    .createSignedUrl(path, 60 * 60);

  if (error || !data?.signedUrl) {
    console.error('[profiles-recommendations] Signed URL error:', error);
    return null;
  }

  return data.signedUrl;
}

function calculateProfileCompatibilityScore(
  seekerProfile: Profile,
  targetProfile: Profile
): number {
  let score = 0;

  if (seekerProfile.gender && targetProfile.gender) {
    score += seekerProfile.gender === targetProfile.gender ? 0.5 : 0.2;
  }

  if (seekerProfile.occupation && targetProfile.occupation) {
    score += seekerProfile.occupation === targetProfile.occupation ? 0.3 : 0.1;
  }

  if (
    seekerProfile.smoker !== undefined &&
    targetProfile.smoker !== undefined
  ) {
    score += seekerProfile.smoker === targetProfile.smoker ? 0.2 : 0.05;
  }

  return Math.min(1, Math.max(0, score));
}

function generateProfileMatchReasons(
  seekerProfile: Profile,
  targetProfile: Profile
): string[] {
  const reasons: string[] = [];

  if (
    seekerProfile.gender &&
    targetProfile.gender &&
    seekerProfile.gender === targetProfile.gender
  ) {
    reasons.push(`Mismo genero: ${targetProfile.gender}`);
  }

  if (
    seekerProfile.occupation &&
    targetProfile.occupation &&
    seekerProfile.occupation === targetProfile.occupation
  ) {
    reasons.push(`Misma ocupacion: ${targetProfile.occupation}`);
  }

  if (seekerProfile.smoker !== undefined && targetProfile.smoker !== undefined) {
    if (seekerProfile.smoker === targetProfile.smoker) {
      reasons.push(seekerProfile.smoker ? 'Ambos son fumadores' : 'Ninguno fuma');
    } else {
      reasons.push('Diferentes habitos de fumar');
    }
  }

  if (
    seekerProfile.has_pets !== undefined &&
    targetProfile.has_pets !== undefined
  ) {
    if (seekerProfile.has_pets === targetProfile.has_pets) {
      reasons.push(
        seekerProfile.has_pets ? 'Ambos tienen mascotas' : 'Ninguno tiene mascotas'
      );
    }
  }

  return reasons;
}

const handler = withAuth(
  async (req: Request, payload: JWTPayload): Promise<Response> => {
    const userId = getUserId(payload);

    try {
      if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: seekerProfile, error: seekerError } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (seekerError || !seekerProfile) {
        return new Response(JSON.stringify({ error: 'Profile not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: profiles, error: profilesError } = await supabaseClient
        .from('profiles')
        .select('*')
        .neq('id', userId);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch profiles' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const recommendations: RoomRecommendation[] = [];

      for (const profile of profiles || []) {
        if (profile.avatar_url) {
          const signedUrl = await getSignedAvatarUrl(profile.avatar_url);
          if (signedUrl) {
            profile.avatar_url = signedUrl;
          }
        }

        const compatibilityScore = calculateProfileCompatibilityScore(
          seekerProfile,
          profile
        );

        const matchReasons = generateProfileMatchReasons(
          seekerProfile,
          profile
        );

        recommendations.push({
          profile,
          compatibility_score: compatibilityScore,
          match_reasons: matchReasons,
        });
      }

      recommendations.sort(
        (a, b) => b.compatibility_score - a.compatibility_score
      );

      const response: RecommendationResponse = {
        recommendations,
      };

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Profile recommendations function error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return new Response(
        JSON.stringify({
          error: 'Internal server error',
          details: errorMessage,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  }
);

Deno.serve(handler);
