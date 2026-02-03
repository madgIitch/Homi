declare module 'react-native-config' {
  export interface NativeConfig {
    SUPABASE_URL: string;
    SUPABASE_ANON_KEY: string;
    SUPABASE_FUNCTIONS_URL?: string;
    PASSWORD_RESET_REDIRECT_URL?: string;
    GOOGLE_WEB_CLIENT_ID: string;
  }

  const Config: NativeConfig;
  export default Config;
}
