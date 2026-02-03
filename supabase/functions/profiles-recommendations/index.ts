// supabase/functions/profiles-recommendations/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { withAuth, getUserId } from '../_shared/auth.ts';
import type {
  Profile,
  RecommendationResponse,
  RoomRecommendation,
  JWTPayload,
} from '../_shared/types.ts';

/**
 * Edge Function para generar recomendaciones de perfiles en HomiMatch.
 * Devuelve todos los perfiles (menos el propio) para el swipe.
 */

const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

type RecommendationFilters = {
  housingSituation?: 'any' | 'seeking' | 'offering';
  budgetMin?: number;
  budgetMax?: number;
  roommatesMin?: number;
  roommatesMax?: number;
  zones?: string[];
  lifestyle?: string[];
  interests?: string[];
  rules?: Record<string, string | null>;
};

type LocationDisplayLevel = 'zone-city' | 'city-province' | 'province';

type ZoneLocationInfo = {
  zone_id: string;
  zone_name?: string | null;
  city_id?: string | null;
  city_name?: string | null;
  province_code?: string | null;
  province_name?: string | null;
};

type LocationDisplayInfo = {
  level: LocationDisplayLevel;
  zone_id?: string | null;
  zone_name?: string | null;
  city_id?: string | null;
  city_name?: string | null;
  province_code?: string | null;
  province_name?: string | null;
};

const RecommendationFiltersSchema = z
  .object({
    housingSituation: z.enum(['any', 'seeking', 'offering']).optional(),
    budgetMin: z.number().min(0).max(10000).optional(),
    budgetMax: z.number().min(0).max(10000).optional(),
    roommatesMin: z.number().min(1).max(20).optional(),
    roommatesMax: z.number().min(1).max(20).optional(),
    zones: z.array(z.string()).max(10).optional(),
    lifestyle: z.array(z.string()).max(10).optional(),
    interests: z.array(z.string()).max(20).optional(),
    rules: z.record(z.string().nullable()).optional(),
  })
  .refine(
    (data) => {
      if (
        typeof data.budgetMin === 'number' &&
        typeof data.budgetMax === 'number' &&
        data.budgetMin > data.budgetMax
      ) {
        return false;
      }
      if (
        typeof data.roommatesMin === 'number' &&
        typeof data.roommatesMax === 'number' &&
        data.roommatesMin > data.roommatesMax
      ) {
        return false;
      }
      return true;
    },
    { message: 'Los valores minimos no pueden ser mayores que los maximos' }
  )
  .optional();

type FlatGenderPolicy = 'mixed' | 'men_only' | 'flinta';

type RoomWithFlat = {
  id: string;
  owner_id: string;
  price_per_month: number;
  is_available?: boolean | null;
  flat?: {
    gender_policy?: FlatGenderPolicy | null;
    district?: string | null;
    city?: string | null;
    place_id?: string | null;
    city_id?: string | null;
    rules?: string | null;
    capacity_total?: number | null;
  } | null;
};

type AppearanceMode = 'owner-only' | 'seeker-only' | 'both';

const lifestyleLabelById = new Map<string, string>([
  ['schedule_flexible', 'Flexible'],
  ['cleaning_muy_limpio', 'Muy limpio'],
  ['guests_algunos', 'Algunos invitados'],
]);

const RULE_OPTIONS = [
  { id: 'ruido', label: 'Ruido' },
  { id: 'visitas', label: 'Visitas' },
  { id: 'limpieza', label: 'Limpieza' },
  { id: 'fumar', label: 'Fumar' },
  { id: 'mascotas', label: 'Mascotas' },
  { id: 'cocina', label: 'Dejar la cocina limpia tras usarla' },
  { id: 'banos', label: 'Mantener banos en orden' },
  { id: 'basura', label: 'Sacar la basura segun el turno' },
  { id: 'seguridad', label: 'Cerrar siempre la puerta con llave' },
  { id: 'otros', label: 'Otros' },
];

const SUB_RULE_OPTIONS: Record<string, { id: string; label: string }[]> = {
  ruido: [
    { id: 'ruido_22_08', label: 'Silencio 22:00 - 08:00' },
    { id: 'ruido_23_08', label: 'Silencio 23:00 - 08:00' },
    { id: 'ruido_flexible', label: 'Horario flexible' },
    { id: 'ruido_otros', label: 'Otros' },
  ],
  visitas: [
    { id: 'visitas_si', label: 'Si, con aviso' },
    { id: 'visitas_no', label: 'No permitidas' },
    { id: 'visitas_sin_dormir', label: 'Si, pero sin dormir' },
    { id: 'visitas_libre', label: 'Sin problema' },
    { id: 'visitas_otros', label: 'Otros' },
  ],
  limpieza: [
    { id: 'limpieza_semanal', label: 'Turnos semanales' },
    { id: 'limpieza_quincenal', label: 'Turnos quincenales' },
    { id: 'limpieza_por_uso', label: 'Limpieza por uso' },
    { id: 'limpieza_profesional', label: 'Servicio de limpieza' },
    { id: 'limpieza_otros', label: 'Otros' },
  ],
  fumar: [
    { id: 'fumar_no', label: 'No fumar' },
    { id: 'fumar_terraza', label: 'Solo en terraza/balcon' },
    { id: 'fumar_si', label: 'Permitido en zonas comunes' },
    { id: 'fumar_otros', label: 'Otros' },
  ],
  mascotas: [
    { id: 'mascotas_no', label: 'No se permiten' },
    { id: 'mascotas_gatos', label: 'Solo gatos' },
    { id: 'mascotas_perros', label: 'Solo perros' },
    { id: 'mascotas_acuerdo', label: 'Permitidas bajo acuerdo' },
    { id: 'mascotas_otros', label: 'Otros' },
  ],
};

