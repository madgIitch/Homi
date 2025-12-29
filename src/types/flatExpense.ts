export interface FlatExpense {
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
    display_name?: string | null;
    avatar_url?: string | null;
  } | null;
}

export interface FlatExpenseMember {
  id: string;
  display_name?: string | null;
  avatar_url?: string | null;
}
