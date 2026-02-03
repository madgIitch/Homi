export type ExpenseGroupRole = 'owner' | 'admin' | 'member';
export type ExpenseGroupMemberStatus = 'pending' | 'accepted' | 'declined';

export interface ExpenseGroup {
  id: string;
  name: string;
  description?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  role?: ExpenseGroupRole;
  status?: ExpenseGroupMemberStatus;
}

export interface ExpenseGroupMember {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  avatar_url?: string | null;
}

export interface ExpenseGroupMemberRecord {
  id: string;
  group_id: string;
  user_id: string;
  role: ExpenseGroupRole;
  status: ExpenseGroupMemberStatus;
  joined_at: string;
  invited_by?: string | null;
}

export interface ExpenseGroupMemberProfile {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  avatar_url?: string | null;
}

export interface ExpenseGroupMemberWithProfile extends ExpenseGroupMemberRecord {
  profile?: ExpenseGroupMemberProfile | null;
}

export interface GroupExpenseParticipantDetail {
  user_id: string;
  share_amount: number;
  is_paid: boolean;
}

export interface GroupExpense {
  id: string;
  group_id: string;
  concept: string;
  amount: number;
  expense_date: string;
  note?: string | null;
  created_by: string;
  created_at: string;
  participants?: string[];
  participant_details?: GroupExpenseParticipantDetail[];
  creator?: {
    id: string;
    first_name?: string | null;
    last_name?: string | null;
    avatar_url?: string | null;
  } | null;
}

export interface GroupExpenseNotificationData {
  type: 'group_expense';
  group_id: string;
  expense_id: string;
  amount: string;
  concept: string;
  creator_name: string;
  creator_avatar_url: string;
}
