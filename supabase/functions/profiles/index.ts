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
  first_name?: string;
  last_name?: string;
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
  is_seeking?: boolean;
  preferred_zones?: string[];
  budget_min?: number;
  budget_max?: number;
  desired_roommates_min?: number;
  desired_roommates_max?: number;
  is_searchable?: boolean;
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
    .select('*, users!profiles_id_fkey(birth_date, first_name, last_name)')
    .eq('id', userId)
    .single();

  if (error || !data) {
    return null;
  }

  const { users, ...profileData } = data as Profile & {
    users?: {
      birth_date?: string | null;
      first_name?: string | null;
      last_name?: string | null;
    };
  };
  const profile: Profile = {
    ...profileData,
    birth_date: users?.birth_date ?? null,
    first_name: users?.first_name ?? profileData.first_name ?? null,
    last_name: users?.last_name ?? profileData.last_name ?? null,
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

  if (data.first_name && typeof data.first_name !== 'string') {
    errors.push('First name must be a string');
  }

  if (data.last_name && typeof data.last_name !== 'string') {
    errors.push('Last name must be a string');
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

  if (data.is_seeking !== undefined && typeof data.is_seeking !== 'boolean') {
    errors.push('is_seeking must be a boolean');
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
  if (
    data.desired_roommates_min != null &&
    typeof data.desired_roommates_min !== 'number'
  ) {
    errors.push('desired_roommates_min must be a number');
  }
  if (
    data.desired_roommates_max != null &&
    typeof data.desired_roommates_max !== 'number'
  ) {
    errors.push('desired_roommates_max must be a number');
  }
  if (data.is_searchable !== undefined && typeof data.is_searchable !== 'boolean') {
    errors.push('is_searchable must be a boolean');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

async function updateUserNames(
  userId: string,
  firstName?: string | null,
  lastName?: string | null
) {
  if (!firstName && !lastName) return;
  const updates: Record<string, string | null> = {};
  if (firstName !== undefined) updates.first_name = firstName?.trim() || null;
  if (lastName !== undefined) updates.last_name = lastName?.trim() || null;

  const { error } = await supabaseClient
    .from('users')
    .update(updates)
    .eq('id', userId);

  if (error) {
    throw new Error(`Failed to update user names: ${error.message}`);
  }

  await supabaseClient.auth.admin.updateUserById(userId, {
    user_metadata: {
      ...(firstName !== undefined ? { first_name: updates.first_name } : {}),
      ...(lastName !== undefined ? { last_name: updates.last_name } : {}),
    },
  });
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

        const body: ProfileCreateRequest & {
          first_name?: string;
          last_name?: string;
        } = await req.json();
        const firstName =
          typeof body.first_name === 'string' ? body.first_name : undefined;
        const lastName =
          typeof body.last_name === 'string' ? body.last_name : undefined;
        const { first_name, last_name, ...profileData } = body;
        profileData.id = userId;

        const validation = validateProfileData({
          ...profileData,
          ...(firstName !== undefined ? { first_name: firstName } : {}),
          ...(lastName !== undefined ? { last_name: lastName } : {}),
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

        const profile = await createProfile(profileData);
        if (firstName !== undefined || lastName !== undefined) {
          await updateUserNames(userId, firstName, lastName);
        }
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
        const firstName =
          typeof updates.first_name === 'string' ? updates.first_name : undefined;
        const lastName =
          typeof updates.last_name === 'string' ? updates.last_name : undefined;
        delete updates.first_name;
        delete updates.last_name;

        const validation = validateProfileData({
          ...existingProfile,
          ...updates,
          ...(firstName !== undefined ? { first_name: firstName } : {}),
          ...(lastName !== undefined ? { last_name: lastName } : {}),
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
        if (firstName !== undefined || lastName !== undefined) {
          await updateUserNames(userId, firstName, lastName);
        }
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

      if (method === 'DELETE') {
        const { data: flatRows, error: flatError } = await supabaseClient
          .from('flats')
          .select('id')
          .eq('owner_id', userId);
        if (flatError) {
          return new Response(JSON.stringify({ error: 'Failed to load flats' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const flatIds = (flatRows ?? []).map((row) => row.id);
        const { data: ownedRooms, error: roomsError } = await supabaseClient
          .from('rooms')
          .select('id')
          .eq('owner_id', userId);
        if (roomsError) {
          return new Response(JSON.stringify({ error: 'Failed to load rooms' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const roomIds = new Set<string>((ownedRooms ?? []).map((row) => row.id));
        if (flatIds.length > 0) {
          const { data: flatRooms } = await supabaseClient
            .from('rooms')
            .select('id')
            .in('flat_id', flatIds);
          (flatRooms ?? []).forEach((row) => {
            if (row?.id) {
              roomIds.add(row.id);
            }
          });
        }

        const roomIdList = Array.from(roomIds);
        if (roomIdList.length > 0) {
          await supabaseClient.from('room_extras').delete().in('room_id', roomIdList);
          await supabaseClient
            .from('room_invitations')
            .delete()
            .in('room_id', roomIdList);
          await supabaseClient
            .from('room_interests')
            .delete()
            .in('room_id', roomIdList);
          await supabaseClient
            .from('room_assignments')
            .delete()
            .in('room_id', roomIdList);
        }

        await supabaseClient
          .from('room_invitations')
          .delete()
          .or(`owner_id.eq.${userId},used_by.eq.${userId}`);
        await supabaseClient
          .from('room_interests')
          .delete()
          .eq('user_id', userId);
        await supabaseClient
          .from('room_assignments')
          .delete()
          .eq('assignee_id', userId);

        if (roomIdList.length > 0) {
          await supabaseClient.from('rooms').delete().in('id', roomIdList);
        }

        if (flatIds.length > 0) {
          const { data: expenseRows } = await supabaseClient
            .from('flat_expenses')
            .select('id')
            .in('flat_id', flatIds);
          const expenseIds = (expenseRows ?? []).map((row) => row.id);
          if (expenseIds.length > 0) {
            await supabaseClient
              .from('flat_expense_participants')
              .delete()
              .in('expense_id', expenseIds);
            await supabaseClient.from('flat_expenses').delete().in('id', expenseIds);
          }
          await supabaseClient
            .from('flat_settlement_payments')
            .delete()
            .in('flat_id', flatIds);
          await supabaseClient.from('flats').delete().in('id', flatIds);
        }

        await supabaseClient
          .from('flat_expense_participants')
          .delete()
          .eq('member_id', userId);
        await supabaseClient
          .from('flat_expenses')
          .delete()
          .eq('created_by', userId);
        await supabaseClient
          .from('flat_settlement_payments')
          .delete()
          .or(`from_id.eq.${userId},to_id.eq.${userId},marked_by.eq.${userId}`);

        const { data: matchRows } = await supabaseClient
          .from('matches')
          .select('id')
          .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`);
        const matchIds = (matchRows ?? []).map((row) => row.id);
        if (matchIds.length > 0) {
          await supabaseClient
            .from('room_assignments')
            .delete()
            .in('match_id', matchIds);
          const { data: chatRows } = await supabaseClient
            .from('chats')
            .select('id')
            .in('match_id', matchIds);
          const chatIds = (chatRows ?? []).map((row) => row.id);
          if (chatIds.length > 0) {
            await supabaseClient
              .from('messages')
              .delete()
              .in('chat_id', chatIds);
            await supabaseClient.from('chats').delete().in('id', chatIds);
          }
          await supabaseClient.from('matches').delete().in('id', matchIds);
        }

        await supabaseClient
          .from('swipe_rejections')
          .delete()
          .or(`user_id.eq.${userId},rejected_profile_id.eq.${userId}`);
        await supabaseClient.from('profile_photos').delete().eq('profile_id', userId);
        await supabaseClient.from('push_tokens').delete().eq('user_id', userId);

        await supabaseClient.from('profiles').delete().eq('id', userId);
        await supabaseClient.from('users').delete().eq('id', userId);
        await supabaseClient.auth.admin.deleteUser(userId);

        return new Response(JSON.stringify({ success: true }), {
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
