// supabase/functions/profiles/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { withAuth, getUserId } from '../_shared/auth.ts';
import type {
  Profile,
  ProfileCreateRequest,
  ApiResponse,
  JWTPayload,
} from '../_shared/types.ts';

/**
 * Edge Function para gestion de perfiles en HomiMatch.
 * Maneja CRUD operations para perfiles de usuario.
 */

const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

interface ProfileValidationData {
  id?: string;
  display_name?: string;
  avatar_url?: string;
  bio?: string;
  gender?: string;
  occupation?: string;
  smoker?: boolean;
  has_pets?: boolean;
  social_links?: Record<string, unknown>;

  university?: string;
  field_of_study?: string;
  interests?: string[];
  lifestyle_preferences?: {
    schedule?: string;
    cleaning?: string;
    guests?: string;
  };
  housing_situation?: 'seeking' | 'offering';
  preferred_zones?: string[];
  budget_min?: number;
  budget_max?: number;
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
    console.error('[profiles] Failed to parse avatar_url:', error);
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
    console.error('[profiles] Signed URL error:', error);
    return null;
  }

  return data.signedUrl;
}

async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabaseClient
    .from('profiles')
    .select('*, users!profiles_id_fkey(birth_date)')
    .eq('id', userId)
    .single();

  if (error || !data) {
    return null;
  }

  const { users, ...profileData } = data as Profile & {
    users?: { birth_date?: string | null };
  };
  const profile: Profile = {
    ...profileData,
    birth_date: users?.birth_date ?? null,
  };
  if (profile.avatar_url) {
    const signedUrl = await getSignedAvatarUrl(profile.avatar_url);
    if (signedUrl) {
      profile.avatar_url = signedUrl;
    }
  }

  return profile;
}

async function createProfile(profileData: ProfileCreateRequest): Promise<Profile> {
  const { data, error } = await supabaseClient
    .from('profiles')
    .insert(profileData)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create profile: ${error.message}`);
  }

  return data as Profile;
}

async function updateProfile(
  userId: string,
  updates: Partial<Profile>
): Promise<Profile> {
  const { data, error } = await supabaseClient
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update profile: ${error.message}`);
  }

  return data as Profile;
}

function validateProfileData(data: ProfileValidationData): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (data.display_name && typeof data.display_name !== 'string') {
    errors.push('Display name must be a string');
  }

  if (data.bio && typeof data.bio !== 'string') {
    errors.push('Bio must be a string');
  }

  if (
    data.gender &&
    !['male', 'female', 'non_binary', 'other', 'undisclosed'].includes(
      data.gender
    )
  ) {
    errors.push('Invalid gender value');
  }

  if (data.occupation && typeof data.occupation !== 'string') {
    errors.push('Occupation must be a string');
  }

  if (data.smoker !== undefined && typeof data.smoker !== 'boolean') {
    errors.push('Smoker must be a boolean');
  }

  if (data.has_pets !== undefined && typeof data.has_pets !== 'boolean') {
    errors.push('Has pets must be a boolean');
  }

  if (data.social_links && typeof data.social_links !== 'object') {
    errors.push('Social links must be a JSON object');
  }

  if (data.university && typeof data.university !== 'string') {
    errors.push('University must be a string');
  }

  if (data.field_of_study && typeof data.field_of_study !== 'string') {
    errors.push('Field of study must be a string');
  }

  if (data.interests && !Array.isArray(data.interests)) {
    errors.push('Interests must be an array');
  } else if (
    data.interests &&
    !data.interests.every((item) => typeof item === 'string')
  ) {
    errors.push('All interests must be strings');
  }

  if (data.lifestyle_preferences && typeof data.lifestyle_preferences !== 'object') {
    errors.push('Lifestyle preferences must be an object');
  }

  if (
    data.housing_situation &&
    !['seeking', 'offering'].includes(data.housing_situation)
  ) {
    errors.push('Housing situation must be "seeking" or "offering"');
  }

  if (data.preferred_zones && !Array.isArray(data.preferred_zones)) {
    errors.push('Preferred zones must be an array');
  }

  if (data.budget_min !== undefined && typeof data.budget_min !== 'number') {
    errors.push('Budget min must be a number');
  }
  if (data.budget_max !== undefined && typeof data.budget_max !== 'number') {
    errors.push('Budget max must be a number');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

const handler = withAuth(
  async (req: Request, payload: JWTPayload): Promise<Response> => {
    const userId = getUserId(payload);
    const method = req.method;

    try {
      if (method === 'GET') {
        const profile = await getProfile(userId);

        if (!profile) {
          return new Response(JSON.stringify({ error: 'Profile not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const response: ApiResponse<Profile> = { data: profile };
        return new Response(JSON.stringify(response), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (method === 'POST') {
        const existingProfile = await getProfile(userId);
        if (existingProfile) {
          return new Response(
            JSON.stringify({ error: 'Profile already exists' }),
            {
              status: 409,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        const body: ProfileCreateRequest = await req.json();
        body.id = userId;

        const validation = validateProfileData(body);
        if (!validation.isValid) {
          return new Response(
            JSON.stringify({
              error: 'Validation failed',
              details: validation.errors,
            }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        const profile = await createProfile(body);
        const response: ApiResponse<Profile> = { data: profile };

        return new Response(JSON.stringify(response), {
          status: 201,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (method === 'PATCH') {
        const existingProfile = await getProfile(userId);
        if (!existingProfile) {
          return new Response(JSON.stringify({ error: 'Profile not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const updates = await req.json();
        delete updates.id;
        delete updates.updated_at;

        const validation = validateProfileData({
          ...existingProfile,
          ...updates,
        });
        if (!validation.isValid) {
          return new Response(
            JSON.stringify({
              error: 'Validation failed',
              details: validation.errors,
            }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        const updatedProfile = await updateProfile(userId, updates);
        if (
          updatedProfile.gender &&
          updatedProfile.gender !== existingProfile.gender
        ) {
          const { error: authUpdateError } =
            await supabaseClient.auth.admin.updateUserById(userId, {
              user_metadata: { gender: updatedProfile.gender },
            });
          if (authUpdateError) {
            console.error(
              '[profiles] Failed to sync gender to auth metadata:',
              authUpdateError
            );
          }
        }
        const response: ApiResponse<Profile> = { data: updatedProfile };

        return new Response(JSON.stringify(response), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Profile function error:', error);
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
