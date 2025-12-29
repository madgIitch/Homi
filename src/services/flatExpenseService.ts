import { API_CONFIG } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FlatExpense, FlatExpenseMember } from '../types/flatExpense';

interface FlatExpenseResponse {
  data: FlatExpense[];
  members?: FlatExpenseMember[];
}

interface SingleFlatExpenseResponse {
  data: FlatExpense;
}

class FlatExpenseService {
  private async getAuthHeaders(): Promise<HeadersInit> {
    const token = await AsyncStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  async getExpenses(
    flatId: string,
    month?: string,
    options?: { includeMembers?: boolean }
  ): Promise<{ expenses: FlatExpense[]; members: FlatExpenseMember[] }> {
    const headers = await this.getAuthHeaders();
    const includeMembers = options?.includeMembers ?? false;
    const query = `flat_id=${encodeURIComponent(flatId)}${
      month ? `&month=${encodeURIComponent(month)}` : ''
    }${includeMembers ? '&include_members=true' : ''}`;
    const response = await fetch(
      `${API_CONFIG.FUNCTIONS_URL}/flat-expenses?${query}`,
      {
        method: 'GET',
        headers,
      }
    );

    if (!response.ok) {
      throw new Error('Error al obtener gastos del piso');
    }

    const data: FlatExpenseResponse = await response.json();
    return {
      expenses: data.data ?? [],
      members: data.members ?? [],
    };
  }

  async createExpense(payload: {
    flat_id: string;
    concept: string;
    amount: number;
    expense_date?: string;
    note?: string;
    participants?: string[];
  }): Promise<FlatExpense> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${API_CONFIG.FUNCTIONS_URL}/flat-expenses`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Error al guardar gasto');
    }

    const data: SingleFlatExpenseResponse = await response.json();
    return data.data;
  }
}

export const flatExpenseService = new FlatExpenseService();
