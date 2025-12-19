export type HousingFilter = 'any' | 'seeking' | 'offering';

export interface SwipeFilters {
  housingSituation: HousingFilter;
  budgetMin: number;
  budgetMax: number;
  zones: string[];
  roommates: number | null;
  lifestyle: string[];
  interests: string[];
}