function matchesFilters(
  profile: Profile,
  filters?: RecommendationFilters,
  options?: { skipBudgetForOffering?: boolean }
): boolean {
  if (!filters) return true;

  if (
    filters.housingSituation &&
    filters.housingSituation !== 'any' &&
    profile.housing_situation !== filters.housingSituation &&
    !(
      filters.housingSituation === 'seeking' &&
      profile.housing_situation === 'offering' &&
      profile.is_seeking === true
    )
  ) {
    return false;
  }

  if (filters.zones && filters.zones.length > 0) {
    const profileZones = profile.preferred_zones ?? [];
    const matchesZone = profileZones.some((zone) => filters.zones?.includes(zone));
    if (!matchesZone) {
      // Soft filter: do not exclude, just lower relevance later.
    }
  }

  if (filters.interests && filters.interests.length > 0) {
    const profileInterests = profile.interests ?? [];
    const matchesInterest = profileInterests.some((interest) =>
      filters.interests?.includes(interest)
    );
    if (!matchesInterest) {
      // Soft filter: do not exclude, just lower relevance later.
    }
  }

  if (filters.lifestyle && filters.lifestyle.length > 0) {
    if (profile.housing_situation !== 'offering') {
      const profileLifestyle = profile.lifestyle_preferences
        ? Object.values(profile.lifestyle_preferences).filter(
            (item): item is string => Boolean(item)
          )
        : [];
      if (profileLifestyle.length > 0) {
        const lifestyleLabels = filters.lifestyle
          .map((id) => lifestyleLabelById.get(id) ?? id)
          .filter(Boolean);
        const matchesLifestyle = profileLifestyle.some((chip) =>
          lifestyleLabels.includes(chip)
        );
        if (!matchesLifestyle) {
          // Soft filter: do not exclude, just lower relevance later.
        }
      }
    }
  }

  const hasBudgetFilter =
    typeof filters.budgetMin === 'number' || typeof filters.budgetMax === 'number';
  if (
    hasBudgetFilter &&
    !(options?.skipBudgetForOffering && filters.housingSituation === 'offering')
  ) {
    const profileMin = profile.budget_min ?? null;
    const profileMax = profile.budget_max ?? null;
    if (profileMin == null && profileMax == null) return false;
    const min = typeof filters.budgetMin === 'number' ? filters.budgetMin : -Infinity;
    const max = typeof filters.budgetMax === 'number' ? filters.budgetMax : Infinity;
    const effectiveMin = profileMin ?? min;
    const effectiveMax = profileMax ?? max;
    if (effectiveMax < min || effectiveMin > max) return false;
  }

  const hasRoommatesFilter =
    typeof filters.roommatesMin === 'number' ||
    typeof filters.roommatesMax === 'number';
  if (hasRoommatesFilter) {
    const profileMin = profile.desired_roommates_min ?? null;
    const profileMax = profile.desired_roommates_max ?? null;
    if (profileMin == null && profileMax == null) return false;
    const min =
      typeof filters.roommatesMin === 'number' ? filters.roommatesMin : -Infinity;
    const max =
      typeof filters.roommatesMax === 'number' ? filters.roommatesMax : Infinity;
    const effectiveMin = profileMin ?? min;
    const effectiveMax = profileMax ?? max;
    if (effectiveMax < min || effectiveMin > max) return false;
  }

  return true;
}

const ruleLabelById = new Map(RULE_OPTIONS.map((rule) => [rule.id, rule.label]));

const subOptionLabelMap = new Map<string, { ruleId: string; optionId: string }>();
Object.entries(SUB_RULE_OPTIONS).forEach(([ruleId, options]) => {
  options.forEach((option) => {
    subOptionLabelMap.set(option.label.toLowerCase(), {
      ruleId,
      optionId: option.id,
    });
  });
});

const addRuleSelection = (
  map: Record<string, Set<string>>,
  ruleId: string,
  optionId: string
) => {
  if (!map[ruleId]) {
    map[ruleId] = new Set();
  }
  map[ruleId].add(optionId);
};

function parseFlatRules(rulesText?: string | null): Record<string, Set<string>> {
  const selections: Record<string, Set<string>> = {};
  if (!rulesText) return selections;

  const pieces = rulesText
    .split(/\n|;/)
    .map((item) => item.trim())
    .filter(Boolean);

  pieces.forEach((rule) => {
    const lower = rule.toLowerCase();
    const matchSub = subOptionLabelMap.get(lower);
    if (matchSub) {
      addRuleSelection(selections, matchSub.ruleId, matchSub.optionId);
      return;
    }

    const prefixed = Array.from(ruleLabelById.entries()).find(([id, label]) => {
      if (!SUB_RULE_OPTIONS[id]) return false;
      return lower.startsWith(`${label.toLowerCase()}:`);
    });
    if (prefixed) {
      const [ruleId, label] = prefixed;
      addRuleSelection(selections, ruleId, `${ruleId}_otros`);
      return;
    }

    const match = RULE_OPTIONS.find(
      (option) => option.label.toLowerCase() === lower
    );
    if (match) {
      addRuleSelection(selections, match.id, match.id);
      return;
    }

    addRuleSelection(selections, 'otros', 'otros');
  });

  return selections;
}

