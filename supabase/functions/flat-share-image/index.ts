// supabase/functions/flat-share-image/index.ts
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import React from 'https://esm.sh/react@18.2.0';
import { ImageResponse } from 'https://deno.land/x/og_edge@0.0.6/mod.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { withAuth, getUserId } from '../_shared/auth.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';
import type { JWTPayload, Flat, Room } from '../_shared/types.ts';

interface RoomExtrasRow {
  room_id: string;
  category?: string | null;
  photos: string[];
}

const CANVAS_WIDTH = 1080;
const CANVAS_HEIGHT = 1800;
const PHOTO_GAP = 18;
const PHOTO_SIZE = 220;

const COLORS = {
  lavender: '#E7E6FF',
  darkCard: '#1B1C20',
  darkSurface: '#222329',
  lightText: '#F7F7FB',
  mutedText: '#B8B9C3',
  accent: '#7F83FF',
  border: '#2C2D35',
};

async function signedUrlForPath(path: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin.storage
    .from('room-photos')
    .createSignedUrl(path, 60 * 20);

  if (error || !data?.signedUrl) {
    console.error('[flat-share-image] Signed URL error:', error);
    return null;
  }

  return data.signedUrl;
}

async function getFlat(flatId: string): Promise<Flat | null> {
  const { data, error } = await supabaseAdmin
    .from('flats')
    .select('*')
    .eq('id', flatId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as Flat;
}

async function getRoomsForFlat(flatId: string): Promise<Room[]> {
  const { data, error } = await supabaseAdmin
    .from('rooms')
    .select('*')
    .eq('flat_id', flatId);

  if (error || !data) {
    return [];
  }

  return data as Room[];
}

async function getRoomExtras(roomIds: string[]): Promise<RoomExtrasRow[]> {
  if (roomIds.length === 0) return [];
  const { data, error } = await supabaseAdmin
    .from('room_extras')
    .select('room_id, category, photos')
    .in('room_id', roomIds);

  if (error || !data) {
    return [];
  }

  return data as RoomExtrasRow[];
}

function formatPriceRange(rooms: Room[]): string | null {
  const prices = rooms
    .map((room) => room.price_per_month)
    .filter((price): price is number => typeof price === 'number' && price >= 0);
  if (prices.length === 0) return null;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  if (min === max) return `${min} EUR/mes`;
  return `${min} - ${max} EUR/mes`;
}

function formatGenderPolicy(policy?: string | null): string | null {
  if (!policy) return null;
  if (policy === 'mixed') return 'Mixto';
  if (policy === 'men_only') return 'Solo hombres';
  if (policy === 'flinta') return 'Flinta';
  return policy;
}

const h = React.createElement;

function chip(text: string) {
  return h(
    'div',
    {
      style: {
        padding: '10px 22px',
        borderRadius: '999px',
        fontSize: '22px',
        fontWeight: 600,
        letterSpacing: '1px',
        color: COLORS.darkCard,
        border: `2px solid ${COLORS.darkCard}`,
      },
    },
    text
  );
}

function infoRow(icon: string, label: React.ReactNode, detail?: string | null) {
  return h(
    'div',
    {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: COLORS.darkSurface,
        borderRadius: '44px',
        padding: '28px 36px',
        marginTop: '22px',
        gap: '16px',
      },
    },
    h(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          flex: 1,
          minWidth: 0,
        },
      },
      h(
        'div',
        {
          style: {
            fontSize: '30px',
            lineHeight: '36px',
            width: '36px',
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
            fontSize: '30px',
            fontWeight: 600,
            color: COLORS.lightText,
            lineHeight: '38px',
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
              fontSize: '24px',
              color: COLORS.mutedText,
              lineHeight: '32px',
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

function renderFlatShareCard({
  address,
  locationLabel,
  priceLabel,
  capacityLabel,
  roomsLabel,
  availabilityLabel,
  genderLabel,
  photos,
}: {
  address: string;
  locationLabel: string;
  priceLabel: string | null;
  capacityLabel: string | null;
  roomsLabel: string;
  availabilityLabel: string;
  genderLabel: string | null;
  photos: Array<string | null>;
}) {
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
      h('div', { style: { display: 'flex', alignItems: 'center' } }, chip('PISO')),
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
                  border: `2px solid ${COLORS.border}`,
                },
              })
            : h(
                'div',
                {
                  key: `photo-${index}`,
                  style: {
                    ...tileStyle,
                    backgroundColor: COLORS.darkSurface,
                  },
                },
                null
              );
        })
      ),
      h(
        'div',
        {
          style: {
            fontSize: '40px',
            fontWeight: 700,
            marginBottom: '12px',
          },
        },
        address
      ),
      h(
        'div',
        {
          style: {
            fontSize: '26px',
            color: COLORS.mutedText,
            marginBottom: '18px',
          },
        },
        locationLabel
      ),
      infoRow('\u{1F3E0}', roomsLabel, capacityLabel),
      priceLabel ? infoRow('\u{1F4B6}', 'Precio', priceLabel) : null,
      infoRow('\u{1F4C5}', 'Disponibilidad', availabilityLabel),
      genderLabel ? infoRow('\u{1F9D1}', 'Preferencia', genderLabel) : null,
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
        'Comparte tu piso en HomiMatch'
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
      const flatId = url.searchParams.get('flat_id');
      const userId = getUserId(payload);
      console.log('[flat-share-image] request', { flatId, userId });

      if (!flatId) {
        return new Response(JSON.stringify({ error: 'flat_id is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const flat = await getFlat(flatId);
      if (!flat) {
        return new Response(JSON.stringify({ error: 'Flat not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (flat.owner_id !== userId) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const rooms = await getRoomsForFlat(flatId);
      const roomIds = rooms.map((room) => room.id);
      const extras = await getRoomExtras(roomIds);
      const photoPaths = extras.flatMap((row) => row.photos ?? []).filter(Boolean);
      const signedPhotoUrls = await Promise.all(
        photoPaths.slice(0, 4).map(async (path) => {
          return await signedUrlForPath(path);
        })
      );
      const photos = signedPhotoUrls.map((url) => url ?? null);
      while (photos.length < 4) photos.push(null);

      const commonAreaRoomIds = new Set(
        extras
          .filter((row) => row.category === 'area_comun')
          .map((row) => row.room_id)
      );
      const roomsCount = rooms.filter((room) => !commonAreaRoomIds.has(room.id)).length;
      const availableCount = rooms.filter(
        (room) => room.is_available === true && !commonAreaRoomIds.has(room.id)
      ).length;
      const roomsLabel = roomsCount > 0 ? `${roomsCount} habitaciones` : 'Sin habitaciones';
      const availabilityLabel =
        roomsCount === 0
          ? 'Sin habitaciones disponibles'
          : availableCount > 0
          ? `${availableCount} disponibles`
          : 'Consultar disponibilidad';
      const capacityLabel =
        typeof flat.capacity_total === 'number'
          ? `${flat.capacity_total} plazas`
          : null;
      const priceLabel = formatPriceRange(rooms);
      const genderLabel = formatGenderPolicy(flat.gender_policy);
      const locationLabel = flat.district ? `${flat.city} - ${flat.district}` : flat.city;

      const element = renderFlatShareCard({
        address: flat.address,
        locationLabel,
        priceLabel,
        capacityLabel,
        roomsLabel,
        availabilityLabel,
        genderLabel,
        photos,
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
      console.error('[flat-share-image] Unhandled error:', error);
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
