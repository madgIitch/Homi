// supabase/functions/flat-settlements/index.ts

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { withAuth, getUserId } from '../_shared/auth.ts';
import type { JWTPayload } from '../_shared/types.ts';

interface FlatSettlementMember {
  id: string;
  avatar_url?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  paid: number;
  share: number;
  balance: number;
}

interface FlatSettlementTransfer {
  from_id: string;
  to_id: string;
  amount: number;
  paid?: boolean;
}

interface FlatSettlementPayment {
  from_id: string;
  to_id: string;
  amount: number;
}

interface FlatSettlementSummary {
  flat_id: string;
  flat_address?: string | null;
  flat_city?: string | null;
  flat_district?: string | null;
  month?: string | null;
  total: number;
  member_count: number;
  per_member: number;
  members: FlatSettlementMember[];
  transfers: FlatSettlementTransfer[];
  payments: FlatSettlementPayment[];
}

const MONTH_PATTERN = /^\d{4}-\d{2}$/;

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

const toCents = (value: number) => Math.round(value * 100);
const fromCents = (value: number) => Number((value / 100).toFixed(2));
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

async function loadOwnerProfile(flatId: string) {
  const { data: flatRow, error: flatError } = await supabaseAdmin
    .from('flats')
    .select('owner_id')
    .eq('id', flatId)
    .single();

  if (flatError || !flatRow?.owner_id) return null;

  const { data: ownerProfile, error: ownerError } = await supabaseAdmin
    .from('profiles')
    .select('id, avatar_url, users!profiles_id_fkey(first_name, last_name)')
    .eq('id', flatRow.owner_id)
    .single();

  if (ownerError || !ownerProfile) return null;
  const nameFields = getNameFields(ownerProfile);
  return {
    id: ownerProfile.id as string,
    avatar_url: (ownerProfile.avatar_url as string | null) ?? null,
    first_name: nameFields.first_name,
    last_name: nameFields.last_name,
  } as {
    id: string;
    avatar_url?: string | null;
    first_name?: string | null;
    last_name?: string | null;
  };
}

async function loadFlatInfo(flatId: string) {
  const { data, error } = await supabaseAdmin
    .from('flats')
    .select('address, city, district, owner_id, created_at')
    .eq('id', flatId)
    .single();

  if (error || !data) return null;
  return {
    address: data.address as string,
    city: data.city as string,
    district: (data.district as string | null) ?? null,
    owner_id: data.owner_id as string,
    created_at: data.created_at as string,
  };
}

async function loadFlatMembers(
  flatId: string,
  flatInfo: { owner_id: string; created_at: string } | null
): Promise<
      {
        id: string;
        avatar_url?: string | null;
        first_name?: string | null;
        last_name?: string | null;
        joined_at: string;
  }[]