function matchesRulePreferences(
  rulePreferences: Record<string, string | null>,
  flatRules: Record<string, Set<string>>
): boolean {
  const entries = Object.entries(rulePreferences);
  if (entries.length === 0) return true;

  for (const [ruleId, preference] of entries) {
    if (!preference || preference === 'flexible') continue;
    const flatOptions = flatRules[ruleId];
    if (!flatOptions || flatOptions.size === 0) {
      return false;
    }
    const hasOther = Array.from(flatOptions).some(
      (option) => option === 'otros' || option.endsWith('_otros')
    );
    if (hasOther) continue;
    if (!flatOptions.has(preference)) return false;
  }

  return true;
}

function matchesGenderPolicy(
  profileGender: string | undefined,
  policy?: FlatGenderPolicy | null
): boolean {
  if (!policy || policy === 'mixed') return true;
  if (policy === 'men_only') return profileGender === 'male';
  if (policy === 'flinta') return Boolean(profileGender && profileGender !== 'male');
  return true;
}

function matchesRoomForProfile(profile: Profile, room: RoomWithFlat): boolean {
  const roomPrice = room.price_per_month;
  const min = profile.budget_min ?? null;
  const max = profile.budget_max ?? null;
  if (min == null && max == null) return false;
  if (min != null && roomPrice < min) return false;
  if (max != null && roomPrice > max) return false;

  if (!matchesGenderPolicy(profile.gender, room.flat?.gender_policy ?? null)) {
    return false;
  }

  const zones = profile.preferred_zones ?? [];
  if (zones.length > 0) {
    const placeId = room.flat?.place_id ?? null;
    if (placeId && !zones.includes(placeId)) {
      // Soft filter: keep profile, but it will be ranked lower elsewhere.
    }
  }

  return true;
}

function matchesOfferingConstraints(
  profile: Profile,
  availableRooms: RoomWithFlat[]
): boolean {
  if (profile.housing_situation !== 'seeking') return false;
  return availableRooms.some((room) => matchesRoomForProfile(profile, room));
}

function extractAvatarPath(avatarUrl: string): string | null {
  if (!avatarUrl) return null;
  if (!avatarUrl.startsWith('http')) return avatarUrl;

  try {
    const url = new URL(avatarUrl);
    const pathname = url.pathname;
    const prefixes = [
      '/storage/v1/object/sign/avatars/',
      '/storage/v1/object/public/avatars/',
      '/storage/v1/object/avatars/',
    ];

    for (const prefix of prefixes) {
      const index = pathname.indexOf(prefix);
      if (index !== -1) {
        return pathname.substring(index + prefix.length);
      }
    }
  } catch (error) {
    console.error('[profiles-recommendations] Failed to parse avatar_url:', error);
  }

  return null;
}

async function getSignedAvatarUrl(avatarUrl: string): Promise<string | null> {
  const path = extractAvatarPath(avatarUrl);
  if (!path) return null;

  const { data, error } = await supabaseClient.storage
    .from('avatars')
    .createSignedUrl(path, 60 * 60);

  if (error || !data?.signedUrl) {
    console.error('[profiles-recommendations] Signed URL error:', error);
    return null;
  }

  return data.signedUrl;
}

async function extractProvinceCodesFromZones(zoneIds: string[]): Promise<string[]> {
  if (zoneIds.length === 0) return [];

  const { data: places, error } = await supabaseClient
    .from('city_places')
    .select('city_id')
    .in('id', zoneIds);

  if (error) {
    console.error(
      '[profiles-recommendations] Failed to load city_places for provinces:',
      error
    );
    return [];
  }

  if (!places || places.length === 0) return [];

  return [
    ...new Set(
      places
        .map((place) => place.city_id?.substring(0, 2))
        .filter(Boolean)
    ),
  ];
}

async function buildZoneProvinceIndex(
  zoneIds: string[],
  zoneLocationIndex?: Map<string, ZoneLocationInfo>
): Promise<Map<string, string>> {
  if (zoneLocationIndex) {
    const index = new Map<string, string>();
    zoneLocationIndex.forEach((location, zoneId) => {
      if (location.province_code) {
        index.set(zoneId, location.province_code);
      }
    });
    return index;
  }

  if (zoneIds.length === 0) return new Map();

  const { data: places, error } = await supabaseClient
    .from('city_places')
    .select('id, city_id')
    .in('id', zoneIds);

  if (error) {
    console.error(
      '[profiles-recommendations] Failed to load city_places index:',
      error
    );
    return new Map();
  }

  const index = new Map<string, string>();
  (places ?? []).forEach((place) => {
    if (place.city_id) {
      index.set(place.id, place.city_id.substring(0, 2));
    }
  });

  return index;
}

