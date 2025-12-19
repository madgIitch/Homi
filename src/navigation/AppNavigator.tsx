// src/navigation/AppNavigator.tsx    
import React, { useContext } from 'react';    
import { View, Text, StyleSheet } from 'react-native';    
import { NavigationContainer } from '@react-navigation/native';    
import { createStackNavigator } from '@react-navigation/stack';    
import { AuthContext } from '../context/AuthContext';    
import { LoginScreen } from '../screens/LoginScreen';    
import { RegisterScreen } from '../screens/RegisterScreen';    
import { MainNavigator } from './MainNavigator';    
import { ProfileDetailScreen } from '../screens/ProfileDetailScreen';    
import { EditProfileScreen } from '../screens/EditProfileScreen';    
import { FiltersScreen } from '../screens/FiltersScreen';
import { ChatScreen } from '../screens/ChatScreen';
import { RoomManagementScreen } from '../screens/RoomManagementScreen';
import { RoomEditScreen } from '../screens/RoomEditScreen';
import { RoomInterestsScreen } from '../screens/RoomInterestsScreen';
import { RulesManagementScreen } from '../screens/RulesManagementScreen';
import { ServicesManagementScreen } from '../screens/ServicesManagementScreen';
import { CreateFlatScreen } from '../screens/CreateFlatScreen';
import { RoomDetailScreen } from '../screens/RoomDetailScreen';
import { useTheme } from '../theme/ThemeContext';    
    
const Stack = createStackNavigator();    
    
// Simple loading screen component    
const LoadingScreen: React.FC = () => {    
  const theme = useTheme();    
  return (    
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>    
      <Text style={[styles.loadingText, { color: theme.colors.text }]}>    
        HomiMatch    
      </Text>    
    </View>    
  );    
};    
    
export const AppNavigator: React.FC = () => {    
  const authContext = useContext(AuthContext);    
      
  // Ensure context exists    
  if (!authContext) {    
    throw new Error('AppNavigator must be used within AuthProvider');    
  }    
      
  const { isAuthenticated, loading } = authContext;    
    
  if (loading) {    
    return <LoadingScreen />;    
  }    
    
  return (    
    <NavigationContainer>    
      <Stack.Navigator screenOptions={{ headerShown: false }}>    
        {isAuthenticated ? (    
          <>    
            <Stack.Screen name="Main" component={MainNavigator} />    
            <Stack.Screen name="ProfileDetail" component={ProfileDetailScreen} />    
            <Stack.Screen name="EditProfile" component={EditProfileScreen} />    
            <Stack.Screen name="Filters" component={FiltersScreen} />
            <Stack.Screen name="Chat" component={ChatScreen} />
            <Stack.Screen name="RoomManagement" component={RoomManagementScreen} />
            <Stack.Screen name="RoomEdit" component={RoomEditScreen} />
            <Stack.Screen name="RoomInterests" component={RoomInterestsScreen} />
            <Stack.Screen name="RulesManagement" component={RulesManagementScreen} />
            <Stack.Screen name="ServicesManagement" component={ServicesManagementScreen} />
            <Stack.Screen name="CreateFlat" component={CreateFlatScreen} />
            <Stack.Screen name="RoomDetail" component={RoomDetailScreen} />
          </>    
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
    
const styles = StyleSheet.create({    
  container: {    
    flex: 1,    
    justifyContent: 'center',    
    alignItems: 'center',    
  },    
  loadingText: {    
    fontSize: 24,    
    fontWeight: 'bold',    
  },    
});
