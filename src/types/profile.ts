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
  preferred_zones: string[];  
  
  budget_min: number | null;  
  budget_max: number | null;  
  desired_roommates_min?: number | null;
  desired_roommates_max?: number | null;

  avatar_url: string | null;  
  is_searchable?: boolean | null;
  is_premium?: boolean | null;

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
  
  interests?: string[];  
  lifestyle_preferences?: LifestylePreferences;  
  housing_situation?: HousingSituation;  
  is_seeking?: boolean;
  preferred_zones?: string[];  
  
  budget_min?: number;  
  budget_max?: number;  
  desired_roommates_min?: number;
  desired_roommates_max?: number;

  avatar_url?: string;  
  is_searchable?: boolean;
  is_premium?: boolean;
}  