async function buildZoneLocationIndex(
  zoneIds: string[]
): Promise<Map<string, ZoneLocationInfo>> {
  if (zoneIds.length === 0) return new Map();

  const { data: places, error } = await supabaseClient
    .from('city_places')
    .select('id, name, city_id')
    .in('id', zoneIds);

  if (error) {
    console.error(
      '[profiles-recommendations] Failed to load city_places for locations:',
      error
    );
    return new Map();
  }

  const locationIndex = new Map<string, ZoneLocationInfo>();
  const cityIds = new Set<string>();
  (places ?? []).forEach((place) => {
    if (!place.id) return;
    const cityId = place.city_id ?? null;
    const provinceCode = cityId ? cityId.substring(0, 2) : null;
    locationIndex.set(place.id, {
      zone_id: place.id,
      zone_name: place.name ?? null,
      city_id: cityId,
      city_name: null,
      province_code: provinceCode,
      province_name: null,
    });
    if (cityId) {
      cityIds.add(cityId);
    }
  });

  const provinceCodes = new Set<string>();
  locationIndex.forEach((location) => {
    if (location.province_code) {
      provinceCodes.add(location.province_code);
    }
  });

  if (cityIds.size === 0) return locationIndex;

  const { data: cities, error: citiesError } = await supabaseClient
    .from('cities')
    .select('id, name')
    .in('id', Array.from(cityIds));

  if (citiesError) {
    console.warn(
      '[profiles-recommendations] Failed to load cities for locations:',
      citiesError
    );
    return locationIndex;
  }

  const cityNameById = new Map<string, string>();
  (cities ?? []).forEach((row) => {
    const city = row as { id?: string | null; name?: string | null };
    if (city.id && city.name) {
      cityNameById.set(city.id, city.name);
    }
  });

  locationIndex.forEach((location, zoneId) => {
    if (location.city_id) {
      const cityName = cityNameById.get(location.city_id) ?? null;
      locationIndex.set(zoneId, {
        ...location,
        city_name: cityName,
      });
    }
  });

  if (provinceCodes.size > 0) {
    const { data: provinces, error: provincesError } = await supabaseClient
      .from('provinces')
      .select('code, name')
      .in('code', Array.from(provinceCodes));

    if (provincesError) {
      console.warn(
        '[profiles-recommendations] Failed to load provinces for locations:',
        provincesError
      );
    } else {
      const provinceNameByCode = new Map<string, string>();
      (provinces ?? []).forEach((row) => {
        const province = row as { code?: string | null; name?: string | null };
        if (province.code && province.name) {
          provinceNameByCode.set(province.code, province.name);
        }
      });

      locationIndex.forEach((location, zoneId) => {
        if (!location.province_code) return;
        const provinceName =
          provinceNameByCode.get(location.province_code) ?? null;
        locationIndex.set(zoneId, {
          ...location,
          province_name: provinceName,
        });
      });
    }
  }

  return locationIndex;
}

function getCityFromZone(
  zoneId: string,
  zoneLocationIndex: Map<string, ZoneLocationInfo>
): string | null {
  if (!zoneId) return null;
  return zoneLocationIndex.get(zoneId)?.city_id ?? null;
}

function resolveLocationDisplay(
  seekerZoneIds: string[],
  targetZoneIds: string[],
  zoneLocationIndex: Map<string, ZoneLocationInfo>
): LocationDisplayInfo | null {
  if (targetZoneIds.length === 0) return null;

  const seekerCityIds = new Set<string>();
  const seekerProvinceCodes = new Set<string>();
  seekerZoneIds.forEach((zoneId) => {
    const location = zoneLocationIndex.get(zoneId);
    if (!location) return;
    const cityId = getCityFromZone(zoneId, zoneLocationIndex);
    if (cityId) seekerCityIds.add(cityId);
    if (location.province_code) seekerProvinceCodes.add(location.province_code);
  });

  const targetCityIds = new Set<string>();
  const targetProvinceCodes = new Set<string>();
  targetZoneIds.forEach((zoneId) => {
    const location = zoneLocationIndex.get(zoneId);
    if (!location) return;
    const cityId = getCityFromZone(zoneId, zoneLocationIndex);
    if (cityId) targetCityIds.add(cityId);
    if (location.province_code) targetProvinceCodes.add(location.province_code);
  });

  const findZoneForCity = (cityId: string) =>
    targetZoneIds.find((zoneId) => zoneLocationIndex.get(zoneId)?.city_id === cityId) ??
    null;

  const findZoneForProvince = (provinceCode: string) =>
    targetZoneIds.find(
      (zoneId) => zoneLocationIndex.get(zoneId)?.province_code === provinceCode
    ) ?? null;

  const sharedCityId = Array.from(targetCityIds).find((cityId) =>
    seekerCityIds.has(cityId)
  );
  if (sharedCityId) {
    const zoneId = findZoneForCity(sharedCityId);
    const location = zoneId ? zoneLocationIndex.get(zoneId) ?? null : null;
    return {
      level: 'zone-city',
      zone_id: zoneId,
      zone_name: location?.zone_name ?? null,
      city_id: sharedCityId,
      city_name: location?.city_name ?? null,
      province_code: location?.province_code ?? null,
      province_name: location?.province_name ?? null,
    };
  }

  const sharedProvinceCode = Array.from(targetProvinceCodes).find((province) =>
    seekerProvinceCodes.has(province)
  );
  if (sharedProvinceCode) {
    const zoneId = findZoneForProvince(sharedProvinceCode);
    const location = zoneId ? zoneLocationIndex.get(zoneId) ?? null : null;
    return {
      level: 'city-province',
      zone_id: zoneId,
      zone_name: location?.zone_name ?? null,
      city_id: location?.city_id ?? null,
      city_name: location?.city_name ?? null,
      province_code: sharedProvinceCode,
      province_name: location?.province_name ?? null,
    };
  }

  const fallbackZoneId = targetZoneIds.find((zoneId) =>
    Boolean(zoneLocationIndex.get(zoneId)?.province_code)
  );
  if (!fallbackZoneId) return null;
  const fallbackLocation = zoneLocationIndex.get(fallbackZoneId) ?? null;
  if (!fallbackLocation?.province_code) return null;
  return {
    level: 'province',
    zone_id: fallbackZoneId,
    zone_name: fallbackLocation.zone_name ?? null,
    city_id: fallbackLocation.city_id ?? null,
    city_name: fallbackLocation.city_name ?? null,
    province_code: fallbackLocation.province_code ?? null,
    province_name: fallbackLocation.province_name ?? null,
  };
}

