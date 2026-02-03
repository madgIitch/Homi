// supabase/functions/group-expenses/index.ts
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { withAuth, getUserId } from '../_shared/auth.ts';
import type { JWTPayload } from '../_shared/types.ts';

interface GroupExpenseRow {
  id: string;
  group_id: string;
  concept: string;
  amount: number;
  expense_date: string;
  note?: string | null;
  created_by: string;
  created_at: string;
  participants?: string[];
  creator?: {
    id: string;
    avatar_url?: string | null;
  } | null;
}

interface GroupMember {
  id: string;
  avatar_url?: string | null;
  first_name?: string | null;
  last_name?: string | null;
}

const MONTH_PATTERN = /^\d{4}-\d{2}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

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

const getMonthRange = (month: string) => {
  const [year, monthValue] = month.split('-').map(Number);
  const start = `${month}-01`;
  const endDate = new Date(Date.UTC(year, monthValue, 1));
  const end = endDate.toISOString().slice(0, 10);
  return { start, end };
};

const hasAccess = async (groupId: string, userId: string): Promise<boolean> => {
  const { data, error } = await supabaseAdmin
    .from('expense_group_members')
    .select('id')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .eq('status', 'accepted')
    .limit(1);

  if (error || !data) return false;
  return data.length > 0;
};

const loadGroupMembers = async (groupId: string): Promise<GroupMember[]> => {
  // Optimized: Single query with JOIN instead of 3 separate queries
  const { data: members, error } = await supabaseAdmin
    .from('expense_group_members')
    .select(`
      user_id,
      profile:profiles!expense_group_members_user_id_fkey(
        id,
        avatar_url,
        users!profiles_id_fkey(first_name, last_name)
      )
    `)
    .eq('group_id', groupId)
    .eq('status', 'accepted');

  if (error || !members) return [];

  return members
    .filter((row) => row.user_id && row.profile)
    .map((row) => {
      const profile = row.profile as {
        id: string;
        avatar_url?: string | null;
        users?: { first_name?: string | null; last_name?: string | null } | null;
      };
      const nameFields = getNameFields(profile);
      return {
        id: profile.id,
        avatar_url: profile.avatar_url ?? null,
        first_name: nameFields.first_name,
        last_name: nameFields.last_name,
      };
    });
};

/**
 * Calculates share amounts for each participant ensuring no cents are lost.
 * Example: 10€ / 3 people = 3.34€ + 3.33€ + 3.33€ (not 3.33€ x 3 = 9.99€)
 */
const calculateShares = (
  totalAmount: number,
  participants: string[],
  customShares?: Record<string, number>
): Record<string, number> => {
  if (customShares) {
    return customShares;
  }

  const count = participants.length;
  if (count === 0) return {};

  // Round down to 2 decimal places
  const baseShare = Math.floor((totalAmount / count) * 100) / 100;
  // Calculate remainder in cents
  const totalBase = Math.round(baseShare * count * 100) / 100;
  const remainderCents = Math.round((totalAmount - totalBase) * 100);

  const shares: Record<string, number> = {};
  participants.forEach((id, index) => {
    // Distribute extra cents to the first participants
    const extraCent = index < remainderCents ? 0.01 : 0;
    shares[id] = Math.round((baseShare + extraCent) * 100) / 100;
  });

  return shares;
};

