// src/navigation/MainNavigator.tsx    
import React, { useCallback, useMemo } from 'react';    
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';    
import { StyleSheet, View, type ViewStyle, useWindowDimensions } from 'react-native';    
import { useTheme, useThemeController } from '../theme/ThemeContext';    
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SwipeScreen } from '../screens/SwipeScreen';
import { ProfileDetailScreen } from '../screens/ProfileDetailScreen';    
import { MatchesScreen } from '../screens/MatchesScreen';    
import { TabBarIcon } from '../components/TabBarIcon';    
import { FlatExpensesScreen } from '../screens/FlatExpensesScreen';    
import { BlurView } from '@react-native-community/blur';    
import LinearGradient from 'react-native-linear-gradient';
    
const Tab = createBottomTabNavigator();    
const TAB_BAR_RADIUS = 24;
const TAB_BAR_HEIGHT_PCT = 0.07;
    
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
  const { isDark } = useThemeController();
  const insets = useSafeAreaInsets();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const screenHeight = windowHeight + insets.top + insets.bottom;
  const tabBarHeight = Math.max(
    0,
    Math.round(screenHeight * TAB_BAR_HEIGHT_PCT)
  );
  const tabBarLayoutStyle = useMemo(
    () => ({
      bottom: Math.max(0, insets.bottom),
      height: tabBarHeight,
    }),
    [insets.bottom, tabBarHeight]
  );
  const tabBarInsetStyle = useMemo(() => {
    const inset = Math.max(TAB_BAR_RADIUS, Math.round(windowWidth * 0.04));
    return { left: inset, right: inset };
  }, [windowWidth]);
  const tabBarIconSize = useMemo(
    () => Math.round(Math.min(26, Math.max(18, tabBarHeight * 0.42))),
    [tabBarHeight]
  );
  const tabBarIconStyle = useMemo<ViewStyle>(() => {
    const marginTop = Math.max(2, Math.round(tabBarHeight * 0.14));
    const marginBottom = Math.max(-2, -Math.round(tabBarHeight * 0.02));
    return { marginTop, marginBottom };
  }, [tabBarHeight]);
  const tabBarItemStyle = useMemo<ViewStyle>(
    () => ({
      justifyContent: 'center',
      alignItems: 'center',
      height: '100%',
      paddingVertical: Math.max(0, Math.round(tabBarHeight * 0.06)),
    }),
    [tabBarHeight]
  );
  const tabBarBorderStyle = useMemo(
    () => ({ borderTopColor: theme.colors.glassBorderSoft }),
    [theme.colors.glassBorderSoft]
  );
  const glassFillStyle = useMemo(
    () => ({
      backgroundColor: isDark ? theme.colors.glassSubtle : theme.colors.glassMid,
    }),
    [isDark, theme.colors.glassMid, theme.colors.glassSubtle]
  );
  const sceneContainerStyle = useMemo(
    () => ({ paddingBottom: insets.bottom }),
    [insets.bottom]
  );

  const glassBackground = useCallback(
    () => (
      <View style={styles.glassWrap}>
        {isDark ? (
          <LinearGradient
            colors={['rgba(26, 31, 38, 0.72)', 'rgba(16, 21, 27, 0.72)']}
            style={StyleSheet.absoluteFillObject}
          />
        ) : null}
        <BlurView
          blurType="light"
          blurAmount={16}
          reducedTransparencyFallbackColor={theme.colors.glassOverlay}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={[styles.glassFill, glassFillStyle]} />
      </View>
    ),
    [glassFillStyle, isDark, theme]
  );
    
  const screenOptions = useCallback(({ route }: { route: any }) => ({    
    tabBarIcon: ({ focused, color, size: _size }: { focused: boolean; color: string; size: number }) => (    
      <TabBarIconWrapper     
        route={route}    
        focused={focused}    
        color={color}    
        size={tabBarIconSize}    
      />    
    ),    
    tabBarActiveTintColor: theme.colors.primary,    
    tabBarInactiveTintColor: theme.colors.textSecondary,    
    sceneContainerStyle,
    tabBarShowLabel: false,
    tabBarIconStyle,
    tabBarItemStyle,
    tabBarStyle: [
      styles.tabBar,
      tabBarLayoutStyle,
      tabBarInsetStyle,
      tabBarBorderStyle,
    ],
    tabBarBackground: glassBackground,
    headerShown: false,    
  }), [
    glassBackground,
    sceneContainerStyle,
    tabBarBorderStyle,
    tabBarIconSize,
    tabBarIconStyle,
    tabBarItemStyle,
    tabBarInsetStyle,
    tabBarLayoutStyle,
    theme,
  ]);    
    
  return (    
    <Tab.Navigator screenOptions={screenOptions}>    
      <Tab.Screen     
        name="Home"     
        component={SwipeScreen}
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
    paddingBottom: 0,    
    paddingTop: 0,    
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    position: 'absolute',
    borderRadius: TAB_BAR_RADIUS,
    overflow: 'hidden',
  },    
  glassWrap: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: TAB_BAR_RADIUS,
    overflow: 'hidden',
  },
  glassFill: {
    ...StyleSheet.absoluteFillObject,
  },
});    