function calculateProfileCompatibilityScore(
  seekerProfile: Profile,
  targetProfile: Profile,
  filters?: RecommendationFilters,
  options?: {
    seekerProvinces?: string[];
    targetProvinces?: string[];
    ownerFlatProvinces?: string[];
    flow?: 'seeking' | 'offering';
  }
): number {
  const weights = {
    lifestyle: 0.4,
    budget: 0.3,
    location: 0.2,
    demographics: 0.1,
  };

  let score = 0;

  if (
    seekerProfile.smoker !== undefined &&
    targetProfile.smoker !== undefined
  ) {
    score +=
      seekerProfile.smoker === targetProfile.smoker
        ? weights.lifestyle * 0.5
        : 0;
  }

  if (
    seekerProfile.has_pets !== undefined &&
    targetProfile.has_pets !== undefined
  ) {
    score +=
      seekerProfile.has_pets === targetProfile.has_pets
        ? weights.lifestyle * 0.3
        : 0;
  }

  if (filters?.budgetMin && filters?.budgetMax) {
    const targetBudget =
      targetProfile.budget_min != null && targetProfile.budget_max != null
        ? (targetProfile.budget_min + targetProfile.budget_max) / 2
        : 0;
    const seekerBudget = (filters.budgetMin + filters.budgetMax) / 2;
    const budgetDiff = Math.abs(targetBudget - seekerBudget);
    score += budgetDiff < 100 ? weights.budget : weights.budget * 0.3;
  }

  if (filters?.zones && targetProfile.preferred_zones) {
    const sharedZones = filters.zones.filter((zone) =>
      targetProfile.preferred_zones?.includes(zone)
    );
    score += sharedZones.length > 0 ? weights.location : 0;
  }

  const flow =
    options?.flow ??
    (seekerProfile.housing_situation === 'offering' ? 'offering' : 'seeking');
  const seekerProvinces = options?.seekerProvinces ?? [];
  const targetProvinces = options?.targetProvinces ?? [];
  const ownerFlatProvinces = options?.ownerFlatProvinces ?? [];
  let provinceBoost = 0;

  if (flow === 'seeking') {
    const hasSharedProvince =
      seekerProvinces.length > 0 &&
      targetProvinces.length > 0 &&
      seekerProvinces.some((province) => targetProvinces.includes(province));
    if (hasSharedProvince) {
      provinceBoost = 0.2;
    }
  } else {
    const targetInterestedInOwnerProvince =
      ownerFlatProvinces.length > 0 &&
      targetProvinces.length > 0 &&
      targetProvinces.some((province) => ownerFlatProvinces.includes(province));
    if (targetInterestedInOwnerProvince) {
      provinceBoost = 0.2;
    }
  }

  score += provinceBoost;

  if (seekerProfile.gender && targetProfile.gender) {
    score +=
      seekerProfile.gender === targetProfile.gender
        ? weights.demographics * 0.5
        : weights.demographics * 0.2;
  }

  // Apply premium boost if applicable
  const PREMIUM_BOOST_MULTIPLIER = 1.4;
  const MINIMUM_SCORE_FOR_BOOST = 0.3;

  const baseScore = Math.min(1, Math.max(0, score));

  if (targetProfile.is_premium === true && baseScore >= MINIMUM_SCORE_FOR_BOOST) {
    const boostedScore = baseScore * PREMIUM_BOOST_MULTIPLIER;
    const finalScore = Math.min(1, boostedScore);

    console.log(
      `[profiles-recommendations] Premium boost applied for profile ${targetProfile.id}: base=${baseScore.toFixed(3)} -> boosted=${finalScore.toFixed(3)}`
    );

    return finalScore;
  }

  return baseScore;
}

const getAppearanceMode = (profile: Profile): AppearanceMode => {
  if (profile.housing_situation === 'offering') {
    return profile.is_seeking ? 'both' : 'owner-only';
  }
  return 'seeker-only';
};

async function getFilteredProfiles(
  userId: string,
  filters: RecommendationFilters | undefined,
  seekerProfile: Profile
): Promise<Profile[]> {
  let query = supabaseClient
    .from('profiles')
    .select('*, users!profiles_id_fkey(birth_date, first_name, last_name)')
    .neq('id', userId)
    .eq('is_searchable', true);

  if (filters?.housingSituation && filters.housingSituation !== 'any') {
    if (filters.housingSituation === 'seeking') {
      query = query.or(`housing_situation.eq.seeking,and(is_seeking.eq.true)`);
    } else {
      query = query.eq('housing_situation', filters.housingSituation);
    }
  }

  if (
    typeof filters?.budgetMin === 'number' ||
    typeof filters?.budgetMax === 'number'
  ) {
    if (typeof filters?.budgetMin === 'number') {
      query = query.gte('budget_max', filters.budgetMin);
    }
    if (typeof filters?.budgetMax === 'number') {
      query = query.lte('budget_min', filters.budgetMax);
    }
  }

  query = query.limit(1000);

  const { data, error } = await query;
  if (error) throw error;

  const normalizedProfiles = (data ?? []).map((row) => {
    const { users, ...profileData } = row as Profile & {
      users?: {
        birth_date?: string | null;
        first_name?: string | null;
        last_name?: string | null;
      };
    };
    return {
      ...profileData,
      birth_date: users?.birth_date ?? profileData.birth_date ?? null,
      first_name: users?.first_name ?? profileData.first_name ?? null,
      last_name: users?.last_name ?? profileData.last_name ?? null,
    } as Profile;
  });

  return normalizedProfiles.filter((profile) =>
    matchesFilters(profile, filters, { skipBudgetForOffering: true })
  );
}

