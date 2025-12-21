import type { GenderFilter } from './gender';

export type HousingFilter = 'any' | 'seeking' | 'offering';

export interface SwipeFilters {
  housingSituation: HousingFilter;
  gender: GenderFilter;
  budgetMin: number;
  budgetMax: number;
  zones: string[];
  roommates: number | null;
  lifestyle: string[];
  interests: string[];
}
