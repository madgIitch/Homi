// navigation/AppNavigator.tsx  
import React from 'react';  
import { NavigationContainer } from '@react-navigation/native';  
import { createStackNavigator } from '@react-navigation/stack';  
import { LoginScreen } from '../screens/LoginScreen';  
import { RegisterScreen } from '../screens/RegisterScreen';  
import { MainNavigator } from './MainNavigator';  
  
const Stack = createStackNavigator();  
  
export const AppNavigator: React.FC = () => {  
  const isAuthenticated = false; // Verificar estado de autenticación  
  
  return (  
    <NavigationContainer>  
      <Stack.Navigator screenOptions={{ headerShown: false }}>  
        {isAuthenticated ? (  
          <Stack.Screen name="Main" component={MainNavigator} />  
        ) : (  
          <>  
            <Stack.Screen name="Login" component={LoginScreen} />  
            <Stack.Screen name="Register" component={RegisterScreen} />  
          </>  
        )}  
      </Stack.Navigator>  
    </NavigationContainer>  
  );  
};