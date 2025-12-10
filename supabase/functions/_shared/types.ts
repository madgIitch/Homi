// supabase/functions/_shared/types.ts  
  
/**  
 * Tipos compartidos para las Edge Functions de HomiMatch  
 * Define interfaces para entidades de base de datos y payloads de API  
 */  
  
// ====================  
// Tipos de Autenticación  
// ====================  
  
export interface JWTPayload {  
  aud: string  
  exp: number  
  sub: string  
  email: string  
  phone?: string  
  app_metadata: Record<string, any>  
  user_metadata: Record<string, any>  
  role: string  
}  
  
// ====================  
// Entidades de Base de Datos  
// ====================  
  
export interface User {  
  id: string  
  email: string  
  username: string  
  created_at: string  
  updated_at: string  
  is_premium: boolean  
  role: 'seeker' | 'landlord' | 'both'  
}  
  
export interface Profile {  
  id: string  
  user_id: string  
  name: string  
  age?: number  
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say'  
  bio?: string  
  budget_min?: number  
  budget_max?: number  
  schedule?: 'morning' | 'afternoon' | 'night' | 'flexible'  
  lifestyle_habits: LifestyleHabits  
  interests: string[]  
  preferred_zones: string[]  
  city?: string  
  university?: string  
  occupation?: string  
  created_at: string  
  updated_at: string  
}  
  
export interface LifestyleHabits {  
  cleanliness?: 'very_clean' | 'clean' | 'moderate' | 'messy'  
  smoking?: boolean  
  pets?: boolean  
  guests?: 'never' | 'rarely' | 'occasional' | 'frequently'  
  remote_work?: boolean  
  noise_level?: 'quiet' | 'moderate' | 'noisy'  
  party_habits?: 'never' | 'occasionally' | 'regularly'  
}  
  
export interface Piso {  
  id: string  
  owner_id: string  
  address: string  
  city: string  
  neighborhood?: string  
  total_rooms: number  
  floor?: number  
  square_meters?: number  
  description?: string  
  amenities: Record<string, any>  
  created_at: string  
  updated_at: string  
}  
  
export interface Habitacion {  
  id: string  
  piso_id: string  
  owner_id: string  
  square_meters?: number  
  price: number  
  expenses_included: boolean  
  available_from: string  
  available_until?: string  
  description?: string  
  photos: string[]  
  is_available: boolean  
  room_type: 'single' | 'double' | 'shared'  
  private_bathroom: boolean  
  current_roommates: number  
  created_at: string  
  updated_at: string  
}  
  
export interface Interes {  
  id: string  
  profile_id: string  
  habitacion_id: string  
  status: 'pending' | 'accepted' | 'rejected'  
  created_at: string  
  updated_at: string  
}  
  
export interface Match {  
  id: string  
  seeker_profile_id: string  
  habitacion_id: string  
  status: 'pending' | 'accepted' | 'rejected'  
  created_at: string  
  updated_at: string  
}  
  
export interface Chat {  
  id: string  
  match_id: string  
  created_at: string  
  updated_at: string  
}  
  
export interface Message {  
  id: string  
  chat_id: string  
  sender_id: string  
  body: string  
  created_at: string  
  read_at?: string  
}  
  
// ====================  
// Tipos de API Request/Response  
// ====================  
  
export interface AuthSignupRequest {  
  email: string  
  password: string  
  data: {  
    username: string  
  }  
}  
  
export interface AuthResponse {  
  access_token: string  
  token_type: string  
  expires_in: number  
  refresh_token: string  
  user: {  
    id: string  
    email: string  
    created_at: string  
  }  
}  
  
export interface ProfileCreateRequest {  
  user_id: string  
  name: string  
  age?: number  
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say'  
  bio?: string  
  budget_min?: number  
  budget_max?: number  
  schedule?: 'morning' | 'afternoon' | 'night' | 'flexible'  
  lifestyle_habits: LifestyleHabits  
  interests: string[]  
  preferred_zones: string[]  
  city?: string  
  university?: string  
  occupation?: string  
}  
  
export interface PisoCreateRequest {  
  owner_id: string  
  address: string  
  city: string  
  neighborhood?: string  
  total_rooms: number  
  floor?: number  
  square_meters?: number  
  description?: string  
  amenities?: Record<string, any>  
}  
  
export interface HabitacionCreateRequest {  
  piso_id: string  
  owner_id: string  
  square_meters?: number  
  price: number  
  expenses_included?: boolean  
  available_from: string  
  available_until?: string  
  description?: string  
  photos?: string[]  
  room_type?: 'single' | 'double' | 'shared'  
  private_bathroom?: boolean  
  current_roommates?: number  
}  
  
export interface InteresCreateRequest {  
  profile_id: string  
  habitacion_id: string  
}  
  
export interface MessageCreateRequest {  
  chat_id: string  
  body: string  
}  
  
// ====================  
// Tipos de Respuestas de API  
// ====================  
  
export interface ApiResponse<T = any> {  
  data?: T  
  error?: string  
  message?: string  
}  
  
export interface PaginatedResponse<T> {  
  data: T[]  
  count: number  
  page: number  
  per_page: number  
  total_pages: number  
}  
  
export interface RecommendationResponse {  
  recommendations: RoomRecommendation[]  
}  
  
export interface RoomRecommendation {  
  profile: Profile  
  compatibility_score: number  
  match_reasons: string[]  
}  
  
// ====================  
// Tipos de Filtros y Búsqueda  
// ====================  
  
export interface RoomFilters {  
  city?: string  
  price_min?: number  
  price_max?: number  
  zones?: string[]  
  room_type?: 'single' | 'double' | 'shared'  
  private_bathroom?: boolean  
  expenses_included?: boolean  
  available_from?: string  
  max_roommates?: number  
}  
  
export interface ProfileFilters {  
  age_min?: number  
  age_max?: number  
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say'  
  city?: string  
  university?: string  
  budget_min?: number  
  budget_max?: number  
  preferred_zones?: string[]  
  interests?: string[]  
  lifestyle_habits?: Partial<LifestyleHabits>  
}  
  
// ====================  
// Tipos de Utilidad  
// ====================  
  
export type DatabaseEntity = User | Profile | Piso | Habitacion | Interes | Match | Chat | Message  
  
export type UserRole = 'seeker' | 'landlord' | 'both'  
  
export type MatchStatus = 'pending' | 'accepted' | 'rejected'  
  
export type InterestStatus = 'pending' | 'accepted' | 'rejected'  
  
export type RoomType = 'single' | 'double' | 'shared'  
  
export type Schedule = 'morning' | 'afternoon' | 'night' | 'flexible'  
  
export type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say'  
  
// ====================  
// Tipos para Errores  
// ====================  
  
export interface ApiError {  
  code: string  
  message: string  
  details?: any  
}  
  
export interface ValidationError extends ApiError {  
  field: string  
}  
  
// ====================  
// Tipos para Estadísticas y Analytics  
// ====================  
  
export interface SwipeStats {  
  daily_swipes: number  
  total_swipes: number  
  daily_limit: number  
  reset_time: string  
}  
  
export interface MatchStats {  
  total_matches: number  
  pending_matches: number  
  accepted_matches: number  
  rejected_matches: number  
}