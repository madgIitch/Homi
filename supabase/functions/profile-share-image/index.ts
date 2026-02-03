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
const PHOTO_GAP = 18;
const PHOTO_SIZE = 200;

const THEMES = {
  lavender: {
    background: '#E7E6FF',
    card: '#1B1C20',
    surface: '#222329',
    text: '#F7F7FB',
    muted: '#B8B9C3',
    accent: '#7F83FF',
    border: '#2C2D35',
    brand: '#1B1C20',
  },
  sunset: {
    background: '#FFE6D6',
    card: '#251B1A',
    surface: '#2E2221',
    text: '#FFF6F0',
    muted: '#E0B8A7',
    accent: '#FF8A5B',
    border: '#3C2A28',
    brand: '#251B1A',
  },
  mint: {
    background: '#DDF7EF',
    card: '#17201D',
    surface: '#1F2A26',
    text: '#F2FFFB',
    muted: '#A9D2C5',
    accent: '#35C5A3',
    border: '#2B3A35',
    brand: '#17201D',
  },
  ocean: {
    background: '#DDEEFF',
    card: '#141D2A',
    surface: '#1B2534',
    text: '#F0F6FF',
    muted: '#A3B6D4',
    accent: '#4FA3FF',
    border: '#263248',
    brand: '#141D2A',
  },
};

type ThemeColors = typeof THEMES.lavender;

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
  console.log('[profile-share-image] fetch profile', userId);
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('*, users!profiles_id_fkey(birth_date, first_name, last_name)')
    .eq('id', userId)
    .single();

  if (error || !data) {
    return null;
  }

  const { users, ...profileData } = data as Profile & {
    users?: { birth_date?: string | null; first_name?: string | null; last_name?: string | null };
  };
  const profile: Profile = {
    ...profileData,
    birth_date: users?.birth_date ?? profileData.birth_date ?? undefined,
    first_name: users?.first_name ?? profileData.first_name ?? undefined,
    last_name: users?.last_name ?? profileData.last_name ?? undefined,
  };
  if (profile.avatar_url) {
    const signedUrl = await getSignedAvatarUrl(profile.avatar_url);
    if (signedUrl) {
      profile.avatar_url = signedUrl;
    }
  }

  return profile;
}

async function getPlaceLabels(placeIds: string[]): Promise<string[]> {
  const filtered = placeIds.filter((value) => value);
  if (filtered.length === 0) return [];
  console.log('[profile-share-image] resolve place labels', {
    count: filtered.length,
  });

  const { data: placeRows, error: placeError } = await supabaseAdmin
    .from('city_places')
    .select('id, name, city_id')
    .in('id', filtered);

  if (placeError) {
    console.warn('[profile-share-image] place lookup failed', {
      error: placeError.message,
    });
  }

  const places = (placeRows ?? []) as Array<{
    id?: string | null;
    name?: string | null;
    city_id?: string | null;
  }>;
  const placeMap = new Map<string, { name?: string | null; city_id?: string | null }>();
  const cityIds = new Set<string>();
  places.forEach((row) => {
    if (!row.id) return;
    placeMap.set(row.id, { name: row.name ?? null, city_id: row.city_id ?? null });
    if (row.city_id) {
      cityIds.add(row.city_id);
    }
  });

  const { data: cityRows, error: cityError } = await supabaseAdmin
    .from('cities')
    .select('id, name')
    .in('id', Array.from(cityIds));

  if (cityError) {
    console.warn('[profile-share-image] city lookup failed', {
      error: cityError.message,
    });
  }

  const cityMap = new Map<string, string>();
  (cityRows ?? []).forEach((row) => {
    const city = row as { id?: string | null; name?: string | null };
    if (city.id && city.name) {
      cityMap.set(city.id, city.name);
    }
  });

  const { data: fallbackCities } = await supabaseAdmin
    .from('cities')
    .select('id, name')
    .in('id', filtered);
  const fallbackCityMap = new Map<string, string>();
  (fallbackCities ?? []).forEach((row) => {
    const city = row as { id?: string | null; name?: string | null };
    if (city.id && city.name) {
      fallbackCityMap.set(city.id, city.name);
    }
  });

  const labels = filtered
    .map((placeId) => {
      const place = placeMap.get(placeId);
      const placeName = place?.name ?? null;
      const cityName = place?.city_id ? cityMap.get(place.city_id) ?? null : null;
      const label =
        cityName && placeName
          ? `${cityName}\u00A0-\u00A0${placeName}`
          : placeName ?? cityName;
      return label ?? fallbackCityMap.get(placeId) ?? null;
    })
    .filter((label): label is string => Boolean(label));

  console.log('[profile-share-image] resolved place labels', {
    labels,
  });
  return labels;
}

