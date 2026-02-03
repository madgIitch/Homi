-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.chats (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT chats_pkey PRIMARY KEY (id),
  CONSTRAINT chats_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id)
);
CREATE TABLE public.cities (
  id text NOT NULL,
  name text NOT NULL,
  ref_ine text,
  ine_municipio text,
  wikidata text,
  wikipedia text,
  centroid jsonb,
  bbox jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT cities_pkey PRIMARY KEY (id)
);
CREATE TABLE public.city_places (
  id text NOT NULL,
  city_id text NOT NULL,
  name text NOT NULL,
  place text NOT NULL,
  admin_level text,
  ref_ine text,
  wikidata text,
  wikipedia text,
  population text,
  population_date text,
  name_es text,
  name_eu text,
  centroid jsonb,
  bbox jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT city_places_pkey PRIMARY KEY (id),
  CONSTRAINT city_places_city_id_fkey FOREIGN KEY (city_id) REFERENCES public.cities(id)
);
CREATE TABLE public.city_search_counts (
  city_id text NOT NULL,
  count integer NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT city_search_counts_pkey PRIMARY KEY (city_id),
  CONSTRAINT city_search_counts_city_id_fkey FOREIGN KEY (city_id) REFERENCES public.cities(id)
);
CREATE TABLE public.expense_group_invites (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  group_id uuid,
  email text,
  token text NOT NULL UNIQUE,
  invited_by uuid,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'accepted'::text, 'expired'::text, 'declined'::text])),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  expires_at timestamp with time zone DEFAULT (timezone('utc'::text, now()) + '7 days'::interval),
  CONSTRAINT expense_group_invites_pkey PRIMARY KEY (id),
  CONSTRAINT expense_group_invites_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.expense_groups(id),
  CONSTRAINT expense_group_invites_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.profiles(id) ON DELETE SET NULL
);
CREATE TABLE public.expense_group_members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text DEFAULT 'member'::text CHECK (role = ANY (ARRAY['owner'::text, 'admin'::text, 'member'::text])),
  joined_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  invited_by uuid,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'accepted'::text, 'declined'::text])),
  CONSTRAINT expense_group_members_pkey PRIMARY KEY (id),
  CONSTRAINT expense_group_members_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.expense_groups(id) ON DELETE CASCADE,
  CONSTRAINT expense_group_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT expense_group_members_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT expense_group_members_group_id_user_id_key UNIQUE (group_id, user_id)
);
CREATE TABLE public.expense_groups (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT expense_groups_pkey PRIMARY KEY (id),
  CONSTRAINT expense_groups_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);