serve(
  withAuth(async (req: Request, payload: JWTPayload): Promise<Response> => {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }

    const userId = getUserId(payload);
    const url = new URL(req.url);

    if (req.method === 'GET') {
      const groupId = url.searchParams.get('group_id');
      const action = url.searchParams.get('action');
      const month = url.searchParams.get('month');
      const includeMembers = url.searchParams.get('include_members') === 'true';
      const limit = parseInt(url.searchParams.get('limit') || '50', 10);
      const offset = parseInt(url.searchParams.get('offset') || '0', 10);

      if (!groupId) {
        return new Response(JSON.stringify({ error: 'group_id is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!(await hasAccess(groupId, userId))) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Handle balances action
      if (action === 'balances') {
        const { data: expenseRows } = await supabaseAdmin
          .from('group_expenses')
          .select('id')
          .eq('group_id', groupId);

        const expenseIds = (expenseRows ?? []).map((e) => e.id as string);

        if (expenseIds.length === 0) {
          return new Response(JSON.stringify({ data: {} }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { data: participants } = await supabaseAdmin
          .from('group_expense_participants')
          .select('user_id, share_amount, is_paid')
          .in('expense_id', expenseIds);

        const balances: Record<string, number> = {};
        (participants ?? []).forEach((p) => {
          const amount = p.is_paid ? 0 : (p.share_amount as number);
          const uid = p.user_id as string;
          balances[uid] = (balances[uid] || 0) + amount;
        });

        return new Response(JSON.stringify({ data: balances }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      let query = supabaseAdmin
        .from('group_expenses')
        .select('*, creator:profiles(id, avatar_url, users!profiles_id_fkey(first_name, last_name))')
        .eq('group_id', groupId);

      if (month) {
        if (!MONTH_PATTERN.test(month)) {
          return new Response(JSON.stringify({ error: 'Invalid month format' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        const range = getMonthRange(month);
        query = query.gte('expense_date', range.start).lt('expense_date', range.end);
      }

      const { data, error } = await query
        .range(offset, offset + limit - 1)
        .order('expense_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[group-expenses] fetch error:', error);
        return new Response(JSON.stringify({ error: 'Error fetching expenses' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get total count for pagination
      let countQuery = supabaseAdmin
        .from('group_expenses')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', groupId);

      if (month) {
        const range = getMonthRange(month);
        countQuery = countQuery.gte('expense_date', range.start).lt('expense_date', range.end);
      }

      const { count } = await countQuery;

      const expenses = (data ?? []) as GroupExpenseRow[];
      const expenseIds = expenses.map((item) => item.id);
      const participantsByExpense = new Map<string, string[]>();
      const participantDetailsByExpense = new Map<
        string,
        Array<{ user_id: string; share_amount: number; is_paid: boolean }>
      >();

      if (expenseIds.length > 0) {
        const { data: participants, error: participantsError } = await supabaseAdmin
          .from('group_expense_participants')
          .select('expense_id, user_id, share_amount, is_paid')
          .in('expense_id', expenseIds);

        if (!participantsError && participants) {
          participants.forEach((row) => {
            const expId = row.expense_id as string;
            const userId = row.user_id as string;
            const shareAmount = row.share_amount as number;
            const isPaid = row.is_paid as boolean;

            // For backwards compatibility - just user_ids list
            const list = participantsByExpense.get(expId) ?? [];
            list.push(userId);
            participantsByExpense.set(expId, list);

            // Detailed participant info
            const details = participantDetailsByExpense.get(expId) ?? [];
            details.push({ user_id: userId, share_amount: shareAmount, is_paid: isPaid });
            participantDetailsByExpense.set(expId, details);
          });
        }
      }

      const expensesWithParticipants = expenses.map((expense) => ({
        ...expense,
        participants: participantsByExpense.get(expense.id) ?? [],
        participant_details: participantDetailsByExpense.get(expense.id) ?? [],
      }));

      const responsePayload: {
        data: GroupExpenseRow[];
        members?: GroupMember[];
        total?: number;
        hasMore?: boolean;
      } = {
        data: expensesWithParticipants,
        total: count || 0,
        hasMore: (offset + limit) < (count || 0),
      };

      if (includeMembers) {
        responsePayload.members = await loadGroupMembers(groupId);
      }

      return new Response(JSON.stringify(responsePayload), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'POST') {
      const body = await req.json();
      const groupId = typeof body?.group_id === 'string' ? body.group_id.trim() : '';
      const concept = typeof body?.concept === 'string' ? body.concept.trim() : '';
      const amountRaw = body?.amount;
      const amount = typeof amountRaw === 'number' ? amountRaw : Number(amountRaw);
      const note = typeof body?.note === 'string' ? body.note.trim() : null;
      const participantsInput = Array.isArray(body?.participants) ? body.participants : [];
      const customShares = body?.custom_shares as Record<string, number> | undefined;
      const expenseDate =
        typeof body?.expense_date === 'string' && body.expense_date.trim()
          ? body.expense_date.trim()
          : new Date().toISOString().slice(0, 10);

      if (!groupId || !concept || !Number.isFinite(amount) || amount <= 0) {
        return new Response(JSON.stringify({ error: 'Invalid payload' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!DATE_PATTERN.test(expenseDate)) {
        return new Response(JSON.stringify({ error: 'Invalid expense_date' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Validate custom_shares if provided
      if (customShares) {
        const totalShare = Object.values(customShares).reduce((sum, val) => sum + val, 0);
        if (Math.abs(totalShare - amount) > 0.01) {
          return new Response(JSON.stringify({ error: 'Custom shares must sum to total amount' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      if (!(await hasAccess(groupId, userId))) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const members = await loadGroupMembers(groupId);
      const memberIds = members.map((member) => member.id);

      const participants = Array.from(
        new Set(
          participantsInput
            .filter((item: unknown): item is string => typeof item === 'string')
            .map((item) => item.trim())
            .filter(Boolean)
        )
      ).filter((id) => memberIds.includes(id));

      const resolvedParticipants = participants.length > 0 ? participants : memberIds;

      if (resolvedParticipants.length === 0) {
        return new Response(JSON.stringify({ error: 'No participants available' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data, error } = await supabaseAdmin
        .from('group_expenses')
        .insert({
          group_id: groupId,
          concept,
          amount,
          expense_date: expenseDate,
          note: note || null,
          created_by: userId,
        })
        .select('*, creator:profiles(id, avatar_url, users!profiles_id_fkey(first_name, last_name))')
        .single();

      if (error || !data) {
        console.error('[group-expenses] insert error:', error);
        return new Response(JSON.stringify({ error: 'Error saving expense' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Calculate shares with proper cent distribution
      const sharesByMember = calculateShares(amount, resolvedParticipants, customShares);
      const participantInserts = resolvedParticipants.map((memberId: string) => ({
        expense_id: data.id,
        user_id: memberId,
        share_amount: sharesByMember[memberId],
        is_paid: false,
      }));
      const { error: participantError } = await supabaseAdmin
        .from('group_expense_participants')
        .insert(participantInserts);

      if (participantError) {
        console.error('[group-expenses] participants insert error:', participantError);
        await supabaseAdmin.from('group_expenses').delete().eq('id', data.id);
        return new Response(JSON.stringify({ error: 'Error saving participants' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const responseExpense = {
        ...(data as GroupExpenseRow),
        participants: resolvedParticipants,
      };

      return new Response(JSON.stringify({ data: responseExpense }), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'PATCH') {
      const body = await req.json();
      const { expense_id, user_id, is_paid } = body;

      if (!expense_id || !user_id || typeof is_paid !== 'boolean') {
        return new Response(JSON.stringify({ error: 'Invalid payload' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Verify user has access to the expense
      const { data: expense, error: expenseError } = await supabaseAdmin
        .from('group_expenses')
        .select('group_id')
        .eq('id', expense_id)
        .single();

      if (expenseError || !expense || !(await hasAccess(expense.group_id, userId))) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { error } = await supabaseAdmin
        .from('group_expense_participants')
        .update({ is_paid })
        .eq('expense_id', expense_id)
        .eq('user_id', user_id);

      if (error) {
        console.error('[group-expenses] update payment status error:', error);
        return new Response(JSON.stringify({ error: 'Error updating payment status' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
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
