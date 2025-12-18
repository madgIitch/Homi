// src/navigation/MainNavigator.tsx    
import React, { useCallback } from 'react';    
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';    
import { StyleSheet } from 'react-native';    
import { useTheme } from '../theme/ThemeContext';    
import { HomeScreen } from '../screens/HomeScreen';    
import { ProfileDetailScreen } from '../screens/ProfileDetailScreen';    
import { MatchesScreen } from '../screens/MatchesScreen';    
import { TabBarIcon } from '../components/TabBarIcon';    
    
const Tab = createBottomTabNavigator();    
    
const getIconName = (routeName: string): string => {    
  switch (routeName) {    
    case 'Home':    
      return 'home';    
    case 'Profile':    
      return 'person';    
    case 'Matches':    
      return 'chatbubbles';    
    default:    
      return 'help';    
  }    
};    
    
// Extracted component to avoid nested component definition    
const TabBarIconWrapper = ({ route, focused, color, size }: {    
  route: any;    
  focused: boolean;    
  color: string;    
  size: number;    
}) => (    
  <TabBarIcon     
    name={getIconName(route.name)}    
    focused={focused}    
    color={color}    
    size={size}    
  />    
);    
    
export const MainNavigator: React.FC = () => {    
  const theme = useTheme();    
    
  const screenOptions = useCallback(({ route }: { route: any }) => ({    
    tabBarIcon: ({ focused, color, size }: { focused: boolean; color: string; size: number }) => (    
      <TabBarIconWrapper     
        route={route}    
        focused={focused}    
        color={color}    
        size={size}    
      />    
    ),    
    tabBarActiveTintColor: theme.colors.primary,    
    tabBarInactiveTintColor: theme.colors.textSecondary,    
    tabBarStyle: [    
      styles.tabBar,    
      { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }    
    ],    
    headerShown: false,    
  }), [theme]);    
    
  return (    
    <Tab.Navigator screenOptions={screenOptions}>    
      <Tab.Screen     
        name="Home"     
        component={HomeScreen}    
        options={{ title: 'Explorar' }}    
      />    
      <Tab.Screen     
        name="Profile"     
        component={ProfileDetailScreen}    
        options={{ title: 'Perfil' }}    
      />    
      <Tab.Screen     
        name="Matches"     
        component={MatchesScreen}    
        options={{ title: 'Matches' }}    
      />    
    </Tab.Navigator>    
  );    
};    
    
const styles = StyleSheet.create({    
  tabBar: {    
    borderTopWidth: 1,    
    paddingBottom: 8,    
    paddingTop: 8,    
    height: 60,    
  },    
});