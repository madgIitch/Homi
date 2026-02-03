import Config from 'react-native-config';

const requireEnv = (key: keyof typeof Config) => {
  const value = Config[key];
  if (!value) {
    throw new Error(`[config] Missing required env var: ${key}`);
  }
  return value;
};

const SUPABASE_URL = requireEnv('SUPABASE_URL');
const SUPABASE_ANON_KEY = requireEnv('SUPABASE_ANON_KEY');
const STRIPE_PUBLISHABLE_KEY = requireEnv('STRIPE_PUBLISHABLE_KEY');
const STRIPE_PRICE_ID_MONTHLY = requireEnv('STRIPE_PRICE_ID_MONTHLY');
const STRIPE_PRICE_ID_YEARLY = requireEnv('STRIPE_PRICE_ID_YEARLY');
const FUNCTIONS_URL =
  Config.SUPABASE_FUNCTIONS_URL ?? `${SUPABASE_URL}/functions/v1`;
const PASSWORD_RESET_REDIRECT_URL =
  Config.PASSWORD_RESET_REDIRECT_URL ?? 'homimatch://reset-password';

export const API_CONFIG = {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  STRIPE_PUBLISHABLE_KEY,
  STRIPE_PRICE_ID_MONTHLY,
  STRIPE_PRICE_ID_YEARLY,
  FUNCTIONS_URL,
  PASSWORD_RESET_REDIRECT_URL,
};