async function getInterestLabels(interestIds: string[]): Promise<string[]> {
  const filtered = interestIds.filter((value) => value);
  if (filtered.length === 0) return [];

  const { data, error } = await supabaseAdmin
    .from('interests')
    .select('id, name')
    .in('id', filtered);

  if (error || !data) {
    return filtered;
  }

  const map = new Map<string, string>();
  (data as Array<{ id?: string | null; name?: string | null }>).forEach((row) => {
    if (row.id && row.name) {
      map.set(row.id, row.name);
    }
  });

  return filtered.map((id) => map.get(id) ?? id);
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

function chip(text: string, theme: ThemeColors) {
  return h(
    'div',
    {
      style: {
        padding: '10px 22px',
        borderRadius: '999px',
        fontSize: '22px',
        fontWeight: 600,
        letterSpacing: '1px',
        color: theme.brand,
        border: `2px solid ${theme.brand}`,
        marginRight: '16px',
      },
    },
    text
  );
}

function locationChip(text: string, theme: ThemeColors, chipKey?: string) {
  return h(
    'div',
    {
      key: chipKey,
      style: {
        padding: '8px 18px',
        borderRadius: '999px',
        fontSize: '22px',
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        flexShrink: 0,
        whiteSpace: 'nowrap',
        color: theme.text,
        border: `2px solid ${theme.text}`,
        marginRight: '14px',
        marginBottom: '10px',
      },
    },
    text
  );
}

function infoRow(
  icon: string,
  label: React.ReactNode,
  detail?: string | null,
  options?: { iconSize?: number; iconBoxWidth?: number; minHeight?: number },
  theme?: ThemeColors
) {
  const hasDetail = Boolean(detail);
  const colors = theme ?? THEMES.lavender;
  const iconSize = options?.iconSize ?? 34;
  const iconBoxWidth = options?.iconBoxWidth ?? 40;
  const minHeight = options?.minHeight ?? 120;
  return h(
    'div',
    {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.surface,
        borderRadius: '48px',
        padding: '32px 38px',
        marginTop: '26px',
        minHeight: `${minHeight}px`,
        gap: '16px',
      },
    },
    h(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: '18px',
          flex: 1,
          minWidth: 0,
        },
      },
      h(
        'div',
        {
          style: {
            fontSize: `${iconSize}px`,
            lineHeight: `${iconSize + 6}px`,
            width: `${iconBoxWidth}px`,
            textAlign: 'center',
            flexShrink: 0,
          },
        },
        icon
      ),
    h(
      'div',
        {
          style: {
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignItems: 'flex-start',
            justifyContent: 'flex-start',
            fontSize: '34px',
            fontWeight: 600,
            color: colors.text,
            lineHeight: '40px',
            flex: 1,
            minWidth: 0,
            whiteSpace: 'pre-wrap',
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
              fontSize: '26px',
              color: colors.muted,
              lineHeight: '34px',
              textAlign: 'right',
              whiteSpace: 'pre-wrap',
              flexShrink: 0,
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
  cityLabels,
  housingLabel,
  budgetLabel,
  interestsLabel,
  availabilityLabel,
  photos,
  theme,
}: {
  name: string;
  age: string | null;
  bio: string;
  cityLabels: string[];
  housingLabel: string;
  budgetLabel: string | null;
  interestsLabel: string | null;
  availabilityLabel: string | null;
  photos: Array<string | null>;
  theme: ThemeColors;
}) {
  const nameLine = age ? `${name}, ${age}` : name;
  const cityChipLabels = cityLabels.filter((label) => label.trim().length > 0);
  const cityChipContent =
    cityChipLabels.length > 0
      ? cityChipLabels.map((label, index) =>
          locationChip(label, theme, `city-${index}`)
        )
      : cityLabels.join(' - ');
  return h(
    'div',
    {
      style: {
        width: '100%',
        height: '100%',
        backgroundColor: theme.background,
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
        chip('SEARCH', theme)
      ),
      h(
        'div',
        {
          style: {
            fontSize: '30px',
            fontWeight: 700,
            color: theme.brand,
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
          backgroundColor: theme.card,
          borderRadius: '56px',
          padding: '48px',
          color: theme.text,
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
          border: `2px solid ${theme.border}`,
          flex: 1,
        },
      },
      photos.length > 0
        ? h(
            'div',
            {
              style: {
                display: 'flex',
                flexWrap: 'wrap',
                marginBottom: '28px',
              },
            },
            photos.map((photo, index) => {
              const isLeft = index % 2 === 0;
              const isTop = index < 2;
              const tileStyle = {
                width: `${PHOTO_SIZE}px`,
                height: `${PHOTO_SIZE}px`,
                borderRadius: '36px',
                marginRight: isLeft ? `${PHOTO_GAP}px` : '0',
                marginBottom: isTop ? `${PHOTO_GAP}px` : '0',
              };

              return photo
                ? h('img', {
                    key: `photo-${index}`,
                    src: photo,
                    style: {
                      ...tileStyle,
                      objectFit: 'cover',
                      border: `2px solid ${theme.border}`,
                    },
                  })
                : h(
                    'div',
                    {
                      key: `photo-${index}`,
                      style: {
                        ...tileStyle,
                        backgroundColor: theme.surface,
                      },
                    },
                    null
                  );
            })
          )
        : null,
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
              border: `2px solid ${theme.accent}`,
              color: theme.accent,
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            },
          },
          'OK'
        )
      ),
      cityLabels.length > 0
        ? infoRow('\u{1F3D9}', cityChipContent, null, { iconBoxWidth: 40 }, theme)
        : null,
      housingLabel || budgetLabel
        ? infoRow('\u{1F3E0}', housingLabel, budgetLabel, undefined, theme)
        : null,
      availabilityLabel
        ? infoRow('\u{1F4C5}', availabilityLabel, 'Desde hoy', undefined, theme)
        : null,
      interestsLabel
        ? infoRow('\u{2728}', interestsLabel, null, undefined, theme)
        : null,
      bio
        ? h(
            'div',
            {
              style: {
                fontSize: '26px',
                color: theme.muted,
                marginTop: '24px',
                padding: '18px 22px',
                backgroundColor: theme.surface,
                borderRadius: '20px',
              },
            },
            bio
          )
        : null,
      h(
        'div',
        {
          style: {
            marginTop: 'auto',
            display: 'flex',
            justifyContent: 'center',
            color: theme.muted,
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
      const includeParam = url.searchParams.get('include');
      const includeSet = includeParam
        ? new Set(includeParam.split(',').map((value) => value.trim()))
        : null;
      const includePhotos = includeSet ? includeSet.has('photos') : true;
      const includeBio = includeSet ? includeSet.has('bio') : true;
      const includeBudget = includeSet ? includeSet.has('budget') : true;
      const includeZones = includeSet ? includeSet.has('zones') : true;
      const includeInterests = includeSet ? includeSet.has('interests') : true;
      const includeAvailability = includeSet ? includeSet.has('availability') : true;
      const includeHousing = includeSet ? includeSet.has('housing') : true;
      const includeAge = includeSet ? includeSet.has('age') : true;
      const themeKey = url.searchParams.get('theme') ?? 'lavender';
      const theme = THEMES[themeKey as keyof typeof THEMES] ?? THEMES.lavender;
      const photoIdsParam = url.searchParams.get('photo_ids');
      const zoneIdsParam = url.searchParams.get('zone_ids');
      const userId = getUserId(payload);
      console.log('[profile-share-image] request', {
        profileId: profileId ?? null,
        userId,
      });

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
      const selectedPhotoIds = photoIdsParam
        ? photoIdsParam
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean)
        : [];
      const filteredPhotoRows =
        selectedPhotoIds.length > 0
          ? photoRows.filter((row) => selectedPhotoIds.includes(row.id))
          : photoRows;
      const signedPhotoUrls = includePhotos
        ? await Promise.all(
            filteredPhotoRows.slice(0, 4).map(async (row) => {
              return await signedUrlForPath(row.path);
            })
          )
        : [];

      const photos = includePhotos ? signedPhotoUrls.filter(Boolean) : [];
      if (includePhotos && photos.length === 0 && profile.avatar_url) {
        photos.push(profile.avatar_url);
      }

      const ageValue = profile.birth_date ? calculateAge(profile.birth_date) : null;
      const ageLabel = includeAge && ageValue != null ? `${ageValue}` : null;
      const nameParts = [profile.first_name?.trim(), profile.last_name?.trim()].filter(Boolean);
      const name = nameParts.length > 0 ? nameParts.join(' ') : 'Usuario';
      const bio = includeBio
        ? profile.bio ?? 'Sin descripcion por ahora.'
        : '';
      const preferredPlaces = includeZones
        ? zoneIdsParam
          ? zoneIdsParam
              .split(',')
              .map((value) => value.trim())
              .filter(Boolean)
          : profile.preferred_zones ?? []
        : [];
      const resolvedPlaces = includeZones ? await getPlaceLabels(preferredPlaces) : [];
      const maxPlaces = 4;
      const cityLabels = resolvedPlaces.slice(0, maxPlaces);
      const extraCityCount =
        resolvedPlaces.length > maxPlaces
          ? resolvedPlaces.length - maxPlaces
          : 0;
      const cityLabelsWithExtra = [
        ...cityLabels,
        extraCityCount > 0 ? `+${extraCityCount}` : null,
      ].filter(Boolean) as string[];
      const cityLabelText = cityLabelsWithExtra.join(' - ');
      console.log('[profile-share-image] share payload', {
        profileId: profile.id,
        preferredPlaces,
        resolvedPlaces,
        cityLabels,
        extraCityCount,
        cityLabelText,
      });
      const housingLabel = includeHousing
        ? profile.housing_situation === 'offering'
          ? 'Tengo piso'
          : profile.housing_situation === 'seeking'
          ? 'Busco habitacion con estas caracteristicas'
          : 'Busco habitacion con estas caracteristicas'
        : '';
      const budgetLabel = includeBudget ? formatBudget(profile) : null;
      const interestsLabel = includeInterests
        ? (await getInterestLabels(profile.interests ?? [])).join(' - ') || null
        : null;
      const availabilityLabel = includeAvailability ? 'Disponible' : null;

      const element = renderShareCard({
        name,
        age: ageLabel,
        bio,
        cityLabels: cityLabelsWithExtra,
        housingLabel,
        budgetLabel,
        interestsLabel,
        availabilityLabel,
        photos,
        theme,
      });

      return new ImageResponse(element, {
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        headers: {
          ...corsHeaders,
          'Cache-Control': 'no-store',
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
