// src/types/profile.ts  
import type { Gender } from './gender';
export interface LifestylePreferences {  
  schedule?: string | null;  
  cleaning?: string | null;  
  guests?: string | null;  
}  
  
export type HousingSituation = 'seeking' | 'offering';  
  
export interface Profile {  
  id: string;  
  user_id: string;  
    
  // Add these missing fields  
  last_name?: string;  
  age?: number;  
    
  display_name: string | null;  
  bio: string | null;  
  occupation: string | null;  
  university: string | null;  
  field_of_study: string | null;  
  gender?: Gender | null;
  birth_date?: string | null;
  
  interests: string[];  
  lifestyle_preferences: LifestylePreferences | null;  
  housing_situation: HousingSituation | null;  
  preferred_zones: string[];  
  
  budget_min: number | null;  
  budget_max: number | null;  
  
  avatar_url: string | null;  
  
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
  // Add this missing field  
  last_name?: string;  
  age?: number;  
    
  display_name?: string;  
  bio?: string;  
  occupation?: string;  
  university?: string;  
  field_of_study?: string;  
  
  interests?: string[];  
  lifestyle_preferences?: LifestylePreferences;  
  housing_situation?: HousingSituation;  
  preferred_zones?: string[];  
  
  budget_min?: number;  
  budget_max?: number;  
  
  avatar_url?: string;  
}