CREATE TABLE public.flat_expense_participants (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  expense_id uuid NOT NULL,
  member_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT flat_expense_participants_pkey PRIMARY KEY (id),
  CONSTRAINT flat_expense_participants_expense_id_fkey FOREIGN KEY (expense_id) REFERENCES public.flat_expenses(id),
  CONSTRAINT flat_expense_participants_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.flat_expenses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  flat_id uuid NOT NULL,
  created_by uuid NOT NULL,
  concept text NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0::numeric),
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  note text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT flat_expenses_pkey PRIMARY KEY (id),
  CONSTRAINT flat_expenses_flat_id_fkey FOREIGN KEY (flat_id) REFERENCES public.flats(id),
  CONSTRAINT flat_expenses_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.flat_settlement_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  flat_id uuid NOT NULL,
  month text NOT NULL,
  from_id uuid NOT NULL,
  to_id uuid NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0::numeric),
  marked_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT flat_settlement_payments_pkey PRIMARY KEY (id),
  CONSTRAINT flat_settlement_payments_flat_id_fkey FOREIGN KEY (flat_id) REFERENCES public.flats(id),
  CONSTRAINT flat_settlement_payments_from_id_fkey FOREIGN KEY (from_id) REFERENCES public.profiles(id),
  CONSTRAINT flat_settlement_payments_to_id_fkey FOREIGN KEY (to_id) REFERENCES public.profiles(id),
  CONSTRAINT flat_settlement_payments_marked_by_fkey FOREIGN KEY (marked_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.flats (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  address text NOT NULL,
  city text NOT NULL,
  district text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  rules text,
  services jsonb DEFAULT '[]'::jsonb,
  gender_policy text NOT NULL DEFAULT 'mixed'::text CHECK (gender_policy = ANY (ARRAY['mixed'::text, 'men_only'::text, 'flinta'::text])),
  city_id text,
  place_id text,
  capacity_total integer,
  CONSTRAINT flats_pkey PRIMARY KEY (id),
  CONSTRAINT flats_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id)
);
CREATE TABLE public.group_expense_participants (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  expense_id uuid,
  user_id uuid,
  share_amount numeric NOT NULL CHECK (share_amount >= 0::numeric),
  is_paid boolean DEFAULT false,
  CONSTRAINT group_expense_participants_pkey PRIMARY KEY (id),
  CONSTRAINT group_expense_participants_expense_id_fkey FOREIGN KEY (expense_id) REFERENCES public.group_expenses(id),
  CONSTRAINT group_expense_participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.group_expenses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  group_id uuid,
  concept text NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0::numeric),
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  note text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT group_expenses_pkey PRIMARY KEY (id),
  CONSTRAINT group_expenses_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.expense_groups(id),
  CONSTRAINT group_expenses_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.matches (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_a_id uuid NOT NULL,
  user_b_id uuid NOT NULL,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'accepted'::text, 'rejected'::text, 'room_offer'::text, 'room_assigned'::text, 'room_declined'::text])),
  matched_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT matches_pkey PRIMARY KEY (id),
  CONSTRAINT matches_user_a_id_fkey FOREIGN KEY (user_a_id) REFERENCES public.profiles(id),
  CONSTRAINT matches_user_b_id_fkey FOREIGN KEY (user_b_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.message_request_limits (
  user_id uuid NOT NULL,
  weekly_count integer NOT NULL DEFAULT 0,
  week_start date,
  used_trial boolean NOT NULL DEFAULT false,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT message_request_limits_pkey PRIMARY KEY (user_id),
  CONSTRAINT message_request_limits_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  body text NOT NULL CHECK (length(body) <= 1000),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  read_at timestamp with time zone,
  CONSTRAINT messages_pkey PRIMARY KEY (id),
  CONSTRAINT messages_chat_id_fkey FOREIGN KEY (chat_id) REFERENCES public.chats(id),
  CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.place_search_counts (
  city_id text NOT NULL,
  place_id text NOT NULL,
  count integer NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT place_search_counts_pkey PRIMARY KEY (city_id, place_id),
  CONSTRAINT place_search_counts_city_id_fkey FOREIGN KEY (city_id) REFERENCES public.cities(id),
  CONSTRAINT place_search_counts_place_id_fkey FOREIGN KEY (place_id) REFERENCES public.city_places(id)
);
CREATE TABLE public.profile_photos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL,
  path text NOT NULL,
  position integer NOT NULL CHECK ("position" >= 1 AND "position" <= 10),
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT profile_photos_pkey PRIMARY KEY (id),
  CONSTRAINT profile_photos_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  avatar_url text,
  bio text,
  gender text NOT NULL CHECK (gender = ANY (ARRAY['male'::text, 'female'::text, 'non_binary'::text, 'other'::text, 'undisclosed'::text])),
  occupation text,
  smoker boolean DEFAULT false,
  has_pets boolean DEFAULT false,
  social_links jsonb,
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  university text,
  field_of_study text,
  interests jsonb,
  lifestyle_preferences jsonb,
  housing_situation text,
  preferred_zones jsonb,
  budget_min numeric,
  budget_max numeric,
  is_searchable boolean NOT NULL DEFAULT true,
  is_seeking boolean DEFAULT false,
  desired_roommates_min integer,
  desired_roommates_max integer,
  is_premium boolean NOT NULL DEFAULT false,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES public.users(id)
);
CREATE TABLE public.province_user_counts (
  province_code text NOT NULL,
  count integer NOT NULL DEFAULT 0 CHECK (count >= 0),
  is_active boolean NOT NULL DEFAULT false,
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT province_user_counts_pkey PRIMARY KEY (province_code)
);
CREATE TABLE public.push_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token text NOT NULL,
  platform text NOT NULL CHECK (platform = ANY (ARRAY['ios'::text, 'android'::text])),
  device_id text,
  device_name text,
  app_version text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  last_used_at timestamp with time zone,
  provider text NOT NULL CHECK (provider = ANY (ARRAY['fcm'::text, 'apns'::text])),
  CONSTRAINT push_tokens_pkey PRIMARY KEY (id),
  CONSTRAINT push_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.room_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  match_id uuid UNIQUE,
  room_id uuid NOT NULL,
  assignee_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'offered'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT room_assignments_pkey PRIMARY KEY (id),
  CONSTRAINT room_assignments_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.rooms(id),
  CONSTRAINT room_assignments_assignee_id_fkey FOREIGN KEY (assignee_id) REFERENCES public.profiles(id),
  CONSTRAINT room_assignments_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id)
);
CREATE TABLE public.room_extras (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL,
  category text,
  room_type text,
  common_area_type text,
  common_area_custom text,
  photos ARRAY NOT NULL DEFAULT '{}'::text[],
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  capacity integer,
  CONSTRAINT room_extras_pkey PRIMARY KEY (id),
  CONSTRAINT room_extras_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.rooms(id)
);
CREATE TABLE public.room_interests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  room_id uuid NOT NULL,
  message text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT room_interests_pkey PRIMARY KEY (id),
  CONSTRAINT room_interests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT room_interests_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.rooms(id)
);
CREATE TABLE public.room_invitations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL,
  owner_id uuid NOT NULL,
  code text NOT NULL UNIQUE,
  expires_at timestamp with time zone,
  used_at timestamp with time zone,
  used_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT room_invitations_pkey PRIMARY KEY (id),
  CONSTRAINT room_invitations_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.rooms(id),
  CONSTRAINT room_invitations_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id),
  CONSTRAINT room_invitations_used_by_fkey FOREIGN KEY (used_by) REFERENCES public.users(id)
);
CREATE TABLE public.rooms (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  flat_id uuid NOT NULL,
  owner_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  price_per_month numeric NOT NULL,
  size_m2 numeric,
  is_available boolean DEFAULT true,
  available_from date DEFAULT CURRENT_DATE,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT rooms_pkey PRIMARY KEY (id),
  CONSTRAINT rooms_flat_id_fkey FOREIGN KEY (flat_id) REFERENCES public.flats(id),
  CONSTRAINT rooms_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id)
);
CREATE TABLE public.swipe_limits (
  user_id uuid NOT NULL,
  swipe_date date NOT NULL,
  count integer NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT swipe_limits_pkey PRIMARY KEY (user_id, swipe_date)
);
CREATE TABLE public.swipe_rejections (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  rejected_profile_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT swipe_rejections_pkey PRIMARY KEY (id),
  CONSTRAINT swipe_rejections_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT swipe_rejections_rejected_profile_id_fkey FOREIGN KEY (rejected_profile_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.temp_registrations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  temp_token text NOT NULL UNIQUE,
  email text NOT NULL,
  password text,
  is_google_user boolean DEFAULT false,
  first_name text,
  last_name text,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  gender text CHECK ((gender = ANY (ARRAY['male'::text, 'female'::text, 'non_binary'::text, 'other'::text, 'undisclosed'::text])) OR gender IS NULL),
  CONSTRAINT temp_registrations_pkey PRIMARY KEY (id)
);
CREATE TABLE public.user_province_tracking (
  user_id uuid NOT NULL,
  province_code text NOT NULL,
  source text NOT NULL CHECK (source = ANY (ARRAY['preferred_zones'::text, 'flat'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT user_province_tracking_pkey PRIMARY KEY (user_id, province_code, source),
  CONSTRAINT user_province_tracking_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.users (
  id uuid NOT NULL,
  email text NOT NULL UNIQUE,
  first_name text,
  last_name text,
  identity_document text UNIQUE,
  birth_date date,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  gender text NOT NULL CHECK (gender = ANY (ARRAY['male'::text, 'female'::text, 'non_binary'::text, 'other'::text, 'undisclosed'::text])),
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);