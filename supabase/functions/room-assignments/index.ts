// supabase/functions/room-assignments/index.ts

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { withAuth, getUserId } from '../_shared/auth.ts';
import type { JWTPayload } from '../_shared/types.ts';

interface MatchRow {
  id: string;
  user_a_id: string;
  user_b_id: string;
  user_a?: { id: string; housing_situation?: string | null };
  user_b?: { id: string; housing_situation?: string | null };
}

interface AssignmentRow {
  id: string;
  room_id: string;
  match_id?: string | null;
  assignee_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  room?: Record<string, unknown>;
  assignee?: Record<string, unknown>;
}

async function getMatch(matchId: string): Promise<MatchRow | null> {
  const { data, error } = await supabaseAdmin
    .from('matches')
    .select(
      `
      *,
      user_a:profiles!matches_user_a_id_fkey(id, housing_situation),
      user_b:profiles!matches_user_b_id_fkey(id, housing_situation)
    `
    )
    .eq('id', matchId)
    .single();

  if (error || !data) return null;
  return data as MatchRow;
}

function resolveOwnerId(match: MatchRow): string | null {
  if (match.user_a?.housing_situation === 'offering') return match.user_a_id;
  if (match.user_b?.housing_situation === 'offering') return match.user_b_id;
  return null;
}

async function ensureRoomOwnership(roomId: string, ownerId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('rooms')
    .select('id, owner_id')
    .eq('id', roomId)
    .single();

  if (error || !data) return false;
  return data.owner_id === ownerId;
}

async function listAssignmentsForOwner(ownerId: string): Promise<AssignmentRow[]> {
  const { data, error } = await supabaseAdmin
    .from('room_assignments')
    .select(
      `
      *,
      room:rooms(*),
      assignee:profiles(*)
    `
    )
    .eq('room.owner_id', ownerId)
    .order('created_at', { ascending: true });

  if (error || !data) return [];
  return data as AssignmentRow[];
}

serve(
  withAuth(async (req: Request, payload: JWTPayload): Promise<Response> => {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }

    const userId = getUserId(payload);
    const url = new URL(req.url);

    if (req.method === 'GET') {
      const matchId = url.searchParams.get('match_id');

      if (!matchId) {
        return new Response(JSON.stringify({ error: 'match_id is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const match = await getMatch(matchId);
      if (!match) {
        return new Response(JSON.stringify({ error: 'Match not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (userId !== match.user_a_id && userId !== match.user_b_id) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const ownerId = resolveOwnerId(match) ?? match.user_a_id;
      const assignments = await listAssignmentsForOwner(ownerId);
      const matchAssignment =
        assignments.find((item) => item.match_id === matchId) ?? null;

      return new Response(
        JSON.stringify({
          data: {
            owner_id: ownerId,
            match_assignment: matchAssignment,
            assignments,
          },
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (req.method === 'POST') {
      const body = await req.json();
      const matchId = body?.match_id as string | undefined;
      const roomId = body?.room_id as string | undefined;
      const assigneeId = body?.assignee_id as string | undefined;

      if (!matchId || !roomId || !assigneeId) {
        return new Response(
          JSON.stringify({ error: 'match_id, room_id and assignee_id are required' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const match = await getMatch(matchId);
      if (!match) {
        return new Response(JSON.stringify({ error: 'Match not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (userId !== match.user_a_id && userId !== match.user_b_id) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const ownerId = resolveOwnerId(match);
      if (!ownerId || ownerId !== userId) {
        return new Response(JSON.stringify({ error: 'Only the owner can assign rooms' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (assigneeId !== match.user_a_id && assigneeId !== match.user_b_id) {
        return new Response(JSON.stringify({ error: 'Assignee not in match' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const ownsRoom = await ensureRoomOwnership(roomId, ownerId);
      if (!ownsRoom) {
        return new Response(JSON.stringify({ error: 'Room not found or unauthorized' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data, error } = await supabaseAdmin
        .from('room_assignments')
        .upsert(
          {
            match_id: matchId,
            room_id: roomId,
            assignee_id: assigneeId,
            status: 'offered',
          },
          { onConflict: 'match_id' }
        )
        .select(
          `
          *,
          room:rooms(*),
          assignee:profiles(*)
        `
        )
        .single();

      if (error || !data) {
        console.error('[room-assignments] Upsert error:', error);
        return new Response(JSON.stringify({ error: 'Error assigning room' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      await supabaseAdmin
        .from('matches')
        .update({ status: 'room_offer' })
        .eq('id', matchId);

      return new Response(JSON.stringify({ data }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'PATCH') {
      const body = await req.json();
      const assignmentId = body?.assignment_id as string | undefined;
      const status = body?.status as string | undefined;

      if (!assignmentId || !status) {
        return new Response(
          JSON.stringify({ error: 'assignment_id and status are required' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      if (!['accepted', 'rejected'].includes(status)) {
        return new Response(JSON.stringify({ error: 'Invalid status value' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: existing, error: fetchError } = await supabaseAdmin
        .from('room_assignments')
        .select(
          `
          *,
          room:rooms(*)
        `
        )
        .eq('id', assignmentId)
        .single();

      if (fetchError || !existing) {
        return new Response(JSON.stringify({ error: 'Assignment not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (existing.assignee_id !== userId) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data, error } = await supabaseAdmin
        .from('room_assignments')
        .update({ status })
        .eq('id', assignmentId)
        .select(
          `
          *,
          room:rooms(*),
          assignee:profiles(*)
        `
        )
        .single();

      if (error || !data) {
        console.error('[room-assignments] Update error:', error);
        return new Response(JSON.stringify({ error: 'Error updating assignment' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (existing.match_id) {
        await supabaseAdmin
          .from('matches')
          .update({ status: status === 'accepted' ? 'room_assigned' : 'room_declined' })
          .eq('id', existing.match_id);
      }

      return new Response(JSON.stringify({ data }), {
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
