// supabase/functions/locations/index.ts
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, handleCORS } from '../_shared/cors.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

serve(async (req) => {
  const cors = handleCORS(req);
  if (cors) return cors;

  const url = new URL(req.url);
  const pathname = url.pathname.replace(/\/+$/, '');
  const pathParts = pathname.split('/').filter(Boolean);
  const last = pathParts[pathParts.length - 1];
  const secondLast = pathParts[pathParts.length - 2];

  const parseIntParam = (value: string | null, fallback: number) => {
    if (!value) return fallback;
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  try {
    if (req.method === 'POST' && last === 'track' && secondLast === 'cities') {
      const body = await req.json().catch(() => null);
      const cityId = body?.city_id;

      if (!cityId) {
        return jsonResponse({ error: 'Invalid payload' }, 400);
      }

      const { error } = await supabaseAdmin.rpc('increment_city_count', {
        p_city_id: cityId,
      });

      if (error) {
        console.error('[locations] city track error', error);
        return jsonResponse({ error: 'Failed to track city' }, 500);
      }

      return jsonResponse({ ok: true });
    }

    if (req.method === 'POST' && last === 'track' && secondLast === 'places') {
      const body = await req.json().catch(() => null);
      const cityId = body?.city_id;
      const placeIds = body?.place_ids;

      if (!cityId || !Array.isArray(placeIds) || placeIds.length === 0) {
        return jsonResponse({ error: 'Invalid payload' }, 400);
      }

      const { error } = await supabaseAdmin.rpc('increment_place_counts', {
        p_city_id: cityId,
        p_place_ids: placeIds,
      });

      if (error) {
        console.error('[locations] track error', error);
        return jsonResponse({ error: 'Failed to track places' }, 500);
      }

      return jsonResponse({ ok: true });
    }

    if (req.method !== 'GET') {
      return jsonResponse({ error: 'Method not allowed' }, 405);
    }

    if (secondLast === 'places' && last) {
      const placeId = decodeURIComponent(last);
      const { data, error } = await supabaseAdmin
        .from('city_places')
        .select('id,city_id,name,place,admin_level,ref_ine,wikidata,wikipedia,centroid,bbox')
        .eq('id', placeId)
        .single();

      if (error) {
        console.error('[locations] place error', error);
        return jsonResponse({ error: 'Failed to fetch place' }, 500);
      }

      return jsonResponse({ data });
    }

    if (last === 'cities') {
      const query = url.searchParams.get('q');
      const id = url.searchParams.get('id');
      const top = url.searchParams.get('top');
      const limitParam = url.searchParams.get('limit');
      const offsetParam = url.searchParams.get('offset');
      let limit = parseIntParam(limitParam, top ? 20 : 50);
      let offset = parseIntParam(offsetParam, 0);
      limit = Math.max(1, Math.min(limit, 200));
      offset = Math.max(0, offset);

      if (top) {
        // Use view that joins with city_search_counts for top cities
        let dbQuery = supabaseAdmin
          .from('cities_with_counts')
          .select('id,name,ref_ine,ine_municipio,wikidata,wikipedia,centroid,bbox,search_count')
          .order('search_count', { ascending: false });

        dbQuery = dbQuery.range(offset, offset + limit - 1);

        const { data, error } = await dbQuery;
        if (error) {
          console.error('[locations] top cities error', error);
          return jsonResponse({ error: 'Failed to fetch top cities' }, 500);
        }
        return jsonResponse({ data, meta: { limit, offset } });
      }

      let dbQuery = supabaseAdmin
        .from('cities')
        .select('id,name,ref_ine,ine_municipio,wikidata,wikipedia,centroid,bbox')
        .order('name', { ascending: true });

      if (id) {
        dbQuery = dbQuery.eq('id', id);
      }
      if (query) {
        dbQuery = dbQuery.ilike('name', `%${query}%`);
      }
      dbQuery = dbQuery.range(offset, offset + limit - 1);

      const { data, error } = await dbQuery;
      if (error) {
        console.error('[locations] cities error', error);
        return jsonResponse({ error: 'Failed to fetch cities' }, 500);
      }
      return jsonResponse({ data, meta: { limit, offset } });
    }

    if (secondLast === 'cities' && last) {
      const cityId = decodeURIComponent(last);
      const place = url.searchParams.get('place');
      const query = url.searchParams.get('q')?.trim() ?? '';
      const top = url.searchParams.get('top');
      const limitParam = url.searchParams.get('limit');
      const offsetParam = url.searchParams.get('offset');

      const minQueryLen = 2;
      if (query && query.length < minQueryLen) {
        return jsonResponse({
          data: [],
          meta: { hint: `Query must be at least ${minQueryLen} chars.` },
        });
      }

      let limit = parseIntParam(limitParam, top ? 20 : 50);
      let offset = parseIntParam(offsetParam, 0);
      limit = Math.max(1, Math.min(limit, 200));
      offset = Math.max(0, offset);

      let dbQuery = supabaseAdmin
        .from('city_places_with_counts')
        .select(
          'id,city_id,name,place,admin_level,ref_ine,wikidata,wikipedia,centroid,bbox,search_count'
        )
        .eq('city_id', cityId);

      if (place) {
        dbQuery = dbQuery.eq('place', place);
      }
      if (query) {
        dbQuery = dbQuery.ilike('name', `%${query}%`);
      }
      if (top) {
        dbQuery = dbQuery.order('search_count', { ascending: false });
      } else {
        dbQuery = dbQuery.order('name', { ascending: true });
      }
      dbQuery = dbQuery.range(offset, offset + limit - 1);

      const { data, error } = await dbQuery;
      if (error) {
        console.error('[locations] places error', error);
        return jsonResponse({ error: 'Failed to fetch places' }, 500);
      }
      return jsonResponse({ data, meta: { limit, offset } });
    }

    return jsonResponse({ error: 'Not found' }, 404);
  } catch (error) {
    console.error('[locations] unexpected error', error);
    return jsonResponse({ error: 'Unexpected error' }, 500);
  }
});
