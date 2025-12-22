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
  app_metadata: Record<string, unknown>  
  user_metadata: Record<string, unknown>  
  role: string  
} 
  
// ====================    
// Entidades de Base de Datos (actualizadas para coincidir con SQL)    
// ====================    
  
export interface User {    
  id: string    
  email: string    
  first_name: string    
  last_name: string    
  identity_document?: string    
  birth_date: string    
  gender?: string
  created_at: string    
}  
  
export interface Profile {      
  id: string      
  display_name?: string      
  avatar_url?: string      
  bio?: string      
  gender?: string      
  birth_date?: string
  occupation?: string      
  smoker?: boolean      
  has_pets?: boolean      
  social_links?: Record<string, unknown>      
  updated_at: string  
    
  // Campos adicionales para Sprint 2  
  university?: string  
  field_of_study?: string  
  interests?: string[]  
  lifestyle_preferences?: {  
    schedule?: string  
    cleaning?: string  
    guests?: string  
  }  
  housing_situation?: 'seeking' | 'offering'  
  preferred_zones?: string[]  
  budget_min?: number  
  budget_max?: number  
}
  
export interface Flat {    
  id: string    
  owner_id: string    
  address: string    
  city: string    
  district?: string    
  gender_policy?: string
  rules?: string
  services?: FlatService[]
  created_at: string    
}  

export interface FlatService {
  name: string
  price?: number
}
  
export interface Room {    
  id: string    
  flat_id: string    
  owner_id: string    
  title: string    
  description?: string    
  price_per_month: number    
  size_m2?: number    
  is_available?: boolean    
  available_from: string    
  created_at: string    
}  
  
export interface RoomInterest {    
  id: string    
  user_id: string    
  room_id: string    
  message?: string    
  created_at: string    
}  
  
export interface Match {    
  id: string    
  user_a_id: string    
  user_b_id: string    
  status: 'pending' | 'accepted' | 'rejected'    
  matched_at: string    
}  
  
// ====================    
// Entidades adicionales (chats, messages) - sin cambios en SQL    
// ====================    
  
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
// Tipos de API Request/Response (actualizados)    
// ====================    
  
export interface AuthSignupRequest {    
  email: string    
  password: string    
  data: {    
    first_name: string    
    last_name: string    
    birth_date: string    
    identity_document?: string    
  }    
}  
  
export interface AuthResponse {    
  access_token: string    
  token_type: string    
  expires_in: number    
  refresh_token: string    
  user: User    
}  
  
export interface ProfileCreateRequest {    
  id: string  
  display_name?: string    
  avatar_url?: string    
  bio?: string    
  gender?: string    
  occupation?: string    
  smoker?: boolean    
  has_pets?: boolean    
  social_links?: Record<string, unknown>  
    
  // Campos adicionales para Sprint 2  
  university?: string  
  field_of_study?: string  
  interests?: string[]  
  lifestyle_preferences?: {  
    schedule?: string  
    cleaning?: string  
    guests?: string  
  }  
  housing_situation?: 'seeking' | 'offering'  
  preferred_zones?: string[]  
  budget_min?: number  
  budget_max?: number  
}
  
export interface FlatCreateRequest {    
  address: string    
  city: string    
  district?: string    
  rules?: string
  services?: FlatService[]
}  
  
export interface RoomCreateRequest {    
  flat_id: string    
  title: string    
  description?: string    
  price_per_month: number    
  size_m2?: number    
  is_available?: boolean    
  available_from?: string    
}  
  
export interface RoomInterestCreateRequest {    
  room_id: string   
  user_id: string  // Añadir esta línea  
  message?: string    
}  
  
export interface MessageCreateRequest {    
  chat_id: string    
  body: string    
}  
  
// ====================    
// Tipos de Respuestas de API    
// ====================    
  
export interface ApiResponse<T = unknown> {    
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
  
// ====================    
// Tipos de Utilidad (actualizados)    
// ====================    
  
export type DatabaseEntity = User | Profile | Flat | Room | RoomInterest | Match | Chat | Message    
  
export type MatchStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'room_offer'
  | 'room_assigned'
  | 'room_declined'
  
// ====================    
// Tipos para Errores    
// ====================    
  
export interface ApiError {    
  code: string    
  message: string    
  details?: unknown    
}  
  
export interface ValidationError extends ApiError {    
  field: string    
}

export interface RoomRecommendation {  
  profile: Profile  
  compatibility_score: number  
  match_reasons: string[]  
}  
  
export interface RecommendationResponse {  
  recommendations: RoomRecommendation[]  
}


export interface RoomFilters {  
  city?: string  
  price_min?: number  
  price_max?: number  
  available_from?: string  
}

// Tipos para registro por fases  
export interface Phase1Request {  
  email: string  
  password?: string // opcional si usa Google  
  is_google_user?: boolean  
}  
  
export interface Phase2Request {  
  temp_token: string  
  first_name: string  
  last_name: string  
  gender: string  
}  
  
export interface Phase3Request {  
  temp_token: string  
  birth_date: string  
}  
  
export interface TempRegistrationResponse {  
  temp_token: string  
  email: string  
  expires_at: string  
}
