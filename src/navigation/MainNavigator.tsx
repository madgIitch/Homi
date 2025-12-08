// src/navigation/MainNavigator.tsx (actualizado)  
import React from 'react';  
import { createStackNavigator } from '@react-navigation/stack';  
import { SwipeScreen } from '../screens/SwipeScreen';  
import { EditProfileScreen } from '../screens/EditProfileScreen';  
  
const Stack = createStackNavigator();  
  
export const MainNavigator: React.FC = () => {  
  return (  
    <Stack.Navigator screenOptions={{ headerShown: false }}>  
      <Stack.Screen name="Swipes" component={SwipeScreen} />  
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />  
    </Stack.Navigator>  
  );  
};