function generateProfileMatchReasons(
  seekerProfile: Profile,
  targetProfile: Profile,
  filters?: RecommendationFilters
): string[] {
  const reasons: string[] = [];

  if (
    seekerProfile.gender &&
    targetProfile.gender &&
    seekerProfile.gender === targetProfile.gender
  ) {
    reasons.push(`Mismo genero: ${targetProfile.gender}`);
  }

  if (
    seekerProfile.occupation &&
    targetProfile.occupation &&
    seekerProfile.occupation === targetProfile.occupation
  ) {
    reasons.push(`Misma ocupacion: ${targetProfile.occupation}`);
  }

  if (seekerProfile.smoker !== undefined && targetProfile.smoker !== undefined) {
    if (seekerProfile.smoker === targetProfile.smoker) {
      reasons.push(seekerProfile.smoker ? 'Ambos son fumadores' : 'Ninguno fuma');
    } else {
      reasons.push('Diferentes habitos de fumar');
    }
  }

  if (
    seekerProfile.has_pets !== undefined &&
    targetProfile.has_pets !== undefined
  ) {
    if (seekerProfile.has_pets === targetProfile.has_pets) {
      reasons.push(
        seekerProfile.has_pets ? 'Ambos tienen mascotas' : 'Ninguno tiene mascotas'
      );
    }
  }

  if (filters?.zones && filters.zones.length > 0) {
    const targetZones = targetProfile.preferred_zones ?? [];
    const matchesZone = targetZones.some((zone) => filters.zones?.includes(zone));
    if (matchesZone) {
      reasons.push('Zona en comun');
    }
  }

  return reasons;
}

