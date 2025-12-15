// src/types/profile.ts

export interface LifestylePreferences {
  schedule?: string | null;   // Ej: horario / rutina
  cleaning?: string | null;   // Ej: nivel de orden/limpieza
  guests?: string | null;     // Ej: comodidad con invitados
}

export type HousingSituation = 'seeking' | 'offering';

export interface Profile {
  id: string;
  user_id: string;

  display_name: string | null;
  bio: string | null;
  occupation: string | null;
  university: string | null;
  field_of_study: string | null;

  interests: string[];                      // ['deportes', 'cine', ...]
  lifestyle_preferences: LifestylePreferences | null;
  housing_situation: HousingSituation | null;
  preferred_zones: string[];               // ['triana', 'nervion', ...]

  budget_min: number | null;
  budget_max: number | null;
  num_roommates_wanted: number | null;

  avatar_url: string | null;

  created_at: string;
  updated_at: string;
}

export interface ProfileCreateRequest {
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
  num_roommates_wanted?: number;

  avatar_url?: string;
}
