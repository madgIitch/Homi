// supabase/functions/profile-share-image/index.ts
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import React from 'https://esm.sh/react@18.2.0';
import { ImageResponse } from 'https://deno.land/x/og_edge@0.0.6/mod.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { withAuth, getUserId } from '../_shared/auth.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';
import type { JWTPayload, Profile } from '../_shared/types.ts';

interface ProfilePhotoRow {
  id: string;
  profile_id: string;
  path: string;
  position: number;
  is_primary: boolean;
  created_at: string;
}

const CANVAS_WIDTH = 1080;
const CANVAS_HEIGHT = 1800;

const COLORS = {
  lavender: '#E7E6FF',
  darkCard: '#1B1C20',
  darkSurface: '#222329',
  lightText: '#F7F7FB',
  mutedText: '#B8B9C3',
  accent: '#7F83FF',
  border: '#2C2D35',
};

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
    console.error('[profile-share-image] Failed to parse avatar_url:', error);
  }

  return null;
}

async function signedUrlForPath(path: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin.storage
    .from('avatars')
    .createSignedUrl(path, 60 * 20);

  if (error || !data?.signedUrl) {
    console.error('[profile-share-image] Signed URL error:', error);
    return null;
  }

  return data.signedUrl;
}

async function getSignedAvatarUrl(avatarUrl: string): Promise<string | null> {
  const path = extractAvatarPath(avatarUrl);
  if (!path) return null;
  return await signedUrlForPath(path);
}

async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('*, users!profiles_id_fkey(birth_date)')
    .eq('id', userId)
    .single();

  if (error || !data) {
    return null;
  }

  const { users, ...profileData } = data as Profile & {
    users?: { birth_date?: string | null };
  };
  const profile: Profile = {
    ...profileData,
    birth_date: users?.birth_date ?? undefined,
  };
  if (profile.avatar_url) {
    const signedUrl = await getSignedAvatarUrl(profile.avatar_url);
    if (signedUrl) {
      profile.avatar_url = signedUrl;
    }
  }

  return profile;
}

function calculateAge(birthDate?: string | null): number | null {
  if (!birthDate) return null;
  const date = new Date(birthDate);
  if (Number.isNaN(date.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const monthDelta = today.getMonth() - date.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < date.getDate())) {
    age -= 1;
  }
  return age;
}

function formatBudget(profile: Profile): string | null {
  const min = profile.budget_min ?? null;
  const max = profile.budget_max ?? null;
  if (min != null && max != null) {
    return `${min} - ${max} EUR`;
  }
  if (min != null) return `Desde ${min} EUR`;
  if (max != null) return `Hasta ${max} EUR`;
  return null;
}

const h = React.createElement;

function chip(text: string, isFilled = false) {
  return h(
    'div',
    {
      style: {
        padding: '10px 22px',
        borderRadius: '999px',
        fontSize: '22px',
        fontWeight: 600,
        letterSpacing: '1px',
        color: isFilled ? COLORS.darkCard : COLORS.darkCard,
        border: `2px solid ${COLORS.darkCard}`,
        marginRight: '16px',
      },
    },
    text
  );
}

function infoRow(icon: string, label: string, detail?: string | null) {
  return h(
    'div',
    {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: COLORS.darkSurface,
        borderRadius: '48px',
        padding: '22px 28px',
        marginTop: '18px',
      },
    },
    h(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
        },
      },
      h(
        'div',
        {
          style: {
            fontSize: '26px',
          },
        },
        icon
      ),
    h(
      'div',
      {
        style: {
          fontSize: '28px',
          fontWeight: 600,
          color: COLORS.lightText,
        },
      },
      label
      )
    ),
    detail
      ? h(
          'div',
          {
            style: {
              fontSize: '22px',
              color: COLORS.mutedText,
            },
          },
          detail
        )
      : null
  );
}

