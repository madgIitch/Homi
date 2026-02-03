// src/types/profile.ts  
import type { Gender } from './gender';
export interface LifestylePreferences {  
  schedule?: string | null;  
  cleaning?: string | null;  
  guests?: string | null;  
  smoking?: string | null;
  pets?: string | null;
}  
  
export type HousingSituation = 'seeking' | 'offering';  
export type AppearanceMode = 'owner-only' | 'seeker-only' | 'both';
  
export interface Profile {  
  id: string;  
  user_id: string;  
    
  // Add these missing fields  
  first_name?: string | null;
  last_name?: string;  
  age?: number;  
    
  bio: string | null;  
  occupation: string | null;  
  university: string | null;  
  field_of_study: string | null;  
  gender?: Gender | null;
  birth_date?: string | null;
  
  interests: string[];  
  lifestyle_preferences: LifestylePreferences | null;  
  housing_situation: HousingSituation | null;  
  is_seeking?: boolean | null;
  appearance_mode?: AppearanceMode | null;
  preferred_zones: string[];  
  
  budget_min: number | null;  
  budget_max: number | null;  
  desired_roommates_min?: number | null;
  desired_roommates_max?: number | null;

  avatar_url: string | null;
  is_searchable?: boolean | null;
  is_premium?: boolean | null;
  onboarding_completed?: boolean | null;

  created_at: string;
  updated_at: string;
}  

export interface ProfilePhoto {
  id: string;
  profile_id: string;
  path: string;
  position: number;
  is_primary: boolean;
  signedUrl: string;
  created_at: string;
}
  
export interface ProfileCreateRequest {  
  first_name?: string;
  last_name?: string;  
  age?: number;  
    
  bio?: string;  
  occupation?: string;  
  university?: string;  
  field_of_study?: string;  
  birth_date?: string;
  
  interests?: string[];  
  lifestyle_preferences?: LifestylePreferences;  
  housing_situation?: HousingSituation;  
  is_seeking?: boolean;
  appearance_mode?: AppearanceMode;
  preferred_zones?: string[];  
  
  budget_min?: number;  
  budget_max?: number;  
  desired_roommates_min?: number;
  desired_roommates_max?: number;

  avatar_url?: string;  
  is_searchable?: boolean;
  is_premium?: boolean;
}  

export type LocationDisplayLevel = 'zone-city' | 'city-province' | 'province';

export interface RoomRecommendation {
  profile: Profile;
  compatibility_score: number;
  match_reasons: string[];
  location_display_level?: LocationDisplayLevel | null;
  location_zone_id?: string | null;
  location_zone_name?: string | null;
  location_city_id?: string | null;
  location_city_name?: string | null;
  location_province_code?: string | null;
  location_province_name?: string | null;
}