> {
  const members = new Map<
    string,
      {
        id: string;
        avatar_url?: string | null;
        first_name?: string | null;
        last_name?: string | null;
        joined_at: string;
    }
  >();

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

async function loadExpenses(flatId: string, month?: string | null) {
  let query = supabaseAdmin
    .from('flat_expenses')
    .select('id, created_by, amount, expense_date')
    .eq('flat_id', flatId);

  if (month) {
    const range = getMonthRange(month);
    query = query.gte('expense_date', range.start).lt('expense_date', range.end);
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return data as { id: string; created_by: string; amount: number; expense_date: string }[];
}

async function loadExpenseParticipants(expenseIds: string[]) {
  const participantsByExpense = new Map<string, string[]>();
  if (expenseIds.length === 0) return participantsByExpense;

  const { data, error } = await supabaseAdmin
    .from('flat_expense_participants')
    .select('expense_id, member_id')
    .in('expense_id', expenseIds);

  if (error || !data) return participantsByExpense;
  data.forEach((row) => {
    const expenseId = row.expense_id as string;
    const memberId = row.member_id as string;
    const list = participantsByExpense.get(expenseId) ?? [];
    list.push(memberId);
    participantsByExpense.set(expenseId, list);
  });
  return participantsByExpense;
}

async function loadPaidTransfers(flatId: string, month?: string | null) {
  if (!month) {
    return {
      paidSet: new Set<string>(),
      payments: [] as { from_id: string; to_id: string; amount: number }[],
    };
  }
  const { data, error } = await supabaseAdmin
    .from('flat_settlement_payments')
    .select('from_id, to_id, amount')
    .eq('flat_id', flatId)
    .eq('month', month);

  if (error || !data) {
    return {
      paidSet: new Set<string>(),
      payments: [] as { from_id: string; to_id: string; amount: number }[],
    };
  }
  const paidSet = new Set<string>();
  const payments: { from_id: string; to_id: string; amount: number }[] = [];
  data.forEach((row) => {
    const amount = Number(row.amount) || 0;
    const key = `${row.from_id}|${row.to_id}|${toCents(amount)}`;
    paidSet.add(key);
    payments.push({
      from_id: row.from_id as string,
      to_id: row.to_id as string,
      amount,
    });
  });
  return { paidSet, payments };
}

function buildSettlementSummary(
  flatId: string,
  month: string | null,
  flatInfo: {
    address: string;
    city: string;
    district?: string | null;
    owner_id: string;
    created_at: string;
  } | null,
    members: {
      id: string;
      avatar_url?: string | null;
      first_name?: string | null;
      last_name?: string | null;
    joined_at: string;
  }[],
  expenses: { id: string; created_by: string; amount: number; expense_date: string }[],
  expenseParticipants: Map<string, string[]>,
  paidSet: Set<string>,
  payments: { from_id: string; to_id: string; amount: number }[]
): FlatSettlementSummary {
  const memberIds = members.map((member) => member.id).sort();
  const paidMap = new Map<string, number>();
  memberIds.forEach((id) => paidMap.set(id, 0));

  expenses.forEach((expense) => {
    const amount = Number(expense.amount) || 0;
    const cents = toCents(amount);
    const current = paidMap.get(expense.created_by) ?? 0;
    paidMap.set(expense.created_by, current + cents);
  });

  const shareMap = new Map<string, number>();
  memberIds.forEach((id) => shareMap.set(id, 0));

  const membersById = new Map(members.map((member) => [member.id, member]));
  expenses.forEach((expense) => {
    const amount = Number(expense.amount) || 0;
    const cents = toCents(amount);
    const expenseParticipantIds = expenseParticipants.get(expense.id) ?? [];
    const eligibleMembers = (expenseParticipantIds.length > 0
      ? expenseParticipantIds
      : members.map((member) => member.id)
    )
      .filter((id) => {
        const member = membersById.get(id);
        return Boolean(member && member.joined_at <= expense.expense_date);
      })
      .sort();
    if (eligibleMembers.length === 0) return;
    const baseShare = Math.floor(cents / eligibleMembers.length);
    let remainder = cents - baseShare * eligibleMembers.length;
    eligibleMembers.forEach((id) => {
      const extra = remainder > 0 ? 1 : 0;
      const currentShare = shareMap.get(id) ?? 0;
      shareMap.set(id, currentShare + baseShare + extra);
      remainder -= extra;
    });
  });

  const totalCents = Array.from(paidMap.values()).reduce((acc, value) => acc + value, 0);
  const memberCount = memberIds.length || 1;
  const perMember = memberCount > 0 ? fromCents(totalCents / memberCount) : 0;

  const paymentAdjustments = new Map<string, number>();
  memberIds.forEach((id) => paymentAdjustments.set(id, 0));
  payments.forEach((payment) => {
    const cents = toCents(Number(payment.amount) || 0);
    if (cents === 0) return;
    const fromCurrent = paymentAdjustments.get(payment.from_id) ?? 0;
    const toCurrent = paymentAdjustments.get(payment.to_id) ?? 0;
    paymentAdjustments.set(payment.from_id, fromCurrent + cents);
    paymentAdjustments.set(payment.to_id, toCurrent - cents);
  });

  const membersSummary: FlatSettlementMember[] = members.map((member) => {
    const paid = paidMap.get(member.id) ?? 0;
    const share = shareMap.get(member.id) ?? 0;
    const baseBalance = paid - share;
    const adjustment = paymentAdjustments.get(member.id) ?? 0;
    const balance = baseBalance + adjustment;
      return {
        id: member.id,
        avatar_url: member.avatar_url ?? null,
        first_name: member.first_name ?? null,
        last_name: member.last_name ?? null,
      paid: fromCents(paid),
      share: fromCents(share),
      balance: fromCents(balance),
    };
  });

  const debtors = membersSummary
    .filter((member) => member.balance < 0)
    .map((member) => ({ id: member.id, amount: toCents(-member.balance) }));
  const creditors = membersSummary
    .filter((member) => member.balance > 0)
    .map((member) => ({ id: member.id, amount: toCents(member.balance) }));

  const transfers: FlatSettlementTransfer[] = [];
  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    const transferAmount = Math.min(debtor.amount, creditor.amount);

    if (transferAmount > 0) {
      const key = `${debtor.id}|${creditor.id}|${transferAmount}`;
      transfers.push({
        from_id: debtor.id,
        to_id: creditor.id,
        amount: fromCents(transferAmount),
        paid: paidSet.has(key),
      });
      debtor.amount -= transferAmount;
      creditor.amount -= transferAmount;
    }

    if (debtor.amount === 0) debtorIndex += 1;
    if (creditor.amount === 0) creditorIndex += 1;
  }

  return {
    flat_id: flatId,
    flat_address: flatInfo?.address ?? null,
    flat_city: flatInfo?.city ?? null,
    flat_district: flatInfo?.district ?? null,
    month,
    total: fromCents(totalCents),
    member_count: memberIds.length,
    per_member: perMember,
    members: membersSummary,
    transfers,
    payments: payments.map((payment) => ({
      from_id: payment.from_id,
      to_id: payment.to_id,
      amount: Number(payment.amount) || 0,
    })),
  };
}

serve(
  withAuth(async (req: Request, payload: JWTPayload): Promise<Response> => {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }

    const userId = getUserId(payload);
    const url = new URL(req.url);
    const flatId = url.searchParams.get('flat_id');
    const month = url.searchParams.get('month');

    if (req.method === 'GET') {
      if (!flatId) {
        return new Response(JSON.stringify({ error: 'flat_id is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (month && !MONTH_PATTERN.test(month)) {
        return new Response(JSON.stringify({ error: 'Invalid month format' }), {
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

      const expenses = await loadExpenses(flatId, month ?? null);
      const expenseParticipants = await loadExpenseParticipants(
        expenses.map((expense) => expense.id)
      );
      const flatInfo = await loadFlatInfo(flatId);
      const members = await loadFlatMembers(flatId, flatInfo);
      const { paidSet, payments } = await loadPaidTransfers(flatId, month ?? null);
      const summary = buildSettlementSummary(
        flatId,
        month ?? null,
        flatInfo,
        members,
        expenses,
        expenseParticipants,
        paidSet,
        payments
      );

      return new Response(JSON.stringify({ data: summary }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'POST') {
      const body = await req.json();
      const bodyFlatId = typeof body?.flat_id === 'string' ? body.flat_id.trim() : '';
      const bodyMonth = typeof body?.month === 'string' ? body.month.trim() : '';
      const fromId = typeof body?.from_id === 'string' ? body.from_id.trim() : '';
      const toId = typeof body?.to_id === 'string' ? body.to_id.trim() : '';
      const amountRaw = body?.amount;
      const amount = typeof amountRaw === 'number' ? amountRaw : Number(amountRaw);
      const paid = Boolean(body?.paid);

      if (!bodyFlatId || !bodyMonth || !fromId || !toId || !Number.isFinite(amount)) {
        return new Response(JSON.stringify({ error: 'Invalid payload' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!MONTH_PATTERN.test(bodyMonth)) {
        return new Response(JSON.stringify({ error: 'Invalid month format' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!(await canAccessFlat(bodyFlatId, userId))) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (paid) {
        const { error } = await supabaseAdmin
          .from('flat_settlement_payments')
          .upsert(
            {
              flat_id: bodyFlatId,
              month: bodyMonth,
              from_id: fromId,
              to_id: toId,
              amount,
              marked_by: userId,
            },
            { onConflict: 'flat_id,month,from_id,to_id,amount' }
          );

        if (error) {
          console.error('[flat-settlements] upsert error:', error);
          return new Response(JSON.stringify({ error: 'Error saving payment' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      } else {
        const { error } = await supabaseAdmin
          .from('flat_settlement_payments')
          .delete()
          .eq('flat_id', bodyFlatId)
          .eq('month', bodyMonth)
          .eq('from_id', fromId)
          .eq('to_id', toId)
          .eq('amount', amount);

        if (error) {
          console.error('[flat-settlements] delete error:', error);
          return new Response(JSON.stringify({ error: 'Error deleting payment' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      return new Response(JSON.stringify({ data: { success: true } }), {
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
