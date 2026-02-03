import type { AppearanceMode, HousingSituation } from '../types/profile';

export const getAppearanceMode = (
  housingSituation?: HousingSituation | null,
  isSeeking?: boolean | null
): AppearanceMode => {
  if (housingSituation === 'offering') {
    return isSeeking ? 'both' : 'owner-only';
  }
  return 'seeker-only';
};

export const mapAppearanceModeToProfile = (
  appearanceMode: AppearanceMode,
  isOwner: boolean
): { housing_situation: HousingSituation; is_seeking: boolean } => {
  if (!isOwner) {
    return { housing_situation: 'seeking', is_seeking: true };
  }

  switch (appearanceMode) {
    case 'owner-only':
      return { housing_situation: 'offering', is_seeking: false };
    case 'both':
      return { housing_situation: 'offering', is_seeking: true };
    case 'seeker-only':
    default:
      return { housing_situation: 'seeking', is_seeking: false };
  }
};
