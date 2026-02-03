// supabase/functions/expense-group-invites/index.ts
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { withAuth, getUserId } from '../_shared/auth.ts';
import type { JWTPayload } from '../_shared/types.ts';

type GroupRole = 'owner' | 'admin' | 'member';
type GroupStatus = 'pending' | 'accepted' | 'declined';

interface MemberRow {
  role: GroupRole;
  status: GroupStatus;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEFAULT_INVITE_BASE_URL = 'https://homimatch.app';

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

const canInvite = async (groupId: string, userId: string): Promise<boolean> => {
  const membership = await getMembership(groupId, userId);
  if (!membership || membership.status !== 'accepted') return false;
  return membership.role === 'owner' || membership.role === 'admin';
};

const normalizeEmail = (value: string) => value.trim().toLowerCase();

const generateToken = () => crypto.randomUUID().replace(/-/g, '');

serve(
  withAuth(async (req: Request, payload: JWTPayload): Promise<Response> => {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = getUserId(payload);
    const body = await req.json();

    if (typeof body?.token === 'string' && body.token.trim()) {
      const token = body.token.trim();
      const userEmail = normalizeEmail(payload.email ?? '');

      const { data: invite, error } = await supabaseAdmin
        .from('expense_group_invites')
        .select('*')
        .eq('token', token)
        .eq('status', 'pending')
        .single();

      if (error || !invite) {
        return new Response(JSON.stringify({ error: 'Invite not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
        await supabaseAdmin
          .from('expense_group_invites')
          .update({ status: 'expired' })
          .eq('id', invite.id);
        return new Response(JSON.stringify({ error: 'Invite expired' }), {
          status: 410,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (invite.email && userEmail && normalizeEmail(invite.email) !== userEmail) {
        return new Response(JSON.stringify({ error: 'Invite does not match user' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const groupId = invite.group_id as string;

      // Validate that user profile exists (required for FK constraint)
      const { data: profileExists, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single();

      if (profileError || !profileExists) {
        return new Response(JSON.stringify({ error: 'User profile not found' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: existing } = await supabaseAdmin
        .from('expense_group_members')
        .select('id, status')
        .eq('group_id', groupId)
        .eq('user_id', userId)
        .single();

      if (existing?.id) {
        if (existing.status !== 'accepted') {
          await supabaseAdmin
            .from('expense_group_members')
            .update({ status: 'accepted' })
            .eq('id', existing.id);
        }
      } else {
        await supabaseAdmin.from('expense_group_members').insert({
          group_id: groupId,
          user_id: userId,
          role: 'member',
          status: 'accepted',
          invited_by: invite.invited_by,
        });
      }

      await supabaseAdmin
        .from('expense_group_invites')
        .update({ status: 'accepted' })
        .eq('id', invite.id);

      return new Response(JSON.stringify({ status: 'accepted' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const groupId = typeof body?.group_id === 'string' ? body.group_id : '';
    const emailsInput = Array.isArray(body?.emails) ? body.emails : [];
    const linkOnly = Boolean(body?.link_only);
    const emails = Array.from(
      new Set(
        emailsInput
          .filter((item: unknown): item is string => typeof item === 'string')
          .map(normalizeEmail)
          .filter((email) => EMAIL_PATTERN.test(email))
      )
    );

    if (!groupId || (!linkOnly && emails.length === 0)) {
      return new Response(JSON.stringify({ error: 'Invalid payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!(await canInvite(groupId, userId))) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let userByEmail = new Map<string, string>();
    if (!linkOnly) {
      const { data: users } = await supabaseAdmin
        .from('users')
        .select('id, email')
        .in('email', emails);

      userByEmail = new Map<string, string>();
      (users ?? []).forEach((row) => {
        const email = normalizeEmail(row.email as string);
        userByEmail.set(email, row.id as string);
      });
    }

    const inviteRows = linkOnly
      ? [
          {
            group_id: groupId,
            email: null,
            token: generateToken(),
            invited_by: userId,
            status: 'pending',
          },
        ]
      : emails.map((email) => ({
          group_id: groupId,
          email,
          token: generateToken(),
          invited_by: userId,
          status: 'pending',
        }));

    const { data: invites, error: inviteError } = await supabaseAdmin
      .from('expense_group_invites')
      .insert(inviteRows)
      .select('*');

    if (inviteError) {
      console.error('[expense-group-invites] insert error:', inviteError);
      return new Response(JSON.stringify({ error: 'Error creating invites' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userIds = inviteRows
      .map((row) => (row.email ? userByEmail.get(row.email) : null))
      .filter((id): id is string => Boolean(id));

    if (userIds.length > 0) {
      const { data: existingMembers } = await supabaseAdmin
        .from('expense_group_members')
        .select('user_id, status')
        .eq('group_id', groupId)
        .in('user_id', userIds);

      const memberStatusById = new Map<string, GroupStatus>();
      (existingMembers ?? []).forEach((row) => {
        memberStatusById.set(row.user_id as string, row.status as GroupStatus);
      });

      const newMembers = userIds
        .filter((id) => !memberStatusById.has(id))
        .map((id) => ({
          group_id: groupId,
          user_id: id,
          role: 'member',
          status: 'pending',
          invited_by: userId,
        }));

      if (newMembers.length > 0) {
        const { error: memberInsertError } = await supabaseAdmin
          .from('expense_group_members')
          .insert(newMembers);
        if (memberInsertError) {
          console.error('[expense-group-invites] member insert error:', memberInsertError);
        }
      }

      const pendingIds = userIds.filter((id) => {
        const status = memberStatusById.get(id);
        return status && status !== 'accepted';
      });

      if (pendingIds.length > 0) {
        await supabaseAdmin
          .from('expense_group_members')
          .update({ status: 'pending', invited_by: userId })
          .eq('group_id', groupId)
          .in('user_id', pendingIds);
      }
    }

    const appUrl = Deno.env.get('APP_WEB_URL') ?? DEFAULT_INVITE_BASE_URL;
    const baseUrl = appUrl.endsWith('/invite/group')
      ? appUrl
      : `${appUrl.replace(/\/$/, '')}/invite/group`;
    const inviteLinks =
      invites?.map((row) => ({
        email: row.email,
        token: row.token,
        link: `${baseUrl}/${row.token}`,
        code: row.token,
      })) ?? [];

    return new Response(JSON.stringify({ data: inviteLinks }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  })
);
