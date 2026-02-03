import Config from 'react-native-config';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

const getGoogleWebClientId = () => {
  const webClientId = Config.GOOGLE_WEB_CLIENT_ID;
  if (!webClientId) {
    throw new Error('[config] Missing required env var: GOOGLE_WEB_CLIENT_ID');
  }
  return webClientId;
};

export const configureGoogleSignIn = () => {
  GoogleSignin.configure({
    webClientId: getGoogleWebClientId(),
    offlineAccess: true,
  });
};
