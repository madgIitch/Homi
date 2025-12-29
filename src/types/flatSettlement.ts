export interface FlatSettlementMember {
  id: string;
  display_name?: string | null;
  avatar_url?: string | null;
  paid: number;
  share: number;
  balance: number;
}

export interface FlatSettlementTransfer {
  from_id: string;
  to_id: string;
  amount: number;
  paid?: boolean;
}

export interface FlatSettlementPayment {
  from_id: string;
  to_id: string;
  amount: number;
}

export interface FlatSettlementSummary {
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