const handler = withAuth(
  async (req: Request, payload: JWTPayload): Promise<Response> => {
    const userId = getUserId(payload);

    try {
      if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: seekerProfile, error: seekerError } = await supabaseClient
        .from('profiles')
        .select('*, users!profiles_id_fkey(first_name, last_name)')
        .eq('id', userId)
        .single();

      if (seekerError || !seekerProfile) {
        return new Response(JSON.stringify({ error: 'Profile not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const body = await req.json().catch(() => ({}));
      const validationResult = RecommendationFiltersSchema.safeParse(body?.filters);
      if (!validationResult.success) {
        return new Response(
          JSON.stringify({
            error: 'Invalid filters',
            details: validationResult.error.errors,
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      const rawFilters = validationResult.data as RecommendationFilters | undefined;
      const appearanceMode = getAppearanceMode(seekerProfile);
      console.log('[profiles-recommendations] appearanceMode:', appearanceMode);
      const filters =
        rawFilters &&
        appearanceMode === 'owner-only' &&
        rawFilters.housingSituation === 'offering'
          ? { ...rawFilters, housingSituation: 'seeking' }
          : rawFilters;
      if (rawFilters?.housingSituation !== filters?.housingSituation) {
        console.log(
          '[profiles-recommendations] Overriding housingSituation filter for owner-only:',
          rawFilters?.housingSituation,
          '->',
          filters?.housingSituation
        );
      }

      // Check province blocking status
      const preferredZones = seekerProfile.preferred_zones ?? [];
      let blockedProvinces: string[] = [];
      let activeProvinceCodes: string[] = [];
      let seekerProvinces: string[] = [];

      if (preferredZones.length > 0) {
        seekerProvinces = await extractProvinceCodesFromZones(preferredZones);
        if (seekerProvinces.length > 0) {
          console.log(
            '[profiles-recommendations] Province codes extracted:',
            seekerProvinces
          );

          // Check which provinces are active
          const { data: provinceData, error: provinceError } = await supabaseClient
            .from('province_user_counts')
            .select('province_code, is_active, count')
            .in('province_code', seekerProvinces);

          if (!provinceError && provinceData) {
            const activeProvinces = provinceData.filter((p) => p.is_active);
            const inactiveProvinces = provinceData.filter((p) => !p.is_active);
            console.log(
              '[profiles-recommendations] Active provinces count:',
              activeProvinces.length
            );
            console.log(
              '[profiles-recommendations] all_provinces_blocked:',
              activeProvinces.length === 0
            );

            activeProvinceCodes = activeProvinces.map((p) => p.province_code);
            blockedProvinces = inactiveProvinces.map((p) => p.province_code);

            // If NO provinces are active, return blocked status
            if (activeProvinces.length === 0) {
              return new Response(
                JSON.stringify({
                  recommendations: [],
                  all_provinces_blocked: true,
                  blocked_provinces: blockedProvinces,
                }),
                {
                  status: 200,
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                }
              );
            }
          }
        }
      }

      if (seekerProfile.is_searchable === false) {
        return new Response(
          JSON.stringify({ recommendations: [] }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const recommendations: RoomRecommendation[] = [];

      let filteredProfiles = await getFilteredProfiles(
        userId,
        filters,
        seekerProfile
      );
      console.log(
        '[profiles-recommendations] Profiles after base query:',
        filteredProfiles.length
      );
      const { data: acceptedMatches, error: matchesError } = await supabaseClient
        .from('matches')
        .select('user_a_id, user_b_id, status')
        .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`);
      if (matchesError) {
        console.error(
          '[profiles-recommendations] Error loading matches:',
          matchesError
        );
      } else if (acceptedMatches && acceptedMatches.length > 0) {
        const acceptedIds = new Set<string>();
        acceptedMatches.forEach((match) => {
          const isOutgoingPending =
            match.status === 'pending' && match.user_a_id === userId;
          const isExcludedStatus =
            match.status === 'accepted' ||
            match.status === 'rejected' ||
            match.status === 'unmatched' ||
            match.status === 'room_offer' ||
            match.status === 'room_assigned' ||
            match.status === 'room_declined';
          if (!isExcludedStatus && !isOutgoingPending) return;
          if (match.user_a_id) acceptedIds.add(match.user_a_id);
          if (match.user_b_id) acceptedIds.add(match.user_b_id);
        });
        acceptedIds.delete(userId);
        filteredProfiles = filteredProfiles.filter(
          (profile) => !acceptedIds.has(profile.id)
        );
      }
      console.log(
        '[profiles-recommendations] Profiles after matches filter:',
        filteredProfiles.length
      );
      const { data: rejections, error: rejectionsError } = await supabaseClient
        .from('swipe_rejections')
        .select('rejected_profile_id')
        .eq('user_id', userId);
      if (rejectionsError) {
        console.error(
          '[profiles-recommendations] Error loading swipe rejections:',
          rejectionsError
        );
      } else if (rejections && rejections.length > 0) {
        const rejectedIds = new Set(
          rejections.map((item) => item.rejected_profile_id)
        );
        filteredProfiles = filteredProfiles.filter(
          (profile) => !rejectedIds.has(profile.id)
        );
      }
      console.log(
        '[profiles-recommendations] Profiles after rejections filter:',
        filteredProfiles.length
      );
      const baseFilteredProfiles = filteredProfiles;

      let shouldUseOfferingFlow =
        appearanceMode === 'owner-only' ||
        (appearanceMode === 'both' && filters?.housingSituation !== 'seeking');
      console.log(
        '[profiles-recommendations] shouldUseOfferingFlow (initial):',
        shouldUseOfferingFlow
      );
      let ownerFlatProvinces: string[] = [];

      if (shouldUseOfferingFlow) {
        filteredProfiles = await getFilteredProfiles(userId, filters, seekerProfile);
        console.log(
          '[profiles-recommendations] Profiles after offering base query:',
          filteredProfiles.length
        );
        const { data: rooms, error: roomsError } = await supabaseClient
          .from('rooms')
          .select(
            `
            id,
            owner_id,
            price_per_month,
            is_available,
            flat:flats(gender_policy, district, city, rules, place_id, city_id)
          `
          )
          .eq('owner_id', userId)
          .eq('is_available', true);

        if (roomsError) {
          console.error(
            '[profiles-recommendations] Error loading rooms:',
            roomsError
          );
          return new Response(
            JSON.stringify({ error: 'Failed to load rooms' }),
            {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        const availableRooms = (rooms ?? []) as RoomWithFlat[];
        console.log(
          '[profiles-recommendations] Available rooms for owner:',
          availableRooms.length
        );
        if (availableRooms.length === 0) {
          if (appearanceMode === 'both') {
            shouldUseOfferingFlow = false;
          } else {
            return new Response(
              JSON.stringify({ recommendations: [] }),
              {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              }
            );
          }
        } else {
          ownerFlatProvinces = [
            ...new Set(
              availableRooms
                .map((room) => room.flat?.city_id?.substring(0, 2))
                .filter(Boolean)
            ),
          ];

          filteredProfiles = filteredProfiles.filter((profile) =>
            matchesOfferingConstraints(profile, availableRooms)
          );
          console.log(
            '[profiles-recommendations] Profiles after offering constraints:',
            filteredProfiles.length
          );
          if (appearanceMode === 'both' && filteredProfiles.length === 0) {
            shouldUseOfferingFlow = false;
            filteredProfiles = baseFilteredProfiles;
            console.log(
              '[profiles-recommendations] Falling back to seeking flow after empty offering results'
            );
          }
        }
      }

      if (!shouldUseOfferingFlow) {
        console.log(
          '[profiles-recommendations] Falling back to seeking flow'
        );
        const hasBudgetFilter =
          typeof filters?.budgetMin === 'number' ||
          typeof filters?.budgetMax === 'number';
        const hasRoommatesFilter =
          typeof filters?.roommatesMin === 'number' ||
          typeof filters?.roommatesMax === 'number';
        const rulePreferences = filters?.rules ?? {};
        const hasRuleFilters = Object.values(rulePreferences).some(
          (value) => value && value !== 'flexible'
        );

        if (
          (filters?.housingSituation === 'offering' ||
            filters?.housingSituation === 'any') &&
          (hasBudgetFilter || hasRuleFilters || hasRoommatesFilter)
        ) {
          const min =
            typeof filters.budgetMin === 'number' ? filters.budgetMin : 0;
          const max =
            typeof filters.budgetMax === 'number' ? filters.budgetMax : 1000000;
          const roommatesMin =
            typeof filters.roommatesMin === 'number'
              ? filters.roommatesMin
              : 0;
          const roommatesMax =
            typeof filters.roommatesMax === 'number'
              ? filters.roommatesMax
              : 1000000;
          const ownerIds = filteredProfiles.map((profile) => profile.id);
          if (ownerIds.length > 0) {
            let roomsQuery = supabaseClient
              .from('rooms')
              .select(
                'id, owner_id, price_per_month, flat:flats(rules, capacity_total)'
              )
              .in('owner_id', ownerIds)
              .eq('is_available', true);

            if (hasBudgetFilter) {
              roomsQuery = roomsQuery
                .gte('price_per_month', min)
                .lte('price_per_month', max);
            }
            if (hasRoommatesFilter) {
              roomsQuery = roomsQuery
                .gte('flat.capacity_total', roommatesMin)
                .lte('flat.capacity_total', roommatesMax);
            }

            const { data: roomsInRange, error: roomsError } = await roomsQuery;

            if (roomsError) {
              console.error(
                '[profiles-recommendations] rooms filter error:',
                roomsError
              );
            } else {
              const ownersWithRooms = new Set<string>();
              (roomsInRange ?? []).forEach((room) => {
                if (!hasRuleFilters) {
                  ownersWithRooms.add(room.owner_id);
                  return;
                }
                const flatRules = parseFlatRules(room.flat?.rules ?? null);
                if (matchesRulePreferences(rulePreferences, flatRules)) {
                  ownersWithRooms.add(room.owner_id);
                }
              });

              filteredProfiles = filteredProfiles.filter((profile) =>
                ownersWithRooms.has(profile.id)
              );
            }
          }
        }
      }

      const zoneIds = new Set<string>();
      preferredZones.forEach((zoneId) => {
        if (zoneId) zoneIds.add(zoneId);
      });
      filteredProfiles.forEach((profile) => {
        (profile.preferred_zones ?? []).forEach((zone) => zoneIds.add(zone));
      });
      const zoneLocationIndex = await buildZoneLocationIndex([...zoneIds]);
      const zoneProvinceIndex = await buildZoneProvinceIndex(
        [...zoneIds],
        zoneLocationIndex
      );

      // Filter out profiles from blocked provinces
      if (blockedProvinces.length > 0 && activeProvinceCodes.length > 0) {
        const profilesWithProvinces = await Promise.all(
          filteredProfiles.map(async (profile) => {
            const zones = profile.preferred_zones ?? [];
            if (zones.length === 0) return { profile, keep: true };

            const profileProvinces = [
              ...new Set(
                zones
                  .map((zoneId) => zoneProvinceIndex.get(zoneId))
                  .filter(Boolean)
              ),
            ];

            // Keep profile if it has at least one zone in an active province
            const hasActiveProvince = profileProvinces.some((prov) =>
              activeProvinceCodes.includes(prov)
            );

            return { profile, keep: hasActiveProvince };
          })
        );

        filteredProfiles = profilesWithProvinces
          .filter((item) => item.keep)
          .map((item) => item.profile);
      }

      for (const profile of filteredProfiles) {
        if (profile.avatar_url) {
          const signedUrl = await getSignedAvatarUrl(profile.avatar_url);
          if (signedUrl) {
            profile.avatar_url = signedUrl;
          }
        }

        const compatibilityScore = calculateProfileCompatibilityScore(
          seekerProfile,
          profile,
          filters,
          {
            seekerProvinces,
            targetProvinces: [
              ...new Set(
                (profile.preferred_zones ?? [])
                  .map((zoneId) => zoneProvinceIndex.get(zoneId))
                  .filter(Boolean)
              ),
            ],
            ownerFlatProvinces,
            flow: shouldUseOfferingFlow ? 'offering' : 'seeking',
          }
        );

        const locationDisplay = resolveLocationDisplay(
          preferredZones,
          profile.preferred_zones ?? [],
          zoneLocationIndex
        );

        const matchReasons = generateProfileMatchReasons(
          seekerProfile,
          profile,
          filters
        );

        recommendations.push({
          profile,
          compatibility_score: compatibilityScore,
          match_reasons: matchReasons,
          location_display_level: locationDisplay?.level ?? null,
          location_zone_id: locationDisplay?.zone_id ?? null,
          location_zone_name: locationDisplay?.zone_name ?? null,
          location_city_id: locationDisplay?.city_id ?? null,
          location_city_name: locationDisplay?.city_name ?? null,
          location_province_code: locationDisplay?.province_code ?? null,
          location_province_name: locationDisplay?.province_name ?? null,
        });
      }

      recommendations.sort(
        (a, b) => b.compatibility_score - a.compatibility_score
      );

      // Log premium vs free profile metrics
      const premiumCount = recommendations.filter(
        (rec) => rec.profile.is_premium === true
      ).length;
      const freeCount = recommendations.length - premiumCount;
      const topTenPremiumCount = recommendations
        .slice(0, Math.min(10, recommendations.length))
        .filter((rec) => rec.profile.is_premium === true).length;

      console.log(
        `[profiles-recommendations] Total recommendations for user ${userId}: ${recommendations.length} (Premium: ${premiumCount}, Free: ${freeCount})`
      );
      console.log(
        `[profiles-recommendations] Top 10 recommendations - Premium profiles: ${topTenPremiumCount}/10`
      );

      const response: RecommendationResponse = {
        recommendations,
        blocked_provinces: blockedProvinces.length > 0 ? blockedProvinces : undefined,
      };

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Profile recommendations function error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return new Response(
        JSON.stringify({
          error: 'Internal server error',
          details: errorMessage,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  }
);

Deno.serve(handler);
