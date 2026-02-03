// supabase/functions/room-share-image/index.ts
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
  room_type?: string | null;
  common_area_type?: string | null;
  common_area_custom?: string | null;
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
    console.error('[room-share-image] Signed URL error:', error);
    return null;
  }

  return data.signedUrl;
}

async function getRoom(roomId: string): Promise<Room | null> {
  const { data, error } = await supabaseAdmin
    .from('rooms')
    .select('*')
    .eq('id', roomId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as Room;
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

async function getRoomExtras(roomId: string): Promise<RoomExtrasRow | null> {
  const { data, error } = await supabaseAdmin
    .from('room_extras')
    .select('room_id, category, room_type, common_area_type, common_area_custom, photos')
    .eq('room_id', roomId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as RoomExtrasRow;
}

function formatAvailability(isAvailable?: boolean | null): string {
  if (isAvailable === true) return 'Disponible';
  if (isAvailable === false) return 'Ocupada';
  return 'Sin estado';
}

function formatRoomType(extras?: RoomExtrasRow | null): string | null {
  if (!extras) return null;
  if (extras.category === 'area_comun') {
    if (extras.common_area_type === 'otros') {
      return extras.common_area_custom ?? 'Zona comun';
    }
    if (extras.common_area_type) {
      const labelMap: Record<string, string> = {
        salon: 'Salon',
        cocina: 'Cocina',
        comedor: 'Comedor',
        bano_compartido: 'Baño compartido',
        terraza: 'Terraza',
        patio: 'Patio',
        lavadero: 'Lavadero',
        pasillo: 'Pasillo',
        recibidor: 'Recibidor',
        trastero: 'Trastero',
        estudio: 'Sala de estudio',
      };
      return labelMap[extras.common_area_type] ?? extras.common_area_type;
    }
    return 'Zona comun';
  }
  if (extras.room_type) {
    if (extras.room_type === 'individual') return 'Individual';
    if (extras.room_type === 'doble') return 'Doble';
    return extras.room_type;
  }
  return null;
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

function renderRoomShareCard({
  title,
  locationLabel,
  roomTypeLabel,
  priceLabel,
  sizeLabel,
  availabilityLabel,
  photos,
}: {
  title: string;
  locationLabel: string;
  roomTypeLabel: string | null;
  priceLabel: string | null;
  sizeLabel: string | null;
  availabilityLabel: string | null;
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
      h('div', { style: { display: 'flex', alignItems: 'center' } }, chip('HABITACION')),
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
        title
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
      roomTypeLabel ? infoRow('\u{1F6CF}', 'Tipo', roomTypeLabel) : null,
      priceLabel ? infoRow('\u{1F4B6}', 'Precio', priceLabel) : null,
      sizeLabel ? infoRow('\u{1F4CF}', 'Tamaño', sizeLabel) : null,
      availabilityLabel ? infoRow('\u{1F4C5}', 'Estado', availabilityLabel) : null,
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
        'Comparte tu habitacion en HomiMatch'
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
      const roomId = url.searchParams.get('room_id');
      const userId = getUserId(payload);
      console.log('[room-share-image] request', { roomId, userId });

      if (!roomId) {
        return new Response(JSON.stringify({ error: 'room_id is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const room = await getRoom(roomId);
      if (!room) {
        return new Response(JSON.stringify({ error: 'Room not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (room.owner_id !== userId) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const flat = await getFlat(room.flat_id);
      const extras = await getRoomExtras(roomId);
      const photoPaths = extras?.photos ?? [];
      const signedPhotoUrls = await Promise.all(
        photoPaths.slice(0, 4).map(async (path) => {
          return await signedUrlForPath(path);
        })
      );
      const photos = signedPhotoUrls.map((url) => url ?? null);
      while (photos.length < 4) photos.push(null);

      const roomTypeLabel = formatRoomType(extras);
      const priceLabel =
        typeof room.price_per_month === 'number'
          ? `${room.price_per_month} EUR/mes`
          : null;
      const sizeLabel =
        typeof room.size_m2 === 'number' ? `${room.size_m2} m2` : null;
      const availabilityLabel =
        extras?.category === 'area_comun' ? null : formatAvailability(room.is_available);
      const locationLabel = flat
        ? flat.district
          ? `${flat.city} - ${flat.district}`
          : flat.city
        : 'Ubicacion no disponible';

      const element = renderRoomShareCard({
        title: room.title,
        locationLabel,
        roomTypeLabel,
        priceLabel,
        sizeLabel,
        availabilityLabel,
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
      console.error('[room-share-image] Unhandled error:', error);
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
