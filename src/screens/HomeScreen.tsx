// src/screens/HomeScreen.tsx  
import React from 'react';  
import { View, Text, StyleSheet } from 'react-native';  
import { useTheme } from '../theme/ThemeContext';  
  
export const HomeScreen: React.FC = () => {  
  const theme = useTheme();  
    
  return (  
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>  
      <Text style={[styles.title, { color: theme.colors.text }]}>  
        Explorar  
      </Text>  
      <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>  
        Próximamente: Cards de swipes  
      </Text>  
    </View>  
  );  
};  
  
const styles = StyleSheet.create({  
  container: {  
    flex: 1,  
    justifyContent: 'center',  
    alignItems: 'center',  
  },  
  title: {  
    fontSize: 24,  
    fontWeight: 'bold',  
    marginBottom: 8,  
  },  
  subtitle: {  
    fontSize: 16,  
  },  
});