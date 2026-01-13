// supabase/functions/flat-expenses/index.ts

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { withAuth, getUserId } from '../_shared/auth.ts';
import type { JWTPayload } from '../_shared/types.ts';

interface FlatExpenseRow {
  id: string;
  flat_id: string;
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

interface FlatMember {
  id: string;
  avatar_url?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  joined_at: string;
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

const toDateKey = (value: string) => new Date(value).toISOString().slice(0, 10);

async function isFlatOwner(flatId: string, userId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('flats')
    .select('owner_id')
    .eq('id', flatId)
    .single();

  if (error || !data) return false;
  return data.owner_id === userId;
}

async function hasAcceptedAssignment(flatId: string, userId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('room_assignments')
    .select('id, room:rooms!inner(flat_id)')
    .eq('assignee_id', userId)
    .eq('status', 'accepted')
    .eq('room.flat_id', flatId)
    .limit(1);

  if (error || !data) return false;
  return data.length > 0;
}

async function canAccessFlat(flatId: string, userId: string): Promise<boolean> {
  if (await isFlatOwner(flatId, userId)) return true;
  return hasAcceptedAssignment(flatId, userId);
}

async function loadFlatInfo(flatId: string) {
  const { data, error } = await supabaseAdmin
    .from('flats')
    .select('owner_id, created_at')
    .eq('id', flatId)
    .single();

  if (error || !data) return null;
  return {
    owner_id: data.owner_id as string,
    created_at: data.created_at as string,
  };
}

async function loadFlatMembers(flatId: string, flatInfo: { owner_id: string; created_at: string } | null) {
  const members = new Map<string, FlatMember>();

  if (flatInfo?.owner_id) {
    const { data: ownerProfile, error: ownerError } = await supabaseAdmin
      .from('profiles')
      .select('id, avatar_url, users!profiles_id_fkey(first_name, last_name)')
      .eq('id', flatInfo.owner_id)
      .single();

    if (!ownerError && ownerProfile) {
      const nameFields = getNameFields(ownerProfile);
      members.set(ownerProfile.id as string, {
        id: ownerProfile.id as string,
        avatar_url: (ownerProfile.avatar_url as string | null) ?? null,
        first_name: nameFields.first_name,
        last_name: nameFields.last_name,
        joined_at: toDateKey(flatInfo.created_at),
      });
    }
  }

  const { data: assignments, error } = await supabaseAdmin
    .from('room_assignments')
    .select(
      `
      assignee_id,
      updated_at,
      assignee:profiles(id, avatar_url, users!profiles_id_fkey(first_name, last_name)),
      room:rooms!inner(flat_id)
    `
    )
    .eq('status', 'accepted')
    .eq('room.flat_id', flatId);

  if (!error && assignments) {
    assignments.forEach((row) => {
      const assignee = row.assignee as {
        id: string;
        avatar_url?: string | null;
        users?: { first_name?: string | null; last_name?: string | null } | null;
      } | null;
      const joinedAt = row.updated_at ? toDateKey(row.updated_at as string) : null;
      if (assignee?.id && joinedAt) {
        const nameFields = getNameFields(assignee);
          members.set(assignee.id, {
            id: assignee.id,
            avatar_url: assignee.avatar_url ?? null,
            first_name: nameFields.first_name,
            last_name: nameFields.last_name,
            joined_at: joinedAt,
          });
      }
    });
  }

  return Array.from(members.values());
}

serve(
  withAuth(async (req: Request, payload: JWTPayload): Promise<Response> => {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }

    const userId = getUserId(payload);
    const url = new URL(req.url);

    if (req.method === 'GET') {
      const flatId = url.searchParams.get('flat_id');
      const month = url.searchParams.get('month');
      const includeMembers = url.searchParams.get('include_members') === 'true';

      if (!flatId) {
        return new Response(JSON.stringify({ error: 'flat_id is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!(await canAccessFlat(flatId, userId))) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      let query = supabaseAdmin
        .from('flat_expenses')
          .select('*, creator:profiles(id, avatar_url, users!profiles_id_fkey(first_name, last_name))')
        .eq('flat_id', flatId);

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
        .order('expense_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[flat-expenses] fetch error:', error);
        return new Response(JSON.stringify({ error: 'Error fetching expenses' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const expenses = (data ?? []) as FlatExpenseRow[];
      const expenseIds = expenses.map((item) => item.id);
      const participantsByExpense = new Map<string, string[]>();

      if (expenseIds.length > 0) {
        const { data: participants, error: participantsError } = await supabaseAdmin
          .from('flat_expense_participants')
          .select('expense_id, member_id')
          .in('expense_id', expenseIds);

        if (!participantsError && participants) {
          participants.forEach((row) => {
            const list = participantsByExpense.get(row.expense_id as string) ?? [];
            list.push(row.member_id as string);
            participantsByExpense.set(row.expense_id as string, list);
          });
        }
      }

      const expensesWithParticipants = expenses.map((expense) => ({
        ...expense,
        participants: participantsByExpense.get(expense.id) ?? [],
      }));

      const responsePayload: { data: FlatExpenseRow[]; members?: Omit<FlatMember, 'joined_at'>[] } = {
        data: expensesWithParticipants,
      };

      if (includeMembers) {
        const flatInfo = await loadFlatInfo(flatId);
        const members = await loadFlatMembers(flatId, flatInfo);
        responsePayload.members = members.map(({ joined_at, ...rest }) => rest);
      }

      return new Response(JSON.stringify(responsePayload), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'POST') {
      const body = await req.json();
      const flatId = typeof body?.flat_id === 'string' ? body.flat_id.trim() : '';
      const concept = typeof body?.concept === 'string' ? body.concept.trim() : '';
      const amountRaw = body?.amount;
      const amount = typeof amountRaw === 'number' ? amountRaw : Number(amountRaw);
      const note = typeof body?.note === 'string' ? body.note.trim() : null;
      const participantsInput = Array.isArray(body?.participants) ? body.participants : [];
      const expenseDate =
        typeof body?.expense_date === 'string' && body.expense_date.trim()
          ? body.expense_date.trim()
          : new Date().toISOString().slice(0, 10);

      if (!flatId || !concept || !Number.isFinite(amount) || amount <= 0) {
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

      if (!(await canAccessFlat(flatId, userId))) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const participants = Array.from(
        new Set(
          participantsInput
            .filter((item: unknown): item is string => typeof item === 'string')
            .map((item) => item.trim())
            .filter(Boolean)
        )
      );

      if (participants.length > 0) {
        const flatInfo = await loadFlatInfo(flatId);
        const members = await loadFlatMembers(flatId, flatInfo);
        const memberById = new Map(
          members.map((member) => [member.id, member] as const)
        );
        const invalid = participants.find((id) => {
          const member = memberById.get(id);
          return !member || member.joined_at > expenseDate;
        });
        if (invalid) {
          return new Response(JSON.stringify({ error: 'Invalid participant selection' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      const { data, error } = await supabaseAdmin
        .from('flat_expenses')
        .insert({
          flat_id: flatId,
          concept,
          amount,
          expense_date: expenseDate,
          note: note || null,
          created_by: userId,
        })
          .select('*, creator:profiles(id, avatar_url, users!profiles_id_fkey(first_name, last_name))')
        .single();

      if (error || !data) {
        console.error('[flat-expenses] insert error:', error);
        return new Response(JSON.stringify({ error: 'Error saving expense' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (participants.length > 0) {
        const { error: participantError } = await supabaseAdmin
          .from('flat_expense_participants')
          .insert(
            participants.map((memberId: string) => ({
              expense_id: data.id,
              member_id: memberId,
            }))
          );

        if (participantError) {
          console.error('[flat-expenses] participants insert error:', participantError);
          await supabaseAdmin.from('flat_expenses').delete().eq('id', data.id);
          return new Response(JSON.stringify({ error: 'Error saving participants' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      const responseExpense = {
        ...(data as FlatExpenseRow),
        participants,
      };

      return new Response(JSON.stringify({ data: responseExpense }), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  })
);
