import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../config/api';
import type {
  ExpenseGroup,
  ExpenseGroupMember,
  ExpenseGroupMemberWithProfile,
  GroupExpense,
} from '../types/expenseGroup';

interface ExpenseGroupResponse {
  data: ExpenseGroup[];
}

interface SingleExpenseGroupResponse {
  data: ExpenseGroup;
}

interface GroupExpenseResponse {
  data: GroupExpense[];
  members?: ExpenseGroupMember[];
  total?: number;
  hasMore?: boolean;
}

interface SingleGroupExpenseResponse {
  data: GroupExpense;
}

interface GroupMembersResponse {
  data: ExpenseGroupMemberWithProfile[];
}

class ExpenseGroupService {
  private async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await AsyncStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  async getUserGroups(): Promise<ExpenseGroup[]> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${API_CONFIG.FUNCTIONS_URL}/expense-groups`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error('Error al obtener grupos de gastos');
    }

    const data: ExpenseGroupResponse = await response.json();
    return data.data ?? [];
  }

  async createGroup(payload: {
    name: string;
    description?: string;
  }): Promise<ExpenseGroup> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${API_CONFIG.FUNCTIONS_URL}/expense-groups`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Error al crear el grupo');
    }

    const data: SingleExpenseGroupResponse = await response.json();
    return data.data;
  }

  async createInviteLink(groupId: string): Promise<{ link: string; code: string }> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(
      `${API_CONFIG.FUNCTIONS_URL}/expense-group-invites`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ group_id: groupId, link_only: true }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Error al crear link de invitacion');
    }

    const data = (await response.json()) as {
      data?: { link?: string; code?: string }[];
    };
    const invite = data.data?.[0];
    if (!invite?.link || !invite?.code) {
      throw new Error('No se pudo generar el link');
    }
    return { link: invite.link, code: invite.code };
  }

  async joinByCode(code: string): Promise<void> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(
      `${API_CONFIG.FUNCTIONS_URL}/expense-group-invites`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ token: code.trim() }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Error al unirse al grupo');
    }
  }

  async acceptInvite(token: string): Promise<void> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(
      `${API_CONFIG.FUNCTIONS_URL}/expense-group-invites`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ token }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Error al aceptar invitacion');
    }
  }

  async getGroupExpenses(
    groupId: string,
    month?: string,
    options?: {
      includeMembers?: boolean;
      limit?: number;
      offset?: number;
    }
  ): Promise<{
    expenses: GroupExpense[];
    members: ExpenseGroupMember[];
    total?: number;
    hasMore?: boolean;
  }> {
    const headers = await this.getAuthHeaders();
    const includeMembers = options?.includeMembers ?? false;
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;

    const query = `group_id=${encodeURIComponent(groupId)}${
      month ? `&month=${encodeURIComponent(month)}` : ''
    }${includeMembers ? '&include_members=true' : ''}&limit=${limit}&offset=${offset}`;
    const response = await fetch(
      `${API_CONFIG.FUNCTIONS_URL}/group-expenses?${query}`,
      {
        method: 'GET',
        headers,
      }
    );

    if (!response.ok) {
      throw new Error('Error al obtener gastos del grupo');
    }

    const data: GroupExpenseResponse = await response.json();
    return {
      expenses: data.data ?? [],
      members: data.members ?? [],
      total: data.total,
      hasMore: data.hasMore,
    };
  }

  async getGroupMembers(groupId: string): Promise<ExpenseGroupMemberWithProfile[]> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(
      `${API_CONFIG.FUNCTIONS_URL}/expense-groups/members?group_id=${encodeURIComponent(
        groupId
      )}`,
      {
        method: 'GET',
        headers,
      }
    );

    if (!response.ok) {
      throw new Error('Error al obtener miembros del grupo');
    }

    const data: GroupMembersResponse = await response.json();
    return data.data ?? [];
  }

  async createGroupExpense(payload: {
    group_id: string;
    concept: string;
    amount: number;
    expense_date?: string;
    note?: string;
    participants?: string[];
    custom_shares?: Record<string, number>;
  }): Promise<GroupExpense> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${API_CONFIG.FUNCTIONS_URL}/group-expenses`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Error al guardar gasto del grupo');
    }

    const data: SingleGroupExpenseResponse = await response.json();
    return data.data;
  }

  async updatePaymentStatus(expenseId: string, usrId: string, isPaid: boolean): Promise<void> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${API_CONFIG.FUNCTIONS_URL}/group-expenses`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        expense_id: expenseId,
        user_id: usrId,
        is_paid: isPaid,
      }),
    });

    if (!response.ok) {
      throw new Error('Error al actualizar estado de pago');
    }
  }

  async removeMember(groupId: string, memberId: string): Promise<void> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(
      `${API_CONFIG.FUNCTIONS_URL}/expense-groups/members`,
      {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ group_id: groupId, member_id: memberId }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Error al eliminar miembro');
    }
  }

  async leaveGroup(groupId: string): Promise<void> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${API_CONFIG.FUNCTIONS_URL}/expense-groups/leave`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ group_id: groupId }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Error al salir del grupo');
    }
  }

  async getGroupBalances(groupId: string): Promise<Record<string, number>> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(
      `${API_CONFIG.FUNCTIONS_URL}/group-expenses?group_id=${encodeURIComponent(groupId)}&action=balances`,
      {
        method: 'GET',
        headers,
      }
    );

    if (!response.ok) {
      throw new Error('Error al obtener balances');
    }

    const data = (await response.json()) as { data: Record<string, number> };
    return data.data;
  }
}

export const expenseGroupService = new ExpenseGroupService();
