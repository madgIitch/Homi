// supabase/functions/expense-groups/index.ts
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { withAuth, getUserId } from '../_shared/auth.ts';
import type { JWTPayload } from '../_shared/types.ts';

type GroupRole = 'owner' | 'admin' | 'member';
type GroupStatus = 'pending' | 'accepted' | 'declined';

interface ExpenseGroupRow {
  id: string;
  name: string;
  description?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface MemberRow {
  role: GroupRole;
  status: GroupStatus;
}

interface MemberProfileRow {
  id: string;
  avatar_url?: string | null;
  users?: { first_name?: string | null; last_name?: string | null } | null;
  first_name?: string | null;
  last_name?: string | null;
}

interface MemberWithProfileRow {
  id: string;
  group_id: string;
  user_id: string;
  role: GroupRole;
  status: GroupStatus;
  joined_at: string;
  invited_by?: string | null;
  profile?: MemberProfileRow | null;
}

const getNameFields = (
  profile?: {
    users?: { first_name?: string | null; last_name?: string | null } | null;
    first_name?: string | null;
    last_name?: string | null;
  } | null
) => {
  const firstName = profile?.users?.first_name ?? profile?.first_name ?? null;
  const lastName = profile?.users?.last_name ?? profile?.last_name ?? null;
  const trimmedFirst = firstName?.trim() || null;
  const trimmedLast = lastName?.trim() || null;
  return { first_name: trimmedFirst, last_name: trimmedLast };
};

const getMembership = async (
  groupId: string,
  userId: string
): Promise<MemberRow | null> => {
  const { data, error } = await supabaseAdmin
    .from('expense_group_members')
    .select('role, status')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .single();

  if (error || !data) return null;
  return {
    role: data.role as GroupRole,
    status: data.status as GroupStatus,
  };
};

const canAccessGroup = async (groupId: string, userId: string): Promise<boolean> => {
  const membership = await getMembership(groupId, userId);
  return membership?.status === 'accepted';
};

const canManageGroup = async (groupId: string, userId: string): Promise<boolean> => {
  const membership = await getMembership(groupId, userId);
  if (!membership || membership.status !== 'accepted') return false;
  return membership.role === 'owner' || membership.role === 'admin';
};

const isOwner = async (groupId: string, userId: string): Promise<boolean> => {
  const membership = await getMembership(groupId, userId);
  return membership?.status === 'accepted' && membership.role === 'owner';
};

const loadGroupMembers = async (groupId: string): Promise<MemberWithProfileRow[]> => {
  const { data: members, error } = await supabaseAdmin
    .from('expense_group_members')
    .select('id, group_id, user_id, role, status, joined_at, invited_by')
    .eq('group_id', groupId)
    .eq('status', 'accepted');

  if (error || !members) {
    console.warn('[expense-groups] load members error:', error);
    return [];
  }

  const userIds = members.map((member) => member.user_id).filter(Boolean);
  const profilesById = new Map<string, MemberProfileRow>();

  if (userIds.length > 0) {
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, avatar_url, users!profiles_id_fkey(first_name, last_name)')
      .in('id', userIds);

    if (profileError) {
      console.warn('[expense-groups] load profiles error:', profileError);
    } else {
      (profiles ?? []).forEach((profile) => {
        profilesById.set(profile.id as string, profile as MemberProfileRow);
      });
    }
  }

  return members.map((member) => ({
    ...(member as MemberWithProfileRow),
    profile: profilesById.get(member.user_id as string) ?? null,
  }));
};

const sendGroupNotification = async (
  userId: string,
  type: string,
  data: Record<string, unknown>
) => {
  try {
    const { error } = await supabaseAdmin.from('notifications').insert({
      user_id: userId,
      type,
      data,
      created_at: new Date().toISOString(),
    });
    if (error) {
      console.warn('[expense-groups] notification error:', error);
    }
  } catch (error) {
    console.warn('[expense-groups] notification exception:', error);
  }
};

const transferOwnership = async (
  groupId: string,
  leavingOwnerId: string
): Promise<string | null> => {
  const { data: admins } = await supabaseAdmin
    .from('expense_group_members')
    .select('user_id')
    .eq('group_id', groupId)
    .eq('role', 'admin')
    .eq('status', 'accepted')
    .neq('user_id', leavingOwnerId)
    .order('joined_at', { ascending: true })
    .limit(1);

  let newOwnerId = admins?.[0]?.user_id ?? null;

  if (!newOwnerId) {
    const { data: members } = await supabaseAdmin
      .from('expense_group_members')
      .select('user_id')
      .eq('group_id', groupId)
      .eq('role', 'member')
      .eq('status', 'accepted')
      .neq('user_id', leavingOwnerId)
      .order('joined_at', { ascending: true })
      .limit(1);

    newOwnerId = members?.[0]?.user_id ?? null;
  }

  if (!newOwnerId) return null;

  await supabaseAdmin
    .from('expense_group_members')
    .update({ role: 'owner' })
    .eq('group_id', groupId)
    .eq('user_id', newOwnerId);

  await supabaseAdmin
    .from('expense_groups')
    .update({ created_by: newOwnerId })
    .eq('id', groupId);

  return newOwnerId;
};

serve(
  withAuth(async (req: Request, payload: JWTPayload): Promise<Response> => {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }

    const userId = getUserId(payload);
    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const action = pathSegments[pathSegments.length - 1] ?? '';
    const isMembersRoute = action === 'members';
    const isLeaveRoute = action === 'leave';

    if (req.method === 'GET' && isMembersRoute) {
      const groupId = url.searchParams.get('group_id') ?? '';
      if (!groupId) {
        return new Response(JSON.stringify({ error: 'group_id is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!(await canAccessGroup(groupId, userId))) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const members = await loadGroupMembers(groupId);
      const response = members.map((member) => {
        const profile = member.profile ?? null;
        const nameFields = getNameFields(profile);
        return {
          ...member,
          profile: profile
            ? {
                id: profile.id,
                avatar_url: profile.avatar_url ?? null,
                first_name: nameFields.first_name,
                last_name: nameFields.last_name,
              }
            : null,
        };
      });

      return new Response(JSON.stringify({ data: response }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'GET') {
      const { data, error } = await supabaseAdmin
        .from('expense_group_members')
        .select(
          'role, status, group:expense_groups(id, name, description, created_by, created_at, updated_at)'
        )
        .eq('user_id', userId)
        .eq('status', 'accepted');

      if (error) {
        console.error('[expense-groups] fetch error:', error);
        return new Response(JSON.stringify({ error: 'Error fetching groups' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const groups = (data ?? [])
        .map((row) => {
          const group = row.group as ExpenseGroupRow | null;
          if (!group) return null;
          return {
            ...group,
            role: row.role,
            status: row.status,
          };
        })
        .filter(Boolean);

      return new Response(JSON.stringify({ data: groups }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'POST' && isLeaveRoute) {
      const body = await req.json().catch(() => ({}));
      const groupId = typeof body?.group_id === 'string' ? body.group_id : '';

      if (!groupId) {
        return new Response(JSON.stringify({ error: 'group_id is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const membership = await getMembership(groupId, userId);
      if (!membership || membership.status !== 'accepted') {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: groupRow } = await supabaseAdmin
        .from('expense_groups')
        .select('created_by')
        .eq('id', groupId)
        .maybeSingle();

      if (membership.role === 'owner') {
        const { data: remainingMembers } = await supabaseAdmin
          .from('expense_group_members')
          .select('user_id')
          .eq('group_id', groupId)
          .eq('status', 'accepted')
          .neq('user_id', userId);

        if (!remainingMembers || remainingMembers.length === 0) {
          const { error } = await supabaseAdmin
            .from('expense_groups')
            .delete()
            .eq('id', groupId);

          if (error) {
            console.error('[expense-groups] delete group error:', error);
            return new Response(JSON.stringify({ error: 'Error leaving group' }), {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          return new Response(JSON.stringify({ status: 'deleted' }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const newOwnerId = await transferOwnership(groupId, userId);
        if (!newOwnerId) {
          return new Response(JSON.stringify({ error: 'Error transferring ownership' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        await sendGroupNotification(newOwnerId, 'ownership_transferred', {
          group_id: groupId,
          previous_owner_id: userId,
        });
      }

      const { error: deleteError } = await supabaseAdmin
        .from('expense_group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', userId);

      if (deleteError) {
        console.error('[expense-groups] leave error:', deleteError);
        return new Response(JSON.stringify({ error: 'Error leaving group' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (membership.role !== 'owner' && groupRow?.created_by) {
        await sendGroupNotification(groupRow.created_by, 'member_left', {
          group_id: groupId,
          member_id: userId,
        });
      }

      return new Response(JSON.stringify({ status: 'ok' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'POST') {
      const body = await req.json();
      const name = typeof body?.name === 'string' ? body.name.trim() : '';
      const description =
        typeof body?.description === 'string' && body.description.trim()
          ? body.description.trim()
          : null;

      if (!name) {
        return new Response(JSON.stringify({ error: 'Name is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data, error } = await supabaseAdmin
        .from('expense_groups')
        .insert({
          name,
          description,
          created_by: userId,
        })
        .select('*')
        .single();

      if (error || !data) {
        console.error('[expense-groups] insert error:', error);
        return new Response(JSON.stringify({ error: 'Error creating group' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { error: memberError } = await supabaseAdmin
        .from('expense_group_members')
        .insert({
          group_id: data.id,
          user_id: userId,
          role: 'owner',
          status: 'accepted',
          invited_by: userId,
        });

      if (memberError) {
        console.error('[expense-groups] member insert error:', memberError);
      }

      return new Response(JSON.stringify({ data }), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'PATCH') {
      const body = await req.json();
      const groupId = typeof body?.group_id === 'string' ? body.group_id : '';
      const name = typeof body?.name === 'string' ? body.name.trim() : '';
      const description =
        typeof body?.description === 'string' && body.description.trim()
          ? body.description.trim()
          : null;

      if (!groupId || !name) {
        return new Response(JSON.stringify({ error: 'Invalid payload' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!(await canManageGroup(groupId, userId))) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data, error } = await supabaseAdmin
        .from('expense_groups')
        .update({
          name,
          description,
          updated_at: new Date().toISOString(),
        })
        .eq('id', groupId)
        .select('*')
        .single();

      if (error || !data) {
        console.error('[expense-groups] update error:', error);
        return new Response(JSON.stringify({ error: 'Error updating group' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ data }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'DELETE' && isMembersRoute) {
      const body = await req.json().catch(() => ({}));
      const groupId = typeof body?.group_id === 'string' ? body.group_id : '';
      const memberId = typeof body?.member_id === 'string' ? body.member_id : '';

      if (!groupId || !memberId) {
        return new Response(JSON.stringify({ error: 'Invalid payload' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!(await canManageGroup(groupId, userId))) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: targetMember } = await supabaseAdmin
        .from('expense_group_members')
        .select('role, status')
        .eq('group_id', groupId)
        .eq('user_id', memberId)
        .maybeSingle();

      if (!targetMember || targetMember.status !== 'accepted') {
        return new Response(JSON.stringify({ error: 'Member not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (targetMember.role === 'owner') {
        return new Response(JSON.stringify({ error: 'Cannot remove owner' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { error } = await supabaseAdmin
        .from('expense_group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', memberId);

      if (error) {
        console.error('[expense-groups] remove member error:', error);
        return new Response(JSON.stringify({ error: 'Error removing member' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      await sendGroupNotification(memberId, 'member_removed', {
        group_id: groupId,
        removed_by: userId,
      });

      return new Response(JSON.stringify({ status: 'ok' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'DELETE') {
      const groupId = url.searchParams.get('group_id') ?? '';

      if (!groupId) {
        return new Response(JSON.stringify({ error: 'group_id is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!(await isOwner(groupId, userId))) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { error } = await supabaseAdmin
        .from('expense_groups')
        .delete()
        .eq('id', groupId);

      if (error) {
        console.error('[expense-groups] delete error:', error);
        return new Response(JSON.stringify({ error: 'Error deleting group' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ status: 'ok' }), {
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
