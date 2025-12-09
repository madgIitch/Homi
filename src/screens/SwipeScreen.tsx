import React from 'react';  
import { View, Text, StyleSheet } from 'react-native';  
import { colors, typography, spacing } from '../theme';
  
export const SwipeScreen: React.FC = () => {  
  return (  
    <View style={styles.container}>  
      <Text style={styles.title}>HomiMatch</Text>  
      <Text style={styles.subtitle}>Pantalla de Swipes - Próximamente</Text>  
    </View>  
  );  
};  
  
const styles = StyleSheet.create({  
  container: {  
    flex: 1,  
    backgroundColor: colors.background,  
    justifyContent: 'center',  
    alignItems: 'center',  
  },  
  title: {  
    ...typography.h1,  
    color: colors.primary,  
    marginBottom: spacing.md,  
  },  
  subtitle: {  
    ...typography.body,  
    color: colors.textSecondary,  
  },  
});