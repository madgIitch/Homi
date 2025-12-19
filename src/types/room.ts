import type { Profile } from './profile';

export interface Flat {
  id: string;
  owner_id: string;
  address: string;
  city: string;
  district?: string;
  total_rooms?: number;
  common_areas_description?: string;
  created_at: string;
}

export interface Room {
  id: string;
  flat_id: string;
  owner_id: string;
  title: string;
  description?: string;
  price_per_month: number;
  size_m2?: number;
  is_available?: boolean;
  available_from?: string;
  created_at: string;
  flat?: Flat;
}

export interface RoomInterest {
  id: string;
  user_id: string;
  room_id: string;
  message?: string;
  created_at: string;
  user?: Profile;
  room?: Room;
}

export interface FlatCreateRequest {
  address: string;
  city: string;
  district?: string;
  total_rooms?: number;
  common_areas_description?: string;
}

export interface RoomCreateRequest {
  flat_id: string;
  title: string;
  description?: string;
  price_per_month: number;
  size_m2?: number;
  is_available?: boolean;
  available_from?: string;
}

export interface RoomFilters {
  city?: string;
  price_min?: number;
  price_max?: number;
  available_from?: string;
}

export interface RoomExtraDetails {
  roomType?: 'individual' | 'doble';
  services?: string[];
  rules?: string;
  photos?: string[];
}
