import { API_CONFIG } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FlatSettlementSummary } from '../types/flatSettlement';

interface FlatSettlementResponse {
  data: FlatSettlementSummary;
}

class FlatSettlementService {
  private async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await AsyncStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  async getSettlement(flatId: string, month?: string): Promise<FlatSettlementSummary> {
    const headers = await this.getAuthHeaders();
    const query = `flat_id=${encodeURIComponent(flatId)}${
      month ? `&month=${encodeURIComponent(month)}` : ''
    }`;
    const response = await fetch(
      `${API_CONFIG.FUNCTIONS_URL}/flat-settlements?${query}`,
      {
        method: 'GET',
        headers,
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Error al obtener cuentas');
    }

    const data: FlatSettlementResponse = await response.json();
    return data.data;
  }

  async setTransferPaid(payload: {
    flat_id: string;
    month: string;
    from_id: string;
    to_id: string;
    amount: number;
    paid: boolean;
  }): Promise<void> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${API_CONFIG.FUNCTIONS_URL}/flat-settlements`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Error al actualizar el pago');
    }
  }
}

export const flatSettlementService = new FlatSettlementService();
