// src/navigation/MainNavigator.tsx    
import React, { useCallback } from 'react';    
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';    
import { StyleSheet, View } from 'react-native';    
import { useTheme } from '../theme/ThemeContext';    
import { HomeScreen } from '../screens/HomeScreen';    
import { ProfileDetailScreen } from '../screens/ProfileDetailScreen';    
import { MatchesScreen } from '../screens/MatchesScreen';    
import { TabBarIcon } from '../components/TabBarIcon';    
import { FlatExpensesScreen } from '../screens/FlatExpensesScreen';    
import { BlurView } from '@react-native-community/blur';    
    
const Tab = createBottomTabNavigator();    
    
const getIconName = (routeName: string): string => {    
  switch (routeName) {    
    case 'Home':    
      return 'home';    
    case 'Expenses':    
      return 'receipt-outline';    
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
  const glassBackground = useCallback(
    () => (
      <View style={styles.glassWrap}>
        <BlurView
          blurType="light"
          blurAmount={16}
          reducedTransparencyFallbackColor={theme.colors.glassOverlay}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={[styles.glassFill, { backgroundColor: theme.colors.glassMid }]} />
      </View>
    ),
    [theme]
  );
    
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
      { borderTopColor: theme.colors.glassBorderSoft },
    ],
    tabBarBackground: glassBackground,
    headerShown: false,    
  }), [glassBackground, theme]);    
    
  return (    
    <Tab.Navigator screenOptions={screenOptions}>    
      <Tab.Screen     
        name="Home"     
        component={HomeScreen}    
        options={{ title: 'Explorar' }}    
      />    
      <Tab.Screen     
        name="Matches"     
        component={MatchesScreen}    
        options={{ title: 'Matches' }}    
      />    
      <Tab.Screen     
        name="Profile"     
        component={ProfileDetailScreen}    
        options={{ title: 'Perfil' }}    
      />    
      <Tab.Screen
        name="Expenses"
        component={FlatExpensesScreen}
        options={{ title: 'Gastos' }}
      />
    </Tab.Navigator>    
  );    
};    
    
const styles = StyleSheet.create({    
  tabBar: {    
    borderTopWidth: 1,    
    paddingBottom: 8,    
    paddingTop: 8,    
    height: 68,
    backgroundColor: 'transparent',
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 12,
    borderRadius: 24,
    overflow: 'hidden',
  },    
  glassWrap: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
    overflow: 'hidden',
  },
  glassFill: {
    ...StyleSheet.absoluteFillObject,
  },
});    
