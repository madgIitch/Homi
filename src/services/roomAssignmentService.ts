import { API_CONFIG } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RoomAssignment, RoomAssignmentsResponse } from '../types/roomAssignment';

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

class RoomAssignmentService {
  private async getAuthHeaders(): Promise<HeadersInit> {
    const token = await AsyncStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  async getAssignments(matchId: string): Promise<RoomAssignmentsResponse> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(
      `${API_CONFIG.FUNCTIONS_URL}/room-assignments?match_id=${matchId}`,
      {
        method: 'GET',
        headers,
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Error al obtener asignaciones');
    }

    const payload = (await response.json()) as ApiResponse<RoomAssignmentsResponse>;
    if (!payload.data) {
      throw new Error('Respuesta invalida al obtener asignaciones');
    }

    return payload.data;
  }

  async getAssignmentsForRoom(roomId: string): Promise<RoomAssignmentsResponse> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(
      `${API_CONFIG.FUNCTIONS_URL}/room-assignments?room_id=${roomId}`,
      {
        method: 'GET',
        headers,
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Error al obtener asignaciones');
    }

    const payload = (await response.json()) as ApiResponse<RoomAssignmentsResponse>;
    if (!payload.data) {
      throw new Error('Respuesta invalida al obtener asignaciones');
    }

    return payload.data;
  }

  async getAssignmentsForOwner(): Promise<RoomAssignmentsResponse> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(
      `${API_CONFIG.FUNCTIONS_URL}/room-assignments?owner=true`,
      {
        method: 'GET',
        headers,
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Error al obtener asignaciones');
    }

    const payload = (await response.json()) as ApiResponse<RoomAssignmentsResponse>;
    if (!payload.data) {
      throw new Error('Respuesta invalida al obtener asignaciones');
    }

    return payload.data;
  }

  async createAssignment(input: {
    match_id?: string;
    room_id: string;
    assignee_id: string;
  }): Promise<RoomAssignment> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${API_CONFIG.FUNCTIONS_URL}/room-assignments`, {
      method: 'POST',
      headers,
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Error al asignar habitacion');
    }

    const payload = (await response.json()) as ApiResponse<RoomAssignment>;
    if (!payload.data) {
      throw new Error('Respuesta invalida al asignar habitacion');
    }

    return payload.data;
  }

  async updateAssignment(input: {
    assignment_id: string;
    status: 'accepted' | 'rejected';
  }): Promise<RoomAssignment> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${API_CONFIG.FUNCTIONS_URL}/room-assignments`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Error al actualizar asignacion');
    }

    const payload = (await response.json()) as ApiResponse<RoomAssignment>;
    if (!payload.data) {
      throw new Error('Respuesta invalida al actualizar asignacion');
    }

    return payload.data;
  }
}

export const roomAssignmentService = new RoomAssignmentService();