function renderShareCard({
  name,
  age,
  bio,
  city,
  housingLabel,
  budgetLabel,
  photos,
}: {
  name: string;
  age: string | null;
  bio: string;
  city: string;
  housingLabel: string;
  budgetLabel: string | null;
  photos: Array<string | null>;
}) {
  const nameLine = age ? `${name}, ${age}` : name;
  return h(
    'div',
    {
      style: {
        width: '100%',
        height: '100%',
        backgroundColor: COLORS.lavender,
        padding: '80px 72px',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        fontFamily: 'sans-serif',
      },
    },
    h(
      'div',
      {
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        },
      },
      h(
        'div',
        { style: { display: 'flex', alignItems: 'center' } },
        chip(housingLabel === 'Busco piso' ? 'SEARCH' : 'OFFER'),
        chip('MIXED')
      ),
      h(
        'div',
        {
          style: {
            fontSize: '30px',
            fontWeight: 700,
            color: COLORS.darkCard,
          },
        },
        'HomiMatch'
      )
    ),
    h(
      'div',
      {
        style: {
          marginTop: '48px',
          backgroundColor: COLORS.darkCard,
          borderRadius: '56px',
          padding: '48px',
          color: COLORS.lightText,
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
          border: `2px solid ${COLORS.border}`,
          flex: 1,
        },
      },
      h(
        'div',
        { style: { display: 'flex', marginBottom: '28px' } },
        photos.map((photo, index) =>
          photo
            ? h('img', {
                key: `photo-${index}`,
                src: photo,
                style: {
                  width: '220px',
                  height: '220px',
                  borderRadius: '36px',
                  objectFit: 'cover',
                  marginRight: index < photos.length - 1 ? '18px' : '0',
                  border: `2px solid ${COLORS.border}`,
                },
              })
            : h(
                'div',
                {
                  key: `photo-${index}`,
                  style: {
                    width: '220px',
                    height: '220px',
                    borderRadius: '36px',
                    backgroundColor: COLORS.darkSurface,
                    marginRight: index < photos.length - 1 ? '18px' : '0',
                  },
                },
                null
              )
        )
      ),
      h(
        'div',
        { style: { display: 'flex', alignItems: 'center' } },
        h(
          'div',
          {
            style: {
              fontSize: '44px',
              fontWeight: 700,
              marginRight: '16px',
            },
          },
          nameLine
        ),
        h(
          'div',
          {
            style: {
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              border: `2px solid ${COLORS.accent}`,
              color: COLORS.accent,
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            },
          },
          'OK'
        )
      ),
      infoRow('\u{1F3D9}', city),
      infoRow('\u{1F3E0}', housingLabel, budgetLabel),
      infoRow('\u{1F4C5}', 'Disponible', 'Desde hoy'),
      h(
        'div',
        {
          style: {
            fontSize: '26px',
            color: COLORS.mutedText,
            marginTop: '24px',
            padding: '18px 22px',
            backgroundColor: '#262730',
            borderRadius: '20px',
          },
        },
        bio
      ),
      h(
        'div',
        {
          style: {
            marginTop: '32px',
            textAlign: 'center',
            fontSize: '26px',
            color: COLORS.mutedText,
          },
        },
        housingLabel.toLowerCase()
      ),
      h(
        'div',
        {
          style: {
            marginTop: 'auto',
            display: 'flex',
            justifyContent: 'center',
            color: COLORS.mutedText,
            fontSize: '20px',
          },
        },
        'Comparte tu perfil en HomiMatch'
      )
    )
  );
}

serve(
  withAuth(async (req: Request, payload: JWTPayload): Promise<Response> => {
    try {
      if (req.method !== 'GET') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const url = new URL(req.url);
      const profileId = url.searchParams.get('profile_id');
      const userId = getUserId(payload);

      if (profileId && profileId !== userId) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const profile = await getProfile(profileId ?? userId);
      if (!profile) {
        return new Response(JSON.stringify({ error: 'Profile not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

    const photoRows = await listPhotos(profile.id);
    const signedPhotoUrls = await Promise.all(
      photoRows.slice(0, 3).map(async (row) => {
        return await signedUrlForPath(row.path);
      })
    );

    const photos = signedPhotoUrls.filter(Boolean);
    if (photos.length === 0 && profile.avatar_url) {
      photos.push(profile.avatar_url);
    }
    while (photos.length < 3) photos.push(null);

      const ageValue = profile.birth_date ? calculateAge(profile.birth_date) : null;
      const ageLabel = ageValue != null ? `${ageValue}` : null;
      const name = profile.display_name ?? 'Usuario';
      const bio = profile.bio ?? 'Sin descripcion por ahora.';
      const city = profile.preferred_zones?.[0] ?? 'Ciudad';
    const housingLabel =
      profile.housing_situation === 'offering'
        ? 'Tengo piso'
        : profile.housing_situation === 'seeking'
        ? 'Busco habitacion con estas caracteristicas'
        : 'Busco habitacion con estas caracteristicas';
      const budgetLabel = formatBudget(profile);

      const element = renderShareCard({
        name,
        age: ageLabel,
        bio,
        city,
        housingLabel,
        budgetLabel,
        photos,
      });

      return new ImageResponse(element, {
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        headers: {
          ...corsHeaders,
        },
      });
    } catch (error) {
      console.error('[profile-share-image] Unhandled error:', error);
      const message = error instanceof Error ? error.message : String(error);
      return new Response(
        JSON.stringify({ error: 'Internal error', details: message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  })
);
