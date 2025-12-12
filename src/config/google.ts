// src/config/google.ts  
import { GoogleSignin } from '@react-native-google-signin/google-signin';  
  
export const configureGoogleSignIn = () => {  
  GoogleSignin.configure({  
    webClientId: '786671462069-dl3od58kbd9rb6hn33b0o43uomu1i87e.apps.googleusercontent.com',  
    offlineAccess: true,  
  });  
};