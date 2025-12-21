import type { Profile } from './profile';

export type GenderPolicy = 'mixed' | 'men_only' | 'flinta';

export interface Flat {
  id: string;
  owner_id: string;
  address: string;
  city: string;
  district?: string;
  rules?: string;
  services?: FlatService[];
  gender_policy?: GenderPolicy;
  created_at: string;
}

export interface FlatService {
  name: string;
  price?: number;
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
  rules?: string;
  services?: FlatService[];
  gender_policy?: GenderPolicy;
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
  gender_policy?: GenderPolicy;
}

export interface RoomExtraDetails {
  roomType?: 'individual' | 'doble';
  services?: string[];
  rules?: string;
  photos?: string[];
  category?: 'habitacion' | 'area_comun';
  commonAreaType?: string;
  commonAreaCustom?: string;
}

export interface RoomExtraPhoto {
  path: string;
  signedUrl: string;
}

export interface RoomExtras {
  id: string;
  room_id: string;
  category?: 'habitacion' | 'area_comun';
  room_type?: 'individual' | 'doble';
  common_area_type?: string;
  common_area_custom?: string;
  photos: RoomExtraPhoto[];
  created_at: string;
  updated_at: string;
}
