// src/services/roomService.ts  
import { Flat, Room, FlatCreateRequest, RoomCreateRequest, RoomFilters } from '../types/room';  
import { API_CONFIG } from '../config/api';  
import AsyncStorage from '@react-native-async-storage/async-storage';  
  
interface FlatResponse {  
  data: Flat[];  
}  
  
interface RoomResponse {  
  data: Room[];  
}  
  
interface SingleFlatResponse {  
  data: Flat;  
}  
  
interface SingleRoomResponse {  
  data: Room;  
}  
  
interface PaginatedRoomResponse {  
  data: Room[];  
  count: number;  
  page: number;  
  per_page: number;  
  total_pages: number;  
}  
  
class RoomService {  
  private async getAuthHeaders(): Promise<HeadersInit> {  
    const token = await AsyncStorage.getItem('authToken');  
    return {  
      'Content-Type': 'application/json',  
      ...(token && { Authorization: `Bearer ${token}` }),  
    };  
  }  
  
  // === FLATS OPERATIONS ===  
  
  async getFlats(): Promise<Flat[]> {  
    const headers = await this.getAuthHeaders();  
      
    const response = await fetch(`${API_CONFIG.FUNCTIONS_URL}/rooms?type=flats`, {  
      method: 'GET',  
      headers,  
    });  
  
    if (!response.ok) {  
      throw new Error('Error al obtener los pisos');  
    }  
  
    const data: FlatResponse = await response.json();  
    return data.data;  
  }  

  async getFlatsByOwner(ownerId: string): Promise<Flat[]> {  
    const headers = await this.getAuthHeaders();  
      
    const response = await fetch(
      `${API_CONFIG.FUNCTIONS_URL}/rooms?type=flats&owner_id=${ownerId}`,
      {  
        method: 'GET',  
        headers,  
      }  
    );  

    if (!response.ok) {  
      throw new Error('Error al obtener los pisos');  
    }  

    const data: FlatResponse = await response.json();  
    return data.data;  
  }  
  
  async createFlat(flatData: FlatCreateRequest): Promise<Flat> {  
    const headers = await this.getAuthHeaders();  
      
    const response = await fetch(`${API_CONFIG.FUNCTIONS_URL}/rooms?type=flat`, {  
      method: 'POST',  
      headers,  
      body: JSON.stringify(flatData),  
    });  
  
    if (!response.ok) {  
      const error = await response.json();  
      throw new Error(error.error || 'Error al crear el piso');  
    }  
  
    const data: SingleFlatResponse = await response.json();  
    return data.data;  
  }  
  
  async updateFlat(flatId: string, updates: Partial<FlatCreateRequest>): Promise<Flat> {  
    const headers = await this.getAuthHeaders();  
      
    const response = await fetch(`${API_CONFIG.FUNCTIONS_URL}/rooms/${flatId}?type=flat`, {  
      method: 'PATCH',  
      headers,  
      body: JSON.stringify(updates),  
    });  
  
    if (!response.ok) {  
      const error = await response.json();  
      throw new Error(error.error || 'Error al actualizar el piso');  
    }  
  
    const data: SingleFlatResponse = await response.json();  
    return data.data;  
  }  
  
  // === ROOMS OPERATIONS ===  
  
  async getRooms(): Promise<Room[]> {  
    const headers = await this.getAuthHeaders();  
      
    const response = await fetch(`${API_CONFIG.FUNCTIONS_URL}/rooms?type=rooms`, {  
      method: 'GET',  
      headers,  
    });  
  
    if (!response.ok) {  
      throw new Error('Error al obtener las habitaciones');  
    }  
  
    const data: RoomResponse = await response.json();  
    return data.data;  
  }  

  async getRoomsByOwner(ownerId: string): Promise<Room[]> {  
    const headers = await this.getAuthHeaders();  
      
    const response = await fetch(
      `${API_CONFIG.FUNCTIONS_URL}/rooms?type=rooms&owner_id=${ownerId}`,
      {  
        method: 'GET',  
        headers,  
      }  
    );  

    if (!response.ok) {  
      throw new Error('Error al obtener las habitaciones');  
    }  

    const data: RoomResponse = await response.json();  
    return data.data;  
  }  
  
  async createRoom(roomData: RoomCreateRequest): Promise<Room> {  
    const headers = await this.getAuthHeaders();  
      
    const response = await fetch(`${API_CONFIG.FUNCTIONS_URL}/rooms?type=room`, {  
      method: 'POST',  
      headers,  
      body: JSON.stringify(roomData),  
    });  
  
    if (!response.ok) {  
      const error = await response.json();  
      throw new Error(error.error || 'Error al crear la habitación');  
    }  
  
    const data: SingleRoomResponse = await response.json();  
    return data.data;  
  }  
  
  async updateRoom(roomId: string, updates: Partial<RoomCreateRequest>): Promise<Room> {  
    const headers = await this.getAuthHeaders();  
      
    const response = await fetch(`${API_CONFIG.FUNCTIONS_URL}/rooms/${roomId}?type=room`, {  
      method: 'PATCH',  
      headers,  
      body: JSON.stringify(updates),  
    });  
  
    if (!response.ok) {  
      const error = await response.json();  
      throw new Error(error.error || 'Error al actualizar la habitación');  
    }  
  
    const data: SingleRoomResponse = await response.json();  
    return data.data;  
  }  

  async getRoomById(roomId: string): Promise<Room> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(
      `${API_CONFIG.FUNCTIONS_URL}/rooms/${roomId}?type=room`,
      {
        method: 'GET',
        headers,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Error al obtener la habitacion');
    }

    const data: SingleRoomResponse = await response.json();
    return data.data;
  }

  async deleteRoom(roomId: string): Promise<void> {  
    const headers = await this.getAuthHeaders();  
  
    const response = await fetch(  
      `${API_CONFIG.FUNCTIONS_URL}/rooms/${roomId}?type=room`,  
      {  
        method: 'DELETE',  
        headers,  
      }  
    );  
  
    if (!response.ok) {  
      const error = await response.json();  
      throw new Error(error.error || 'Error al eliminar la habitacion');  
    }  
  }  
  
  // === SEARCH OPERATIONS ===  
  
  async searchRooms(  
    filters: RoomFilters = {},  
    page: number = 1,  
    perPage: number = 20  
  ): Promise<PaginatedRoomResponse> {  
    const headers = await this.getAuthHeaders();  
      
    const response = await fetch(`${API_CONFIG.FUNCTIONS_URL}/rooms/search`, {  
      method: 'POST',  
      headers,  
      body: JSON.stringify({  
        filters,  
        page,  
        per_page: perPage,  
      }),  
    });  
  
    if (!response.ok) {  
      const error = await response.json();  
      throw new Error(error.error || 'Error en la búsqueda de habitaciones');  
    }  
  
    const data: PaginatedRoomResponse = await response.json();  
    return data;  
  }  
  
  // === UTILITY METHODS ===  
  
  async getMyRooms(): Promise<Room[]> {  
    return this.getRooms();  
  }  
  
  async getMyFlats(): Promise<Flat[]> {  
    return this.getFlats();  
  }  
}  
  
export const roomService = new RoomService();
